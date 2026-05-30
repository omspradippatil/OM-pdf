import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { parsePageRanges } from '../splitPdf';
import { PDFDocument } from 'pdf-lib';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/MergeWithRanges.css';

const newId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function MergeWithRanges() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const loadFiles = async (raw) => {
    const files = Array.from(raw || []).filter((f) => f.type === 'application/pdf');
    if (!files.length) { setError('Select valid PDF files.'); return; }
    setError('');
    setSuccess('');

    const nextEntries = files.map((file) => ({
      id: newId(),
      file,
      name: file.name,
      size: file.size,
      pages: null,
      range: '',
      thumbnail: null,
    }));

    setEntries((prev) => [...prev, ...nextEntries]);

    nextEntries.forEach(async (entry) => {
      try {
        const buf = await entry.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = pdfDoc.getPageCount();
        setEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, pages, range: `1-${pages}` } : item));
      } catch {
        setEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, pages: null } : item));
      }
      generateThumbnail(entry.file).then((url) => {
        if (!url) return;
        setEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, thumbnail: url } : item));
      });
    });
  };

  const updateRange = (id, value) => {
    setEntries((prev) => prev.map((item) => item.id === id ? { ...item, range: value } : item));
  };

  const moveEntry = (id, dir) => {
    setEntries((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx < 0) return prev;
      const nextIndex = idx + dir;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const removeEntry = (id) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMerge = async () => {
    if (!entries.length) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const outDoc = await PDFDocument.create();
      let totalPages = 0;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.range || !entry.pages) {
          throw new Error(`Invalid page range for ${entry.name}.`);
        }
        const indices = parsePageRanges(entry.range, entry.pages);
        if (!indices.length) throw new Error(`No valid pages for ${entry.name}.`);

        const buf = await entry.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await outDoc.copyPages(srcDoc, indices);
        pages.forEach((page) => outDoc.addPage(page));
        totalPages += pages.length;
        setProgress(Math.round(((i + 1) / entries.length) * 80));
      }

      const bytes = await outDoc.save();
      const name = 'merged_ranges.pdf';
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
      setProgress(100);
      setSuccess('Merged with ranges.');
      addRecentFile({ tool: 'merge_ranges', name, size: bytes.byteLength || 0, pages: totalPages });
      bumpLocalJob();
      await logUserAction(user, 'merge_ranges', { tool: 'merge_ranges', status: 'success', meta: { files: entries.length, pages: totalPages } });
    } catch (err) {
      setError('Merge failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'merge_ranges', { tool: 'merge_ranges', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Merge Settings</p>

      <div className="merge-ranges-note">Enter page ranges like 1-3, 7, 10-12 for each file.</div>

      <div className="ux-summary">
        <div className="ux-summary-row"><span>Files</span><strong>{entries.length}</strong></div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Merging selected pages..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Merged</p>
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
              }}>Download</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Merged Ranges" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Merge with Ranges"
      subtitle="Merge PDFs while selecting page ranges per file."
      icon="M"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Merging...' : 'Merge Selected Pages'}
      onAction={handleMerge}
      actionDisabled={working || !entries.length}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="mergeRanges" />

      <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display:'none' }} onChange={(e) => loadFiles(e.target.files)} />

      {!entries.length ? (
        <DropZone onFiles={loadFiles} multiple label="Drop PDFs to merge" hint="Multiple PDFs supported - 200 MB Recommended each" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Reorder files and set page ranges.</p>
            </div>
            <div className="merge-ranges-actions">
              <button className="ux-btn-secondary" type="button" onClick={() => fileInputRef.current?.click()}>Add More</button>
              <button className="ux-btn-secondary" type="button" onClick={() => setEntries([])}>Clear All</button>
            </div>
          </div>

          <div className="merge-ranges-list">
            {entries.map((entry, index) => (
              <div className="merge-range-card" key={entry.id}>
                <div className="merge-range-thumb">
                  {entry.thumbnail ? <img src={entry.thumbnail} alt="PDF preview" /> : <div className="merge-range-thumb-placeholder" />}
                </div>
                <div className="merge-range-info">
                  <div className="merge-range-name">{entry.name}</div>
                  <div className="merge-range-sub">{formatBytes(entry.size)} - {entry.pages || '-'} pages</div>
                  <input
                    className="ux-input"
                    type="text"
                    value={entry.range}
                    onChange={(e) => updateRange(entry.id, e.target.value)}
                    placeholder="e.g. 1-3, 6"
                  />
                </div>
                <div className="merge-range-actions">
                  <button className="ux-btn-secondary" type="button" onClick={() => moveEntry(entry.id, -1)} disabled={index === 0}>Up</button>
                  <button className="ux-btn-secondary" type="button" onClick={() => moveEntry(entry.id, 1)} disabled={index === entries.length - 1}>Down</button>
                  <button className="ux-btn-secondary" type="button" onClick={() => removeEntry(entry.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="mergeRanges" />
      <RecentFilesPanel tool="merge_ranges" title="Recent merges with ranges" />
    </ToolPageLayout>
  );
}
