import React, { useState, useCallback, useRef } from 'react';
import useSEO from '../hooks/useSEO';
import {
  addFiles, getFiles, clearFiles, removeFile,
  subscribe, setPageCount, setThumbnail
} from '../fileManager';
import { mergePDFs, downloadPDF, getPageCount, timestampedFilename } from '../pdfMerger';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { uploadToDrive } from '../services/googleDrive';
import SaveToDriveButton from '../components/SaveToDriveButton';
import ToolPageLayout from '../components/ToolPageLayout';
import FileList from '../components/FileList';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';

/* Google Drive icon */
const DriveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
    <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.55A8.994 8.994 0 0 0 0 53.05h27.5l16.15-28.05z" fill="#00AC47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.2 7.9 12.6z" fill="#EA4335"/>
    <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.1.45-4.5 1.2L43.65 25z" fill="#00832D"/>
    <path d="M59.8 53.05H27.5L13.75 76.8c1.4.8 2.95 1.2 4.5 1.2h50.8c1.6 0 3.1-.45 4.5-1.2L59.8 53.05z" fill="#2684FC"/>
    <path d="M73.4 26.5l-13.1-22.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28.05H87.3c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/>
  </svg>
);

/* Drive button visual states */
const DRIVE_STATE = {
  idle:    { label: 'Save to Drive',        cls: 'btn-drive' },
  loading: { label: 'Uploading to Drive…',  cls: 'btn-drive loading' },
  success: { label: 'Saved to Drive ✓',     cls: 'btn-drive success' },
  error:   { label: 'Drive failed — retry', cls: 'btn-drive error' },
};

export default function MergePDF() {
  useSEO('Merge PDF Online Free � OM PDF | No Upload Required','Combine multiple PDF files into one. Drag to reorder pages, then merge instantly in your browser. 100% free, private, no upload.','https://om-pdf.netlify.app/merge-pdf');
  const { user } = useAuth();
  /* ── File list ── */
  const [files, setFiles] = useState([]);

  /* ── Merge state ── */
  const [progress, setProgress]   = useState(0);
  const [progLabel, setProgLabel] = useState('');
  const [merging, setMerging]     = useState(false);
  const [error, setError]         = useState('');
  const [warning, setWarning]     = useState('');
  const [success, setSuccess]     = useState('');
  const [filename, setFilename]   = useState('');

  /* ── Drive state handled by SaveToDriveButton component ── */
  // last merged result for re-download / drive save
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');

  /* ── Subscribe to file manager ── */
  React.useEffect(() => {
    const unsub = subscribe(list => setFiles([...list]));
    return unsub;
  }, []);

  /* ── Handle dropped / selected files ── */
  const handleFiles = useCallback(async (rawFiles) => {
    const { warnings } = addFiles(Array.from(rawFiles));
    if (warnings.length) setWarning(warnings.join(' | '));
    getFiles().forEach(entry => {
      if (entry.pages === null)
        getPageCount(entry.file).then(n => { if (n) setPageCount(entry.id, n); });
      if (entry.thumbnail === null)
        generateThumbnail(entry.file).then(url => { if (url) setThumbnail(entry.id, url); });
    });
  }, []);

  /* ── Merge ── */
  const handleMerge = async () => {
    if (files.length < 2) { setError('Add at least 2 PDF files.'); return; }
    setError(''); setWarning(''); setSuccess('');
    setMerging(true); setProgress(0);

    try {
      const name = timestampedFilename(filename.trim() || 'merged');
      const { bytes, warnings: w } = await mergePDFs(files, (p, lbl) => {
        setProgress(p);
        if (lbl) setProgLabel(lbl);
      });
      lastBytesRef.current = bytes;
      lastNameRef.current  = name;
      downloadPDF(bytes, name);
      if (w.length) setWarning(w.join(' | '));
      const pages = files.reduce((s, f) => s + (f.pages || 0), 0);
      setSuccess(`"${name}" · ${files.length} files${pages ? ' · ' + pages + ' pages' : ''}`);
      setFilename('');
    } catch (err) {
      setError('Merge failed: ' + (err.message || 'Unexpected error.'));
    } finally {
      setMerging(false); setProgress(0); setProgLabel('');
    }
  };

  /* ── No separate handleSaveDrive — handled by SaveToDriveButton ── */

  const ds = null; // unused

  return (
    <ToolPageLayout
      title="Merge PDF Files"
      subtitle="Combine multiple PDFs into one. Drag to reorder, then merge instantly."
      icon="🔗"
    >
      {/* Drop zone */}
      <DropZone onFiles={handleFiles} multiple />

      {/* File list */}
      {files.length > 0 && (
        <FileList
          files={files}
          onRemove={id => removeFile(id)}
          onClear={clearFiles}
          onAddMore={handleFiles}
          onReorder={() => setFiles([...getFiles()])}
        />
      )}

      {/* Alerts */}
      {warning && <div className="alert alert-warning"><span>⚠️ {warning}</span></div>}
      {error   && <div className="alert alert-error"><span>❌ {error}</span></div>}

      {/* Progress */}
      {merging && <ProgressBar pct={progress} label={progLabel} />}

      {/* ── Success banner ── */}
      {success && (
        <SuccessBanner
          message="PDF merged successfully!"
          details={success}
          onDismiss={() => { setSuccess(''); setDriveState('idle'); setDriveLink(''); }}
        >
          {/* Re-download */}
          <button
            className="btn-action-sm btn-action-download"
            onClick={() => downloadPDF(lastBytesRef.current, lastNameRef.current)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Again
          </button>

          {/* Save to Google Drive */}
          <SaveToDriveButton
            bytes={lastBytesRef.current}
            filename={lastNameRef.current}
            toolFolder="Merged"
          />
        </SuccessBanner>
      )}

      {/* Merge controls */}
      {files.length >= 2 && !merging && (
        <div className="merge-section">
          <div className="filename-row">
            <label className="filename-label" htmlFor="mergeFilename">Output filename</label>
            <div className="filename-input-wrap">
              <input
                id="mergeFilename"
                className="filename-input"
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="merged"
                spellCheck={false}
              />
              <span className="filename-ext">.pdf</span>
            </div>
          </div>

          <button className="btn-merge" onClick={handleMerge} disabled={merging}>
            <span className="btn-merge-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="8" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Merge PDFs
            </span>
          </button>

          <p className="merge-hint">🔒 Processed locally — files never uploaded to any server</p>
        </div>
      )}
    </ToolPageLayout>
  );
}
