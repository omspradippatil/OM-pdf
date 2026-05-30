import React, { useMemo, useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { PDFDocument } from 'pdf-lib';
import '../styles/InsertBlankPages.css';

const A4_SIZE = [595.28, 841.89];
const LETTER_SIZE = [612, 792];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function InsertBlankPages() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [pageThumbs, setPageThumbs] = useState([]);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');

  const [position, setPosition] = useState('after');
  const [pageNumber, setPageNumber] = useState(1);
  const [count, setCount] = useState(1);
  const [sizeMode, setSizeMode] = useState('match');
  const [insertions, setInsertions] = useState([]);

  const fileInputRef = useRef(null);

  const totalInsertCount = useMemo(
    () => insertions.reduce((acc, item) => acc + item.count, 0),
    [insertions]
  );

  const blankCounts = useMemo(() => {
    const counts = new Map();
    insertions.forEach((item) => {
      const key = `${item.pageNumber}-${item.position}`;
      counts.set(key, (counts.get(key) || 0) + item.count);
    });
    return counts;
  }, [insertions]);

  const previewItems = useMemo(() => {
    if (!pages) return [];
    const items = [];

    const addBlanks = (count, page, position) => {
      for (let i = 0; i < count; i++) {
        items.push({
          id: `blank-${page}-${position}-${i}`,
          type: 'blank',
          page,
        });
      }
    };

    for (let page = 1; page <= pages; page++) {
      addBlanks(blankCounts.get(`${page}-before`) || 0, page, 'before');
      items.push({
        id: `page-${page}`,
        type: 'page',
        page,
        thumb: pageThumbs[page - 1],
      });
      addBlanks(blankCounts.get(`${page}-after`) || 0, page, 'after');
    }

    return items;
  }, [pages, blankCounts, pageThumbs]);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setLastBytes(null);
    setLastName('');
    setInsertions([]);
    setPageThumbs([]);

    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const total = doc.getPageCount();
      setPages(total);
      setPageNumber(total ? 1 : 0);

      const thumbs = await generatePageThumbnails(f, () => {});
      if (thumbs) setPageThumbs(thumbs);
      else setError('Preview unavailable for this PDF. You can still insert blank pages.');
    } catch {
      setPages(null);
    }
  };

  const addInsertion = () => {
    if (!pages) return;
    const safePage = clamp(pageNumber || 1, 1, pages);
    const safeCount = clamp(count || 1, 1, 30);
    setInsertions((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        position,
        pageNumber: safePage,
        count: safeCount,
        sizeMode,
      },
    ]);
  };

  const removeInsertion = (id) => {
    setInsertions((prev) => prev.filter((item) => item.id !== id));
  };

  const resolveInsertSize = (doc, item, baseCount) => {
    if (item.sizeMode === 'a4') return A4_SIZE;
    if (item.sizeMode === 'letter') return LETTER_SIZE;
    const targetIndex = clamp(item.pageNumber - 1, 0, Math.max(baseCount - 1, 0));
    const refPage = doc.getPage(targetIndex);
    const { width, height } = refPage.getSize();
    return [width, height];
  };

  const handleInsert = async () => {
    if (!file || !pages || !insertions.length) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const baseCount = doc.getPageCount();
      const sorted = [...insertions].sort((a, b) => {
        if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
        return a.position === 'before' ? -1 : 1;
      });

      let offset = 0;
      sorted.forEach((item, index) => {
        const baseIndex = item.position === 'after'
          ? clamp(item.pageNumber, 0, baseCount)
          : clamp(item.pageNumber - 1, 0, baseCount);
        const insertAt = baseIndex + offset;
        const size = resolveInsertSize(doc, item, baseCount);
        for (let i = 0; i < item.count; i++) {
          doc.insertPage(insertAt + i, size);
        }
        offset += item.count;
        setProgress(Math.round(((index + 1) / sorted.length) * 80));
      });

      const bytes = await doc.save();
      const baseName = file.name.replace(/\.pdf$/i, '');
      const name = `${baseName}_with_blanks.pdf`;
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      setLastBytes(bytes);
      setLastName(name);
      setSuccess(`Inserted ${totalInsertCount} blank page${totalInsertCount === 1 ? '' : 's'}.`);
      setProgress(100);

      addRecentFile({ tool: 'insert_blank', name, size: bytes.byteLength || 0, pages: doc.getPageCount() });
      bumpLocalJob();
      await logUserAction(user, 'insert_blank', { tool: 'insert_blank', status: 'success', meta: { inserted: totalInsertCount } });
    } catch (err) {
      setError('Insert failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'insert_blank', { tool: 'insert_blank', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Insert Settings</p>

      <div className="ux-field">
        <label className="ux-label">Position</label>
        <div className="insert-toggle">
          <button type="button" className={position === 'before' ? 'active' : ''} onClick={() => setPosition('before')}>Before</button>
          <button type="button" className={position === 'after' ? 'active' : ''} onClick={() => setPosition('after')}>After</button>
        </div>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="insertPage">Page Number</label>
        <input
          id="insertPage"
          className="ux-input"
          type="number"
          min={1}
          max={pages || 1}
          value={pageNumber}
          onChange={(e) => setPageNumber(parseInt(e.target.value, 10) || 1)}
        />
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="insertCount">Blank Pages</label>
        <input
          id="insertCount"
          className="ux-input"
          type="number"
          min={1}
          max={30}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
        />
      </div>

      <div className="ux-field">
        <label className="ux-label">Page Size</label>
        <div className="insert-size-list">
          <label><input type="radio" checked={sizeMode === 'match'} onChange={() => setSizeMode('match')} /> Match nearest page</label>
          <label><input type="radio" checked={sizeMode === 'a4'} onChange={() => setSizeMode('a4')} /> A4 (595 x 842)</label>
          <label><input type="radio" checked={sizeMode === 'letter'} onChange={() => setSizeMode('letter')} /> Letter (612 x 792)</label>
        </div>
      </div>

      <button className="ux-btn-primary insert-add-btn" type="button" onClick={addInsertion} disabled={!pages}>
        + Add Insert
      </button>

      <div className="insert-list">
        {insertions.length === 0 ? (
          <div className="insert-empty">No insertions yet. Add a blank page rule.</div>
        ) : (
          insertions.map((item) => (
            <div key={item.id} className="insert-item">
              <div>
                <div className="insert-title">{item.count} blank page{item.count === 1 ? '' : 's'} {item.position} page {item.pageNumber}</div>
                <div className="insert-sub">Size: {item.sizeMode === 'match' ? 'Match nearest' : item.sizeMode.toUpperCase()}</div>
              </div>
              <button type="button" className="insert-remove" onClick={() => removeInsertion(item.id)}>Remove</button>
            </div>
          ))
        )}
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Current Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>New Pages</span><strong>{pages ? pages + totalInsertCount : '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Inserting blank pages..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Blank pages inserted!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const blob = new Blob([lastBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = lastName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download Again</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Blank Pages" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Insert Blank Pages"
      subtitle="Add clean blank pages anywhere in your PDF."
      icon="➕"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Inserting...' : 'Insert Blank Pages'}
      onAction={handleInsert}
      actionDisabled={working || !file || !insertions.length}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="insertBlank" />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display:'none' }}
        accept=".pdf"
        onChange={(e) => loadFile(e.target.files)}
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to insert blank pages" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Preview current pages and plan insertions from the sidebar.</p>
            </div>
            <button className="ux-btn-secondary" type="button" onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div className="ux-page-grid">
            {previewItems.map((item) => {
              if (item.type === 'blank') {
                return (
                  <div key={item.id} className="ux-page-card blank-page-card">
                    <div className="ux-page-thumb-wrap blank-page-thumb">
                      <div className="blank-page-label">Blank Page</div>
                    </div>
                    <div className="ux-page-num">Insert near page {item.page}</div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="ux-page-card" style={{ opacity: 0.85 }}>
                  <div className="ux-page-thumb-wrap">
                    {item.thumb ? <img className="ux-page-thumb-img" src={item.thumb} alt={`Page ${item.page}`} /> : <div className="ux-page-thumb-placeholder" />}
                  </div>
                  <div className="ux-page-num">Page {item.page}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="insertBlank" />
      <RecentFilesPanel tool="insert_blank" title="Recent blank inserts" />
    </ToolPageLayout>
  );
}
