import React, { useState, useRef } from 'react';
import useSEO from '../hooks/useSEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { addPageNumbers, getPdfPageCount } from '../pageNumbers';
import { downloadBytes } from '../splitPdf';
import { formatBytes } from '../fileManager';

export default function PageNumbers() {
  useSEO('Add Page Numbers to PDF Free � OM PDF | Custom Position & Style','Stamp page numbers onto any PDF. Choose position, prefix, font size and starting number. Free, private, no upload.','https://om-pdf.netlify.app/page-numbers');
  const [file, setFile]     = useState(null);
  const [pages, setPages]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [working, setWorking]   = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [opts, setOpts] = useState({
    startFrom: 1, startPage: 1, position: 'bottom-center',
    prefix: '', showTotal: false, fontSize: 11,
  });
  const [filename, setFilename] = useState('');
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');

  const loadFile = async (raw) => {
    const f = raw[0];
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setFilename(f.name.replace(/\.pdf$/i, ''));
    setPages(null);
    const n = await getPdfPageCount(f);
    setPages(n);
  };

  const handleProcess = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(0);
    try {
      const bytes = await addPageNumbers(file, opts, setProgress);
      const name  = `${(filename.trim() || 'numbered')}_${new Date().toISOString().slice(0,10)}.pdf`;
      downloadBytes(bytes, name);
      lastBytesRef.current = bytes;
      lastNameRef.current  = name;
      setSuccess(`"${name}" — page numbers added`);
    } catch (err) {
      setError('Failed: ' + (err.message || 'Unexpected error.'));
    } finally { setWorking(false); setProgress(0); }
  };

  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  return (
    <ToolPageLayout title="Add Page Numbers" subtitle="Stamp customizable page numbers onto any PDF — locally, instantly." icon="🔢">
      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to add page numbers" hint="Single PDF · Max 200 MB" />
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
            <button className="btn-remove" onClick={() => { setFile(null); setPages(null); setSuccess(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-option-panel">
            <div className="pn-options-grid">
              <div className="pn-option-group">
                <label className="split-label" htmlFor="pnPos">Position</label>
                <select id="pnPos" className="pn-select" value={opts.position} onChange={e => set('position', e.target.value)}>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="pnFrom">Start number from</label>
                <input id="pnFrom" className="split-range-input" type="number" value={opts.startFrom} min={1}
                  onChange={e => set('startFrom', parseInt(e.target.value) || 1)} style={{ padding: '8px 12px' }} />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="pnPage">Apply from page</label>
                <input id="pnPage" className="split-range-input" type="number" value={opts.startPage} min={1}
                  onChange={e => set('startPage', parseInt(e.target.value) || 1)} style={{ padding: '8px 12px' }} />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="pnPre">Label prefix</label>
                <input id="pnPre" className="split-range-input" type="text" value={opts.prefix}
                  onChange={e => set('prefix', e.target.value)} style={{ padding: '8px 12px' }} />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="pnFs">Font size (pt)</label>
                <input id="pnFs" className="split-range-input" type="number" value={opts.fontSize} min={6} max={24}
                  onChange={e => set('fontSize', parseInt(e.target.value) || 11)} style={{ padding: '8px 12px' }} />
              </div>
              <div className="pn-option-group pn-checkbox-group">
                <label className="pn-checkbox-label">
                  <input type="checkbox" checked={opts.showTotal} onChange={e => set('showTotal', e.target.checked)} />
                  Show total (e.g. "Page 1 of 5")
                </label>
              </div>
            </div>
            <div className="filename-row" style={{ marginTop: 14 }}>
              <label className="filename-label" htmlFor="pnFilename">Output filename</label>
              <div className="filename-input-wrap">
                <input id="pnFilename" className="filename-input" type="text" value={filename}
                  onChange={e => setFilename(e.target.value)} placeholder="numbered" spellCheck={false} />
                <span className="filename-ext">.pdf</span>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error"><span>❌ {error}</span></div>}
          {working && <ProgressBar pct={progress} label="Adding page numbers…" />}
          {success && (
            <SuccessBanner message="Page numbers added!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton
                bytes={lastBytesRef.current}
                filename={lastNameRef.current}
                toolFolder="Page Numbers"
              />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button className="btn-merge btn-pn-action" onClick={handleProcess} disabled={working}>
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Add Page Numbers
              </span>
            </button>
            <p className="merge-hint">🔒 Processed locally — no server</p>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
