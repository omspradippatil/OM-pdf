import React, { useState, useRef } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { unlockPdf } from '../utils/pdfGuard';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';

export default function UnlockPDF() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
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
    etaMs: file.size ? Math.max(800, Math.round((file.size / (1024 * 1024)) * 1000)) : null,
    message: error || '',
  }] : [];

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setProgress(0);
    setPassword('');
  };

  const handleUnlock = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(20);

    try {
      const buffer = await file.arrayBuffer();
      setProgress(40);
      
      const inputData = new Uint8Array(buffer);
      
      const outputData = await unlockPdf(inputData, password);
      setProgress(90);
      
      const name = file.name.replace(/\.pdf$/i, '_unlocked.pdf');
      const blob = new Blob([outputData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement('a'));
      a.href = url; a.download = name; a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      lastBytesRef.current = outputData;
      lastNameRef.current = name;
      setSuccess(`"${name}" unlocked and encryption removed!`);
      setProgress(100);

      addRecentFile({ tool: 'unlock', name, size: outputData.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'unlock', { tool: 'unlock', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Unlock failed. Please ensure the password is correct.');
      await logUserAction(user, 'unlock', { tool: 'unlock', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  return (
    <ToolPageLayout
      title="Unlock PDF"
      subtitle="Remove passwords and encryption from your PDF files instantly in your browser."
      icon="🔓"
    >
      <SEO
        keywords="unlock pdf, remove pdf password, decrypt pdf online, pdf security removal"
        title="Unlock PDF Online Free — Remove Password Protection | OM PDF"
        description="Decrypt and remove passwords from your PDF files. 100% private local processing using QPDF WASM — your files never leave your device."
        url="https://om-pdf.netlify.app/unlock-pdf"
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a protected PDF to unlock" hint="Single PDF - Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span></div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); setPassword(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-option-panel">
            <label className="split-label" htmlFor="pass">PDF Password</label>
            <input
              id="pass"
              className="split-range-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password to decrypt..."
              style={{ padding: '12px 16px' }}
            />
            <p className="split-hint">If the PDF is encrypted, enter the password to remove all restrictions.</p>
          </div>

          {error && <div className="alert alert-error"><span>! {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {working && <ProgressBar pct={progress} label="Decrypting PDF..." />}

          {success && (
            <SuccessBanner message="PDF Unlocked!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Unlocked" />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button
              className="btn-merge"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
              onClick={handleUnlock}
              disabled={working}
            >
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor"/></svg>
                Unlock PDF
              </span>
            </button>
            <p className="merge-hint">🔒 Secure local decryption - Your password never leaves your browser</p>
          </div>
        </div>
      )}

      <RecentFilesPanel tool="unlock" title="Recent unlocks" />
    </ToolPageLayout>
  );
}
