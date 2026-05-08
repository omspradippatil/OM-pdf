import React, { useState, useCallback, useRef } from 'react';
import SEO from '../components/SEO';
import {
  addFiles, getFiles, clearFiles, removeFile,
  subscribe, setPageCount, setThumbnail, setFileStatus, setFileProgress
} from '../fileManager';
import { mergePDFs, downloadPDF, getPageCount, timestampedFilename } from '../pdfMerger';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import ToolPageLayout from '../components/ToolPageLayout';
import FileList from '../components/FileList';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';

export default function MergePDF() {
  
  const { user } = useAuth();
  /* -- File list -- */
  const [files, setFiles] = useState([]);

  /* -- Merge state -- */
  const [progress, setProgress]   = useState(0);
  const [progLabel, setProgLabel] = useState('');
  const [merging, setMerging]     = useState(false);
  const [error, setError]         = useState('');
  const [warning, setWarning]     = useState('');
  const [success, setSuccess]     = useState('');
  const [filename, setFilename]   = useState('');

  /* -- Drive state handled by SaveToDriveButton component -- */
  // last merged result for re-download / drive save
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');

  /* -- Subscribe to file manager -- */
  React.useEffect(() => {
    const unsub = subscribe(list => setFiles([...list]));
    return unsub;
  }, []);

  /* -- Handle dropped / selected files -- */
  const handleFiles = useCallback(async (rawFiles) => {
    const { warnings } = addFiles(Array.from(rawFiles));
    if (warnings.length) setWarning(warnings.join(' | '));
    getFiles().forEach(entry => {
      if (entry.pages === null || entry.thumbnail === null) {
        setFileStatus(entry.id, 'processing', 'Analyzing file');
      }
      if (entry.pages === null) {
        getPageCount(entry.file).then(n => {
          if (n !== null) {
            setPageCount(entry.id, n);
            setFileProgress(entry.id, 45);
            const current = getFiles().find(f => f.id === entry.id);
            if (current?.thumbnail) {
              setFileProgress(entry.id, 100);
              setFileStatus(entry.id, 'ready');
            }
          }
        }).catch(() => {
          setFileStatus(entry.id, 'error', 'Failed to read pages');
        });
      }
      if (entry.thumbnail === null) {
        generateThumbnail(entry.file).then(url => {
          if (url) {
            setThumbnail(entry.id, url);
            setFileProgress(entry.id, 75);
            const current = getFiles().find(f => f.id === entry.id);
            if (current?.pages !== null) {
              setFileProgress(entry.id, 100);
              setFileStatus(entry.id, 'ready');
            }
          }
        }).catch(() => {
          const current = getFiles().find(f => f.id === entry.id);
          if (current?.pages !== null) {
            setFileProgress(entry.id, 100);
            setFileStatus(entry.id, 'ready', 'Thumbnail skipped');
          } else {
            setFileStatus(entry.id, 'error', 'Thumbnail failed');
          }
        });
      }
    });
  }, []);

  /* -- Merge -- */
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
      setSuccess(`"${name}" - ${files.length} files${pages ? ' - ' + pages + ' pages' : ''}`);
      setFilename('');
      addRecentFile({
        tool: 'merge',
        name,
        size: bytes?.byteLength || 0,
        pages,
      });
      bumpLocalJob();
      await logUserAction(user, 'merge', {
        tool: 'merge',
        status: 'success',
        meta: { files: files.length, pages, outputName: name }
      });
    } catch (err) {
      setError('Merge failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'merge', {
        tool: 'merge',
        status: 'error',
        meta: { error: err?.message || 'Merge failed' }
      });
    } finally {
      setMerging(false); setProgress(0); setProgLabel('');
    }
  };

  /* -- No separate handleSaveDrive; handled by SaveToDriveButton -- */

  const queueItems = files.map(f => ({
    id: f.id,
    name: f.name,
    status: f.status,
    progress: f.progress,
    etaMs: f.etaMs,
    message: f.message,
  }));

  return (
    <ToolPageLayout
      title="Merge PDF Files"
      subtitle="Combine multiple PDFs into one. Drag to reorder, then merge instantly."
      icon="🔗"
    >
      <SEO title="Merge PDF Online Free — OM PDF | No Upload Required" description="Combine multiple PDF files into one. Drag to reorder pages, then merge instantly in your browser. 100% free, private, no upload." url="https://om-pdf.netlify.app/merge-pdf" />
      {/* Drop zone */}
      <DropZone onFiles={handleFiles} multiple />

      <QueuePanel title="File queue" items={queueItems} />

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
      {warning && <div className="alert alert-warning"><span>Warning: {warning}</span></div>}
      {error   && <div className="alert alert-error"><span>❌ {error}</span></div>}

      {/* Progress */}
      {merging && <ProgressBar pct={progress} label={progLabel} />}

      {/* -- Success banner -- */}
      {success && (
        <SuccessBanner
          message="PDF merged successfully!"
          details={success}
          onDismiss={() => { setSuccess(''); }}
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

          <p className="merge-hint">🔒 Processed locally - files never uploaded to any server</p>
        </div>
      )}

      <RecentFilesPanel tool="merge" title="Recent merges" />
    </ToolPageLayout>
  );
}









