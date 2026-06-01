import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import FileList from '../components/FileList';
import { unlockPdf } from '../utils/pdfGuard';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import RecentFilesPanel from '../components/RecentFilesPanel';
import '../styles/UnlockPDF.css';

export default function UnlockPDF() {
  const { user } = useAuth();
  const [files, setFiles]       = useState([]);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [progress, setProgress] = useState(0);
  const [working, setWorking]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');
  const isZipRef     = useRef(false);

  const loadFiles = (raw) => {
    const valid = Array.from(raw).filter(f => f.type === 'application/pdf');
    if (!valid.length) { setError('Select at least one valid PDF.'); return; }
    
    const newFiles = valid.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name,
      size: f.size
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setError(''); setSuccess(''); setProgress(0);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUnlock = async () => {
    if (!files.length) return;
    if (!password) { setError('Please enter the current password.'); return; }
    setError(''); setSuccess(''); setWorking(true); setProgress(0);
    try {
      if (files.length === 1) {
        setProgress(30);
        const fileObj = files[0].file;
        const buffer = await fileObj.arrayBuffer();
        setProgress(60);
        const inputData = new Uint8Array(buffer);
        const outputData = await unlockPdf(inputData, password);
        setProgress(90);
        const name = fileObj.name.replace(/\.pdf$/i, '_unlocked.pdf');
        const blob = new Blob([outputData], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.body.appendChild(document.createElement('a'));
        a.href = url; a.download = name; a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        lastBytesRef.current = outputData; lastNameRef.current = name; isZipRef.current = false;
        setSuccess('PDF successfully unlocked!');
        setProgress(100);
        addRecentFile({ tool: 'unlock', name, size: outputData.byteLength || 0 });
        bumpLocalJob();
        await logUserAction(user, 'unlock', { tool: 'unlock', status: 'success', meta: { outputName: name, batch: false } });
      } else {
        const zip = new JSZip();
        const folder = zip.folder('Unlocked_PDFs');
        
        for (let i = 0; i < files.length; i++) {
          const fileObj = files[i].file;
          const buffer = await fileObj.arrayBuffer();
          const inputData = new Uint8Array(buffer);
          
          setProgress(Math.round(((i + 0.5) / files.length) * 90));
          const outputData = await unlockPdf(inputData, password);
          
          folder.file(fileObj.name.replace(/\.pdf$/i, '_unlocked.pdf'), outputData);
          setProgress(Math.round(((i + 1) / files.length) * 90));
        }
        
        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        setProgress(100);
        
        const zipName = `unlocked_batch_${Date.now()}.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a'); a.href = url; a.download = zipName;
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        lastBytesRef.current = zipBlob; lastNameRef.current = zipName; isZipRef.current = true;
        setSuccess(`Successfully unlocked ${files.length} files!`);
        
        addRecentFile({ tool: 'unlock_batch', name: zipName, size: zipBlob.size });
        bumpLocalJob();
        await logUserAction(user, 'unlock', { tool: 'unlock', status: 'success', meta: { outputName: zipName, batch: true, count: files.length } });
      }
    } catch (err) {
      setError('Incorrect password or file is not encrypted.');
    } finally { setWorking(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Unlock Settings</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="unlockPass">Current Password</label>
        <div className="ux-input-with-ext" style={{ paddingRight: 8 }}>
          <input
            id="unlockPass"
            className="ux-input-bare"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password to unlock…"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px', fontSize: '1.2rem' }}
          >
            {showPass ? '🙈' : '👁'}
          </button>
        </div>
        <p className="ux-hint" style={{ marginTop: 8 }}>We never store your passwords. Everything happens locally.</p>
      </div>

      <div className="ux-option-card selected">
        <div className="ux-option-title">🔓 Remove Restrictions</div>
        <div className="ux-option-desc">This will create a new copy of your PDF without any password protection.</div>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Unlocking document…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Unlocked!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                 const blob = isZipRef.current ? lastBytesRef.current : new Blob([lastBytesRef.current], { type: 'application/pdf' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a'); a.href = url; a.download = lastNameRef.current;
                 a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>↓ Download</button>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Unlocked" mimeType={isZipRef.current ? "application/zip" : "application/pdf"} />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleUnlock} disabled={working || !files.length}>
      {working ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Unlocking…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
             <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2.5"/>
             <path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Unlock PDF
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Unlock PDF"
      subtitle="Remove password protection from any PDF file. 100% local."
      icon="🔓"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="unlock" />

      {!files.length ? (
        <DropZone onFiles={loadFiles} label="Drop locked PDF(s) to unlock" hint="Multiple PDFs supported · 200 MB Recommended" multiple />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{files.length} file{files.length > 1 ? 's' : ''} ready to unlock.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px', cursor: 'pointer' }}>
                Add More
                <input type="file" multiple accept=".pdf" style={{ display: 'none' }} onChange={(e) => loadFiles(e.target.files)} />
              </label>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFiles([]); setSuccess(''); setError(''); setPassword(''); }}>
                Clear All
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <FileList 
              files={files} 
              onRemove={removeFile}
              onClear={() => setFiles([])}
            />
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="unlock" />
      <RecentFilesPanel tool="unlock" title="Recent security edits" />
    </ToolPageLayout>
  );
}
