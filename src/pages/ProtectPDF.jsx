import React, { useState, useRef } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { protectPdf } from '../utils/pdfGuard';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';
import '../styles/ProtectPDF.css';

export default function ProtectPDF() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleProtect = async () => {
    if (!file) return;
    if (!password) { setError('Please enter a password.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(20);

    try {
      const buffer = await file.arrayBuffer();
      setProgress(40);
      
      const inputData = new Uint8Array(buffer);
      
      const args = {
        userPassword: password,
        ownerPassword: password,
      };
      
      const outputData = await protectPdf(inputData, args);
      setProgress(90);
      
      const name = file.name.replace(/\.pdf$/i, '_protected.pdf');
      const blob = new Blob([outputData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement('a'));
      a.href = url; a.download = name; a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      lastBytesRef.current = outputData;
      lastNameRef.current = name;
      setSuccess(`"${name}" encrypted with AES-256!`);
      setProgress(100);

      addRecentFile({ tool: 'protect', name, size: outputData.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'protect', { tool: 'protect', status: 'success', meta: { outputName: name, encryption: 'AES-256' } });
    } catch (err) {
      setError(err.message || 'Protection failed. Please try again.');
      await logUserAction(user, 'protect', { tool: 'protect', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  return (
    <ToolPageLayout
      title="Protect PDF"
      subtitle="Secure your PDF files with military-grade AES-256 encryption right in your browser."
      icon="🛡️"
    >
      <SEO
        keywords="protect pdf, encrypt pdf aes-256, secure pdf password, private pdf encryption"
        title="Protect PDF Online Free — Strong AES-256 Encryption | OM PDF"
        description="Add a strong password to your PDF files using AES-256 encryption. 100% private local processing — your files never leave your device."
        url="https://om-pdf.netlify.app/protect-pdf"
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to protect" hint="Single PDF - Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span></div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); setPassword(''); setConfirmPassword(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-option-panel">
            <div className="protect-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="pass">Set Password</label>
                <input
                  id="pass"
                  className="split-range-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter secure password..."
                  style={{ padding: '12px 16px' }}
                />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="confirm">Confirm Password</label>
                <input
                  id="confirm"
                  className="split-range-input"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password..."
                  style={{ padding: '12px 16px' }}
                />
              </div>
            </div>
            <div className="alert alert-warning" style={{ marginTop: 20 }}>
              <span>ℹ️ Using <strong>AES-256 bit</strong> encryption. Make sure to remember your password!</span>
            </div>
          </div>

          {error && <div className="alert alert-error"><span>! {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {working && <ProgressBar pct={progress} label="Encrypting PDF with AES-256..." />}

          {success && (
            <SuccessBanner message="PDF Protected!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Protected" />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button
              className="btn-merge"
              style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}
              onClick={handleProtect}
              disabled={working}
            >
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Encrypt PDF
              </span>
            </button>
            <p className="merge-hint">🔒 Secure local processing - Your file never leaves your device</p>
          </div>
        </div>
      )}

      <RecentFilesPanel tool="protect" title="Recent protections" />
    </ToolPageLayout>
  );
}
