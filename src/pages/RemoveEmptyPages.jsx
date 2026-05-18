import React, { useMemo, useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/RemoveEmptyPages.css';

const IMAGE_OPS = new Set([
  pdfjsLib.OPS?.paintImageXObject,
  pdfjsLib.OPS?.paintJpegXObject,
  pdfjsLib.OPS?.paintImageXObjectRepeat,
].filter(Boolean));

async function detectEmptyPages(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const total = pdf.numPages;
  const emptySet = new Set();

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    const hasText = (text?.items?.length || 0) > 0;
    const ops = await page.getOperatorList();
    const hasImages = ops.fnArray.some((op) => IMAGE_OPS.has(op));
    if (!hasText && !hasImages) emptySet.add(i - 1);
    onProgress?.(Math.round((i / total) * 80));
  }

  return { total, emptySet };
}

export default function RemoveEmptyPages() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [emptyPages, setEmptyPages] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [pageThumbs, setPageThumbs] = useState([]);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setLastBytes(null);
    setLastName('');
    setPageThumbs([]);
    setSelected(new Set());
    setEmptyPages(new Set());

    try {
      const thumbs = await generatePageThumbnails(f, () => {});
      if (thumbs) setPageThumbs(thumbs);
    } catch {
      setPageThumbs([]);
    }

    try {
      const result = await detectEmptyPages(f, setProgress);
      setPages(result.total);
      setEmptyPages(result.emptySet);
      const defaultSelected = new Set();
      for (let i = 0; i < result.total; i++) {
        if (!result.emptySet.has(i)) defaultSelected.add(i);
      }
      setSelected(defaultSelected);
      setProgress(0);
    } catch (err) {
      setError('Failed to analyze pages: ' + (err?.message || 'Unexpected error.'));
      setProgress(0);
    }
  };

  const togglePage = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleRemove = async () => {
    if (!file || !pages) return;
    const keep = Array.from(selected).sort((a, b) => a - b);
    if (!keep.length) {
      setError('Select at least one page to keep.');
      return;
    }

    setWorking(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      const pagesToCopy = await outDoc.copyPages(srcDoc, keep);
      pagesToCopy.forEach((page) => outDoc.addPage(page));
      const bytes = await outDoc.save();
      const name = file.name.replace(/\.pdf$/i, '_cleaned.pdf');
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
      setSuccess('Empty pages removed.');
      addRecentFile({ tool: 'remove_empty', name, size: bytes.byteLength || 0, pages: keep.length });
      bumpLocalJob();
      await logUserAction(user, 'remove_empty', { tool: 'remove_empty', status: 'success', meta: { removed: pages - keep.length } });
    } catch (err) {
      setError('Removal failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'remove_empty', { tool: 'remove_empty', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const selectedCount = selected.size;
  const emptyCount = emptyPages.size;

  const sidebarContent = (
    <>
      <p className="ux-section-label">Empty Page Detection</p>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>Empty Detected</span><strong>{emptyCount}</strong></div>
          <div className="ux-summary-row"><span>Pages Kept</span><strong>{selectedCount}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      <div className="remove-empty-note">Detection is best effort. Vector-only pages may appear empty.</div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Removing empty pages..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Cleaned</p>
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
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Remove Empty" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Remove Empty Pages"
      subtitle="Detect and remove blank pages from a PDF."
      icon="E"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Removing...' : 'Remove Empty Pages'}
      onAction={handleRemove}
      actionDisabled={working || !file || !selectedCount}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="removeEmpty" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to clean" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Uncheck pages you want to remove.</p>
            </div>
            <div className="remove-empty-actions">
              <button className="ux-btn-secondary" type="button" onClick={() => {
                const next = new Set();
                for (let i = 0; i < (pages || 0); i++) if (!emptyPages.has(i)) next.add(i);
                setSelected(next);
              }}>Keep Non-Empty</button>
              <button className="ux-btn-secondary" type="button" onClick={() => setSelected(new Set())}>Clear</button>
              <button className="ux-btn-secondary" type="button" onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
                Remove File
              </button>
            </div>
          </div>

          <div className="ux-page-grid">
            {Array.from({ length: pages || 0 }).map((_, i) => {
              const isEmpty = emptyPages.has(i);
              const isSelected = selected.has(i);
              return (
                <div
                  key={i}
                  className={`ux-page-card remove-empty-card${isSelected ? ' selected' : ''}${isEmpty ? ' empty' : ''}`}
                  onClick={() => togglePage(i)}
                >
                  <div className="ux-page-thumb-wrap">
                    {pageThumbs[i] ? <img className="ux-page-thumb-img" src={pageThumbs[i]} alt={`Page ${i + 1}`} /> : <div className="ux-page-thumb-placeholder" />}
                  </div>
                  <div className="ux-page-num">Page {i + 1}</div>
                  {isEmpty && <div className="remove-empty-badge">Empty</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="removeEmpty" />
      <RecentFilesPanel tool="remove_empty" title="Recent empty removal" />
    </ToolPageLayout>
  );
}
