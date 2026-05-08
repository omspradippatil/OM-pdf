import React, { useState, useRef } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { protectPdf, applyPermissions } from '../utils/pdfGuard';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';

export default function PermissionsPDF() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [permissions, setPermissions] = useState({
    print: 'full', // none, low, full
    modify: 'all', // none, all, annotate, form, assembly
    extract: true, // y/n
  });
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastBytesRef = useRef(null);
  const lastNameRef = useRef('');

  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: working ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: working ? progress : success ? 100 : 0,
    etaMs: file.size ? Math.max(1000, Math.round((file.size / (1024 * 1024)) * 1200)) : null,
    message: error || '',
  }] : [];

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setProgress(0);
  };

  const handleApplyPermissions = async () => {
    if (!file) return;
    if (!ownerPassword) { setError('Please set an owner password to enforce restrictions.'); return; }

    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(20);

    try {
      const buffer = await file.arrayBuffer();
      setProgress(40);
      
      const inputData = new Uint8Array(buffer);
      
      const outputData = await applyPermissions(inputData, {
        ownerPassword,
        permissions: {
          printing: permissions.print === 'full' ? 'full' : (permissions.print === 'low' ? 'low' : 'none'),
          modifying: permissions.modify === 'all' ? 'all' : (permissions.modify === 'none' ? 'none' : 'all'),
          copying: permissions.extract
        }
      });
      setProgress(90);
      
      const name = file.name.replace(/\.pdf$/i, '_restricted.pdf');
      const blob = new Blob([outputData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement('a'));
      a.href = url; a.download = name; a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      lastBytesRef.current = outputData;
      lastNameRef.current = name;
      setSuccess(`Permissions applied successfully!`);
      setProgress(100);

      addRecentFile({ tool: 'permissions', name, size: outputData.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'permissions', { tool: 'permissions', status: 'success', meta: { outputName: name, restrictions: permissions } });
    } catch (err) {
      setError('Failed to apply permissions. ' + err.message);
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  return (
    <ToolPageLayout
      title="PDF Permissions"
      subtitle="Restrict printing, editing, and copying in your PDFs using AES-256 security."
      icon="🔐"
    >
      <SEO
        keywords="pdf permissions, restrict pdf printing, prevent pdf editing, pdf security settings"
        title="PDF Permissions Editor — Restrict Printing & Copying | OM PDF"
        description="Set granular permissions for your PDF files. Disable printing, text extraction, and editing locally in your browser."
        url="https://om-pdf.netlify.app/pdf-permissions"
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to set permissions" hint="Single PDF - Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span></div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); setOwnerPassword(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-option-panel">
            <div className="pn-option-group" style={{ marginBottom: 20 }}>
              <label className="split-label" htmlFor="ownerPass">Owner Password (Required to enforce restrictions)</label>
              <input
                id="ownerPass"
                className="split-range-input"
                type="password"
                value={ownerPassword}
                onChange={e => setOwnerPassword(e.target.value)}
                placeholder="Enter password to lock settings..."
                style={{ padding: '12px 16px' }}
              />
            </div>

            <div className="permissions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="pn-option-group">
                <label className="split-label">Allow Printing</label>
                <select 
                  className="split-range-input" 
                  value={permissions.print} 
                  onChange={e => setPermissions(p => ({ ...p, print: e.target.value }))}
                  style={{ padding: '10px' }}
                >
                  <option value="full">Full Resolution</option>
                  <option value="low">Low Resolution Only</option>
                  <option value="none">Disabled</option>
                </select>
              </div>
              <div className="pn-option-group">
                <label className="split-label">Allow Modification</label>
                <select 
                  className="split-range-input" 
                  value={permissions.modify} 
                  onChange={e => setPermissions(p => ({ ...p, modify: e.target.value }))}
                  style={{ padding: '10px' }}
                >
                  <option value="all">Full Editing</option>
                  <option value="annotate">Commenting Only</option>
                  <option value="form">Form Filling Only</option>
                  <option value="assembly">Page Assembly Only</option>
                  <option value="none">Disabled</option>
                </select>
              </div>
            </div>

            <div className="pn-option-group" style={{ marginTop: 20 }}>
              <label className="flex-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={permissions.extract} 
                  onChange={e => setPermissions(p => ({ ...p, extract: e.target.checked }))}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Allow text and image extraction (Copy/Paste)</span>
              </label>
            </div>
          </div>

          {error && <div className="alert alert-error"><span>! {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {working && <ProgressBar pct={progress} label="Applying security policies..." />}

          {success && (
            <SuccessBanner message="Permissions Applied!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Secured" />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button
              className="btn-merge"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}
              onClick={handleApplyPermissions}
              disabled={working}
            >
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="11" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
                Apply Restrictions
              </span>
            </button>
            <p className="merge-hint">🔒 Secure local processing - Your files are never uploaded</p>
          </div>
        </div>
      )}

      <RecentFilesPanel tool="permissions" title="Recent security updates" />
    </ToolPageLayout>
  );
}
