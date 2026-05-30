import React, { useState, useRef } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { applyPermissions } from '../utils/pdfGuard';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { generateThumbnail } from '../thumbnailGenerator';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/PermissionsPDF.css';

export default function PermissionsPDF() {
  const { user } = useAuth();
  const [file, setFile]               = useState(null);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [permissions, setPermissions] = useState({ print:'full', modify:'all', extract:true });
  const [progress, setProgress]       = useState(0);
  const [working, setWorking]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [thumbnail, setThumbnail]     = useState(null);
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0); setThumbnail(null);
    generateThumbnail(f).then(url => setThumbnail(url));
  };

  const handleApplyPermissions = async () => {
    if (!file) return;
    if (!ownerPassword) { setError('Please set an owner password to enforce restrictions.'); return; }
    setError(''); setSuccess(''); setWorking(true); setProgress(20);
    try {
      const buffer = await file.arrayBuffer();
      setProgress(40);
      const inputData  = new Uint8Array(buffer);
      const outputData = await applyPermissions(inputData, {
        ownerPassword,
        permissions: {
          printing: permissions.print === 'full' ? 'full' : (permissions.print === 'low' ? 'low' : 'none'),
          modifying: permissions.modify === 'all' ? 'all' : 'none',
          copying: permissions.extract,
        }
      });
      setProgress(90);
      const name = file.name.replace(/\.pdf$/i, '_restricted.pdf');
      const blob = new Blob([outputData], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.body.appendChild(document.createElement('a'));
      a.href = url; a.download = name; a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      lastBytesRef.current = outputData; lastNameRef.current = name;
      setSuccess('Restrictions applied successfully!');
      setProgress(100);
      addRecentFile({ tool:'permissions', name, size:outputData.byteLength||0 });
      bumpLocalJob();
      await logUserAction(user, 'permissions', { tool:'permissions', status:'success', meta:{ outputName:name, restrictions:permissions } });
    } catch (err) {
      setError('Failed to apply permissions. ' + err.message);
    } finally { setWorking(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Security Settings</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="ownerPass">Owner Password</label>
        <div className="ux-input-with-ext" style={{ paddingRight: 8 }}>
          <input
            id="ownerPass"
            className="ux-input-bare"
            type={showPass ? 'text' : 'password'}
            value={ownerPassword}
            onChange={e => setOwnerPassword(e.target.value)}
            placeholder="Required to lock settings…"
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
      </div>

      <p className="ux-section-label" style={{ marginTop:20 }}>Permissions</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="prmPrint">Allow Printing</label>
        <select id="prmPrint" className="ux-input" value={permissions.print} onChange={e => setPermissions(p => ({ ...p, print: e.target.value }))}>
          <option value="full">Full Resolution</option>
          <option value="low">Low Resolution Only</option>
          <option value="none">Disabled</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="prmModify">Allow Modification</label>
        <select id="prmModify" className="ux-input" value={permissions.modify} onChange={e => setPermissions(p => ({ ...p, modify: e.target.value }))}>
          <option value="all">Full Editing</option>
          <option value="none">Disabled</option>
        </select>
      </div>

      <div className="ux-toggle-row">
        <div className="ux-toggle-info">
          <p>Text/Image Extraction</p>
          <span>Enable copy-paste from PDF</span>
        </div>
        <label className="ux-toggle">
          <input type="checkbox" checked={permissions.extract} onChange={e => setPermissions(p => ({ ...p, extract: e.target.checked }))} />
          <span className="ux-toggle-slider" />
        </label>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Applying policies…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Secured!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
               <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                 const blob = new Blob([lastBytesRef.current], { type: 'application/pdf' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a'); a.href = url; a.download = lastNameRef.current;
                 a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>↓ Download</button>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Secured" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApplyPermissions} disabled={working || !file}>
      {working ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Restricting…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="9" y="11" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2.5"/>
          </svg>
          Apply Restrictions
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="PDF Permissions"
      subtitle="Restrict printing, editing, and copying. 100% local."
      icon="🔐"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="permissions" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to set permissions" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Configure restrictions in the right panel.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); setOwnerPassword(''); setThumbnail(null); }}>
              Remove File
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, minHeight:280, gap:14, background:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)' }}>
            <div className="ux-page-card" style={{ width: '220px', cursor: 'default' }}>
              <div className="ux-page-thumb-wrap" style={{ height: '300px' }}>
                {thumbnail ? <img className="ux-page-thumb-img" src={thumbnail} alt="PDF Preview" /> : <div className="ux-page-thumb-placeholder" />}
              </div>
            </div>
            <p style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)', margin:0 }}>{file.name}</p>
            <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', margin:0 }}>{formatBytes(file.size)} · Document ready</p>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="permissions" />
      <RecentFilesPanel tool="permissions" title="Recent security edits" />
    </ToolPageLayout>
  );
}
