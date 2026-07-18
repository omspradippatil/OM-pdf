import React, { useState, useCallback, useRef } from 'react';
import {
  addFiles, getFiles, clearFiles, removeFile,
  subscribe, setPageCount, setThumbnail, setFileStatus, setFileProgress, formatBytes
} from '../fileManager';
import { mergePDFs, downloadPDF, getPageCount, timestampedFilename } from '../pdfMerger';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { clearSession } from '../services/sessionRecovery';
import { useCrashRecovery } from '../hooks/useCrashRecovery';
import ToolPageLayout from '../components/ToolPageLayout';
import FileList from '../components/FileList';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import RecentFilesPanel from '../components/RecentFilesPanel';
import CrashRecoveryBanner from '../components/CrashRecoveryBanner';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/MergePDF.css';

export default function MergePDF() {
  const { user } = useAuth();
  const [files, setFiles]       = useState([]);
  const [progress, setProgress] = useState(0);
  const [progLabel, setProgLabel] = useState('');
  const [merging, setMerging]   = useState(false);
  const [error, setError]       = useState('');
  const [warning, setWarning]   = useState('');
  const [success, setSuccess]   = useState('');
  const [filename, setFilename] = useState('');
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');
  const fileInputRef = useRef(null);

  const {
    hasRecoveredData,
    recovering,
    recoverFiles,
    discardRecovery,
    saveFilesToCache,
    clearCache
  } = useCrashRecovery('merge_session');

  const handleFiles = useCallback(async (rawFiles) => {
    const { warnings } = addFiles(Array.from(rawFiles));
    if (warnings.length) setWarning(warnings.join(' | '));
    getFiles().forEach(entry => {
      if (entry.pages === null || entry.thumbnail === null) setFileStatus(entry.id, 'processing', 'Analyzing');
      if (entry.pages === null) {
        getPageCount(entry.file).then(n => {
          if (n !== null) {
            setPageCount(entry.id, n);
            setFileProgress(entry.id, 45);
            const cur = getFiles().find(f => f.id === entry.id);
            if (cur?.thumbnail) { setFileProgress(entry.id, 100); setFileStatus(entry.id, 'ready'); }
          }
        }).catch(() => setFileStatus(entry.id, 'error', 'Failed to read pages'));
      }
      if (entry.thumbnail === null) {
        generateThumbnail(entry.file).then(url => {
          if (url) {
            setThumbnail(entry.id, url);
            setFileProgress(entry.id, 75);
            const cur = getFiles().find(f => f.id === entry.id);
            if (cur?.pages !== null) { setFileProgress(entry.id, 100); setFileStatus(entry.id, 'ready'); }
          }
        }).catch(() => {
          const cur = getFiles().find(f => f.id === entry.id);
          if (cur?.pages !== null) { setFileProgress(entry.id, 100); setFileStatus(entry.id, 'ready'); }
          else setFileStatus(entry.id, 'error', 'Thumbnail failed');
        });
      }
    });
  }, []);

  React.useEffect(() => {
    const unsub = subscribe(list => {
      setFiles([...list]);
      saveFilesToCache(list.map(f => f.file));
    });
    return unsub;
  }, [saveFilesToCache]);

  const handleRestore = async () => {
    const session = await recoverFiles();
    if (session && session.files && session.files.length > 0) {
      handleFiles(session.files);
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) { setError('Add at least 2 PDF files.'); return; }
    setError(''); setWarning(''); setSuccess('');
    setMerging(true); setProgress(0);
    try {
      const name = timestampedFilename(filename.trim() || 'merged');
      const { bytes, warnings: w } = await mergePDFs(files, (p, lbl) => { setProgress(p); if (lbl) setProgLabel(lbl); });
      lastBytesRef.current = bytes;
      lastNameRef.current  = name;
      downloadPDF(bytes, name);
      if (w.length) setWarning(w.join(' | '));
      const pages = files.reduce((s, f) => s + (f.pages || 0), 0);
      setSuccess(`"${name}" · ${files.length} files${pages ? ' · ' + pages + ' pages' : ''}`);
      setFilename('');
      addRecentFile({ tool: 'merge', name, size: bytes?.byteLength || 0, pages });
      bumpLocalJob();
      await logUserAction(user, 'merge', { tool: 'merge', status: 'success', meta: { files: files.length, pages, outputName: name } });
      clearSession('merge_session');
    } catch (err) {
      setError('Merge failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'merge', { tool: 'merge', status: 'error', meta: { error: err?.message } });
    } finally { setMerging(false); setProgress(0); setProgLabel(''); }
  };

  const totalPages = files.reduce((s, f) => s + (f.pages || 0), 0);

  /* ── Sidebar content (scrollable top) ── */
  const sidebarContent = (
    <>
      <p className="ux-section-label">Merge Info</p>

      {/* Output filename */}
      <div className="ux-field">
        <label className="ux-label" htmlFor="mergeFilename">Output Filename</label>
        <div className="ux-input-with-ext">
          <input id="mergeFilename" className="ux-input-bare" type="text" value={filename}
            onChange={e => setFilename(e.target.value)} placeholder="merged" spellCheck={false} />
          <span className="ux-input-ext">.pdf</span>
        </div>
      </div>

      {/* Summary */}
      <div className="ux-summary">
        <div className="ux-summary-row"><span>Total Files</span><strong>{files.length}</strong></div>
        <div className="ux-summary-row"><span>Total Pages</span><strong>{totalPages || '—'}</strong></div>
      </div>

      {/* Alerts */}
      {warning && <div className="alert alert-warning" style={{ marginTop:10 }}><span>⚠ {warning}</span></div>}
      {error   && <div className="alert alert-error"   style={{ marginTop:10 }}><span>❌ {error}</span></div>}
      {merging  && <ProgressBar pct={progress} label={progLabel || 'Merging PDFs…'} />}

      {/* Success result */}
      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Merged Successfully!</p>
            <p className="ux-result-success-sub">{success}</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => downloadPDF(lastBytesRef.current, lastNameRef.current)}>
                ↓ Download Again
              </button>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Merged" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  /* ── Big bottom CTA ── */
  const actionButton = (
    <button
      className="ux-action-btn"
      onClick={handleMerge}
      disabled={merging || files.length < 2}
    >
      {merging ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Merging…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="8" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2.5"/>
          </svg>
          Merge PDFs
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Merge PDF"
      subtitle="Combine multiple PDFs into one. Drag to reorder."
      icon="🔗"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
      headerAction={
        files.length > 0 ? (
          <button className="ux-btn-secondary" onClick={() => { clearFiles(); setSuccess(''); setError(''); }}>
            Clear All
          </button>
        ) : null
      }
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="merge" />

      <input type="file" ref={fileInputRef} style={{ display:'none' }} accept=".pdf" multiple onChange={e => handleFiles(e.target.files)} />

      {hasRecoveredData && (
        <CrashRecoveryBanner
          onRestore={handleRestore}
          onDiscard={discardRecovery}
          recovering={recovering}
        />
      )}

      {/* Workspace: Drop zone + sortable file list */}
      {!files.length ? (
        <DropZone onFiles={handleFiles} multiple label="Drop PDFs to Merge" hint="Multiple PDFs supported · 200 MB Recommended each" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Drag to reorder files. Click × to remove.</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px', display:'flex', alignItems:'center', gap:6 }} onClick={() => fileInputRef.current?.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                Add More
              </button>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { clearFiles(); setSuccess(''); setError(''); }}>
                Clear All
              </button>
            </div>
          </div>

          <FileList
            files={files}
            onRemove={id => removeFile(id)}
            onClear={clearFiles}
            onReorder={() => setFiles([...getFiles()])}
          />
        </div>
      )}
      <ToolSeoContent toolKey="merge" />
      <RecentFilesPanel tool="merge" title="Recent merges" />
    </ToolPageLayout>
  );
}
