import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/SanitizeMetadata.css';

export default function SanitizeMetadata() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setLastBytes(null);
    setLastName('');
    setThumbnail(null);
    generateThumbnail(f).then((url) => setThumbnail(url));
  };

  const handleSanitize = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(20);

    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setProgress(50);
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator('');
      pdfDoc.setProducer('');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());
      const bytes = await pdfDoc.save();
      setProgress(100);

      const name = file.name.replace(/\.pdf$/i, '_sanitized.pdf');
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      setLastBytes(bytes);
      setLastName(name);
      setSuccess('Metadata removed.');
      addRecentFile({ tool: 'sanitize_meta', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'sanitize_meta', { tool: 'sanitize_meta', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Sanitizing failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'sanitize_meta', { tool: 'sanitize_meta', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Sanitize Settings</p>
      <div className="sanitize-card">
        <div className="sanitize-title">Fields Removed</div>
        <ul>
          <li>Title, Author, Subject</li>
          <li>Keywords</li>
          <li>Creator and Producer</li>
        </ul>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Sanitizing metadata..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Sanitized</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const blob = new Blob([lastBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = lastName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Sanitized" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Sanitize Metadata"
      subtitle="Remove identifying metadata before sharing."
      icon="S"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Sanitizing...' : 'Sanitize PDF'}
      onAction={handleSanitize}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="sanitizeMeta" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to sanitize" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Sanitize metadata with one click.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div className="sanitize-preview">
            <div className="sanitize-thumb">
              {thumbnail ? <img src={thumbnail} alt="PDF preview" /> : <div className="sanitize-thumb-placeholder" />}
            </div>
            <div className="sanitize-info">
              <div className="sanitize-name">{file.name}</div>
              <div className="sanitize-sub">{formatBytes(file.size)}</div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="sanitizeMeta" />
      <RecentFilesPanel tool="sanitize_meta" title="Recent sanitizations" />
    </ToolPageLayout>
  );
}
