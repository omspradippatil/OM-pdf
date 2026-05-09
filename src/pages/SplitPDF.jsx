import React, { useState, useRef } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { useAuth } from '../context/AuthContext';
import { parsePageRanges, extractPages, splitEveryPage, splitEveryNPages, downloadBytes } from '../splitPdf';
import { formatBytes } from '../fileManager';
import { PDFDocument } from 'pdf-lib';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';
import '../styles/SplitPDF.css';

async function getPageCount(file) {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch { return null; }
}

export default function SplitPDF() {
  
  const { user } = useAuth();
  const [file, setFile]       = useState(null);
  const [pages, setPages]     = useState(null);
  const [mode, setMode]       = useState('range'); // 'range' | 'every' | 'chunk'
  const [range, setRange]     = useState('');
  const [chunkSize, setChunkSize] = useState(2);
  const [filename, setFilename] = useState('');
  const [progress, setProgress] = useState(0);
  const [splitting, setSplitting] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const lastBytesRef = useRef(null); // Uint8Array (range) or Blob (ZIP)
  const lastNameRef  = useRef('');
  const lastMimeRef  = useRef('application/pdf');

  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: splitting ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: splitting ? progress : success ? 100 : 0,
    etaMs: file.size ? Math.max(1200, Math.round((file.size / (1024 * 1024)) * 900)) : null,
    message: error || '',
  }] : [];

  const loadFile = async (raw) => {
    const f = raw[0];
    if (!f || f.type !== 'application/pdf') { setError('Please select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess('');
    setFilename(f.name.replace(/\.pdf$/i, ''));
    setPages(null);
    const n = await getPageCount(f);
    setPages(n);
  };

  const handleSplit = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setSplitting(true); setProgress(0);
    try {
      const baseName = filename.trim() || 'extracted';
      const totalPages = pages ?? await getPageCount(file);
      if (!totalPages) { setError('Could not read page count.'); return; }
      if (pages === null) setPages(totalPages);
      if (mode === 'range') {
        const indices = range.trim() ? parsePageRanges(range, totalPages) : Array.from({ length: totalPages }, (_, i) => i);
        if (!indices.length) { setError('No valid pages in range.'); return; }
        const bytes = await extractPages(file, indices);
        const name  = `${baseName}_${new Date().toISOString().slice(0,10)}.pdf`;
        downloadBytes(bytes, name);
        lastBytesRef.current = bytes;
        lastNameRef.current  = name;
        lastMimeRef.current  = 'application/pdf';
        setSuccess(`"${baseName}.pdf" - ${indices.length} pages extracted`);
        addRecentFile({ tool: 'split', name, size: bytes.byteLength || 0, pages: indices.length });
        bumpLocalJob();
        await logUserAction(user, 'split_range', {
          tool: 'split',
          status: 'success',
          meta: { pages: indices.length, outputName: name }
        });
      } else if (mode === 'every') {
        const zip  = await splitEveryPage(file, baseName, p => setProgress(p));
        const name = `${baseName}_pages_${new Date().toISOString().slice(0,10)}.zip`;
        const url  = URL.createObjectURL(zip);
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        lastBytesRef.current = zip;
        lastNameRef.current  = name;
        lastMimeRef.current  = 'application/zip';
        setSuccess(`ZIP with ${totalPages} individual pages downloaded`);
        addRecentFile({ tool: 'split', name, size: zip.size || 0, pages: totalPages });
        bumpLocalJob();
        await logUserAction(user, 'split_every', {
          tool: 'split',
          status: 'success',
          meta: { pages: totalPages, outputName: name }
        });
      } else {
        const zip  = await splitEveryNPages(file, baseName, chunkSize, p => setProgress(p));
        const name = `${baseName}_chunks_${new Date().toISOString().slice(0,10)}.zip`;
        const url  = URL.createObjectURL(zip);
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        lastBytesRef.current = zip;
        lastNameRef.current  = name;
        lastMimeRef.current  = 'application/zip';
        setSuccess(`ZIP with ${totalPages} pages in chunks of ${chunkSize}`);
        addRecentFile({ tool: 'split', name, size: zip.size || 0, pages: totalPages });
        bumpLocalJob();
        await logUserAction(user, 'split_chunk', {
          tool: 'split',
          status: 'success',
          meta: { pages: totalPages, chunkSize, outputName: name }
        });
      }
    } catch (err) {
      setError('Split failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'split', {
        tool: 'split',
        status: 'error',
        meta: { error: err?.message || 'Split failed' }
      });
    } finally { setSplitting(false); setProgress(0); }
  };

  return (
    <ToolPageLayout title="Split PDF" subtitle="Extract page ranges or split every page into individual PDFs." icon="✂️">
      <SEO keywords="split pdf, extract pages, pdf splitter, cut pdf, separate pdf pages, free pdf tools" title="Split PDF Online Free — Extract Pages Instantly | OM PDF" description="Split a PDF into individual pages or extract specific page ranges. Free, private, browser-based — no upload needed." url="https://om-pdf.netlify.app/split-pdf" />
      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to split" hint="Single PDF · Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta">
                <span className="file-size">{formatBytes(file.size)}</span>
                <span className="file-pages">{pages ? `${pages} pages` : 'counting…'}</span>
              </div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-modes">
            <button className={`split-mode-btn${mode === 'range' ? ' active' : ''}`} onClick={() => setMode('range')}>📄 Extract Pages</button>
            <button className={`split-mode-btn${mode === 'every' ? ' active' : ''}`} onClick={() => setMode('every')}>✂️ Split Every Page</button>
            <button className={`split-mode-btn${mode === 'chunk' ? ' active' : ''}`} onClick={() => setMode('chunk')}>🧩 Split Every N Pages</button>
          </div>

          <div className="split-option-panel">
            {mode === 'range' ? (
              <>
                <label className="split-label" htmlFor="rangeInput">Pages to extract</label>
                <input id="rangeInput" className="split-range-input" type="text" value={range}
                  onChange={e => setRange(e.target.value)} placeholder="e.g. 1-3, 5, 7-9 (blank = all)" />
                <p className="split-hint">Separate ranges with commas. Example: <code>1-5, 8, 11-15</code></p>
                <div className="filename-row" style={{ marginTop: 12 }}>
                  <label className="filename-label" htmlFor="splitFilename">Output filename</label>
                  <div className="filename-input-wrap">
                    <input id="splitFilename" className="filename-input" type="text" value={filename}
                      onChange={e => setFilename(e.target.value)} placeholder="extracted" spellCheck={false} />
                    <span className="filename-ext">.pdf</span>
                  </div>
                </div>
              </>
            ) : mode === 'every' ? (
              <div className="split-every-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Each page will be saved as an individual PDF, bundled into a single <strong>ZIP file</strong>.
              </div>
            ) : (
              <>
                <label className="split-label" htmlFor="chunkInput">Pages per file</label>
                <input id="chunkInput" className="split-range-input" type="number" min={1} max={200}
                  value={chunkSize} onChange={e => setChunkSize(Math.max(1, parseInt(e.target.value) || 1))} />
                <p className="split-hint">Example: 2 → 1-2, 3-4, 5-6 …</p>
              </>
            )}
          </div>

          {error   && <div className="alert alert-error"><span>❌ {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {splitting && <ProgressBar pct={progress} label="Splitting PDF…" />}
          {success && (
            <SuccessBanner message="Split complete!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton
                bytes={lastBytesRef.current}
                filename={lastNameRef.current}
                toolFolder="Split"
                mimeType={lastMimeRef.current}
              />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button className="btn-merge btn-split-action" onClick={handleSplit} disabled={splitting}>
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Split PDF
              </span>
            </button>
            <p className="merge-hint">🔒 Processed locally — your file stays private</p>
          </div>
        </div>
      )}
      <RecentFilesPanel tool="split" title="Recent splits" />
    </ToolPageLayout>
  );
}








