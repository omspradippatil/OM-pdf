import React, { useState, useRef } from 'react';
import useSEO from '../hooks/useSEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { parsePageRanges, extractPages, splitEveryPage, downloadBytes } from '../splitPdf';
import { formatBytes } from '../fileManager';
import { PDFDocument } from 'pdf-lib';

async function getPageCount(file) {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch { return null; }
}

export default function SplitPDF() {
  useSEO('Split PDF Online Free � OM PDF | Extract Pages Instantly','Split a PDF into individual pages or extract specific page ranges. Free, private, browser-based � no upload needed.','https://om-pdf.netlify.app/split-pdf');
  const [file, setFile]       = useState(null);
  const [pages, setPages]     = useState(null);
  const [mode, setMode]       = useState('range'); // 'range' | 'every'
  const [range, setRange]     = useState('');
  const [filename, setFilename] = useState('');
  const [progress, setProgress] = useState(0);
  const [splitting, setSplitting] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const lastBytesRef = useRef(null); // Uint8Array (range) or Blob (ZIP)
  const lastNameRef  = useRef('');
  const lastMimeRef  = useRef('application/pdf');

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
      if (mode === 'range') {
        const total = pages || 9999;
        const indices = range.trim() ? parsePageRanges(range, total) : Array.from({ length: total }, (_, i) => i);
        if (!indices.length) { setError('No valid pages in range.'); return; }
        const bytes = await extractPages(file, indices, p => setProgress(p));
        const name  = `${baseName}_${new Date().toISOString().slice(0,10)}.pdf`;
        downloadBytes(bytes, name);
        lastBytesRef.current = bytes;
        lastNameRef.current  = name;
        lastMimeRef.current  = 'application/pdf';
        setSuccess(`"${baseName}.pdf" · ${indices.length} pages extracted`);
      } else {
        const zip  = await splitEveryPage(file, baseName, p => setProgress(p));
        const name = `${baseName}_pages_${new Date().toISOString().slice(0,10)}.zip`;
        const url  = URL.createObjectURL(zip);
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        lastBytesRef.current = zip;
        lastNameRef.current  = name;
        lastMimeRef.current  = 'application/zip';
        setSuccess(`ZIP with ${pages} individual pages downloaded`);
      }
    } catch (err) {
      setError('Split failed: ' + (err.message || 'Unexpected error.'));
    } finally { setSplitting(false); setProgress(0); }
  };

  return (
    <ToolPageLayout title="Split PDF" subtitle="Extract page ranges or split every page into individual PDFs." icon="✂️">
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
            ) : (
              <div className="split-every-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Each page will be saved as an individual PDF, bundled into a single <strong>ZIP file</strong>.
              </div>
            )}
          </div>

          {error   && <div className="alert alert-error"><span>❌ {error}</span></div>}
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
    </ToolPageLayout>
  );
}
