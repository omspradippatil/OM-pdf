import React, { useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';
import { parsePageRanges, extractPages, splitEveryPage, splitEveryNPages, downloadBytes } from '../splitPdf';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';

const MODE_OPTIONS = [
  { id: 'range',  label: 'Page Range',    desc: 'Extract specific page numbers' },
  { id: 'every',  label: 'Every N pages', desc: 'Split into equal chunks' },
  { id: 'single', label: 'Single pages',  desc: 'One PDF per page' },
];

export default function SplitPDF() {
  const { user } = useAuth();
  const [file, setFile]       = useState(null);
  const [pages, setPages]     = useState(null);
  const [mode, setMode]       = useState('range');
  const [range, setRange]     = useState('1-3, 5, 7-10');
  const [chunkSize, setChunkSize] = useState(3);
  const [progress, setProgress] = useState(0);
  const [splitting, setSplitting] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [pageThumbs, setPageThumbs] = useState([]);
  const fileInputRef = React.useRef(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setPageThumbs([]); setLastResult(null);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPages(doc.getPageCount());
      
      const thumbs = await generatePageThumbnails(f, () => {});
      if (thumbs) setPageThumbs(thumbs);
    } catch { setPages(null); }
  };

  const togglePageSelection = (index) => {
    if (mode !== 'range') setMode('range');
    let currentIndices = [];
    try { currentIndices = parsePageRanges(range, pages || 9999); } catch { currentIndices = []; }
    if (currentIndices.includes(index)) {
      currentIndices = currentIndices.filter(i => i !== index);
    } else {
      currentIndices.push(index);
      currentIndices.sort((a,b) => a-b);
    }
    setRange(currentIndices.map(i => i + 1).join(', '));
  };

  const handleSplit = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setSplitting(true); setProgress(0); setLastResult(null);
    const baseName = file.name.replace(/\.pdf$/i, '');
    try {
      if (mode === 'range') {
        const indices = parsePageRanges(range, pages || 9999);
        if (!indices.length) throw new Error('No valid pages in that range.');
        const bytes = await extractPages(file, indices);
        const name  = `${baseName}_pages.pdf`;
        triggerExport(bytes, name, 'application/pdf', "Split");
        addRecentFile({ tool: 'split', name, size: bytes.byteLength || 0 });
        setSuccess(`Extracted ${indices.length} pages → "${name}"`);
        setLastResult({ bytes, name, mime: 'application/pdf' });
      } else if (mode === 'every') {
        const blob = await splitEveryNPages(file, baseName, chunkSize, setProgress);
        const zipName = `${baseName}_split.zip`;
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href = url; a.download = zipName;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        addRecentFile({ tool: 'split', name: zipName, size: blob.size || 0 });
        setSuccess(`Split into chunks → "${zipName}"`);
        setLastResult({ bytes: blob, name: zipName, mime: 'application/zip' });
      } else {
        setProgress(10);
        const blob = await splitEveryPage(file, baseName, setProgress);
        const zipName = `${baseName}_all_pages.zip`;
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href = url; a.download = zipName;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        addRecentFile({ tool: 'split', name: zipName, size: blob.size || 0 });
        setSuccess(`${pages} pages saved → "${zipName}"`);
        setLastResult({ bytes: blob, name: zipName, mime: 'application/zip' });
      }
      bumpLocalJob();
      await logUserAction(user, 'split', { tool: 'split', status: 'success', meta: { mode } });
    } catch (err) {
      setError('Split failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'split', { tool: 'split', status: 'error', meta: { error: err?.message } });
    } finally { setSplitting(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Split Settings</p>      <div className="ux-label" style={{ marginBottom:8 }}>Split Mode</div>
      {MODE_OPTIONS.map(m => (
        <div key={m.id} className={`ux-option-card${mode===m.id?' selected':''}`} onClick={() => setMode(m.id)}>
          <div><div className="ux-option-title">{m.label}</div><div className="ux-option-desc">{m.desc}</div></div>
        </div>
      ))}

      {mode === 'range' && (
        <div className="ux-field">
          <label className="ux-label" htmlFor="splitRange">Page Range</label>
          <input id="splitRange" className="ux-input" type="text" value={range}
            onChange={e => setRange(e.target.value)} placeholder="e.g. 1-3, 5, 7-10" />
          <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:4 }}>Comma-separated ranges</p>
        </div>
      )}
      {mode === 'every' && (
        <div className="ux-field">
          <label className="ux-label" htmlFor="chunkSize">Pages per chunk</label>
          <input id="chunkSize" className="ux-input" type="number" min={1} max={pages||999} value={chunkSize}
            onChange={e => setChunkSize(Math.max(1, parseInt(e.target.value)||3))} />
        </div>
      )}
      {mode === 'single' && pages && (
        <div className="ux-option-card selected">
          <div><div className="ux-option-title">One file per page</div>
          <div className="ux-option-desc">{pages} individual PDFs → ZIP archive</div></div>
        </div>
      )}

      {file && pages && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {error    && <div className="alert alert-error" style={{ marginTop:10 }}><span>❌ {error}</span></div>}
      {splitting && <ProgressBar pct={progress} label="Splitting PDF…" />}
      {success  && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Split Complete!</p>
            <p className="ux-result-success-sub">{success}</p>
          </div>
          {lastResult && (
            <div className="ux-result-body">
              <div className="ux-result-actions">
                <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                  if (lastResult.mime === 'application/pdf') triggerExport(lastResult.bytes, lastResult.name, 'application/pdf', "Split");
                  else {
                    const url = URL.createObjectURL(lastResult.bytes);
                    const a = document.createElement('a'); a.href = url; a.download = lastResult.name;
                    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }
                }}>
                  ↓ Download Again
                </button>
                <SaveToDriveButton bytes={lastResult.bytes} filename={lastResult.name} mimeType={lastResult.mime} toolFolder="Split" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Split PDF"
      subtitle="Extract pages or split into chunks. Locally in your browser."
      icon="✂️"
      sidebarContent={sidebarContent}
      actionLabel={splitting ? 'Splitting…' : 'Split PDF'}
      onAction={handleSplit}
      actionDisabled={splitting || !file}
    >
      <ToolSeoHead toolKey="split" />
      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to split" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Configure split settings in the right panel.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div className="ux-page-grid">
            {Array.from({ length: pages || 0 }).map((_, i) => {
              let isSelected = false;
              if (mode === 'range') {
                try {
                  const indices = parsePageRanges(range, pages || 9999);
                  isSelected = indices.includes(i);
                } catch { /* ignore parse errors while typing */ }
              } else if (mode === 'every') {
                isSelected = (i % chunkSize) === 0; // Just highlight the chunk start
              } else {
                isSelected = true; // All pages selected in single mode
              }

              return (
                <div key={i} className="ux-page-card" onClick={() => togglePageSelection(i)} style={{ border: isSelected ? '2px solid var(--primary)' : '2px solid transparent', transition: 'border-color 0.2s', opacity: isSelected ? 1 : 0.6, cursor: 'pointer' }}>
                  <div className="ux-page-thumb-wrap" style={{ cursor: 'pointer' }}>
                    {pageThumbs[i] ? <img className="ux-page-thumb-img" src={pageThumbs[i]} alt={`Page ${i + 1}`} /> : <div className="ux-page-thumb-placeholder" />}
                  </div>
                  <div className="ux-page-num" style={{ color: isSelected ? 'var(--primary)' : 'inherit', fontWeight: isSelected ? 700 : 500 }}>Page {i + 1}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <ToolSeoContent toolKey="split" />
      <RecentFilesPanel tool="split" title="Recent splits" />
    </ToolPageLayout>
  );
}
