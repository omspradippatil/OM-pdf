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
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/FlattenForms.css';

export default function FlattenForms() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const [fieldCount, setFieldCount] = useState(0);
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
    setFieldCount(0);
    generateThumbnail(f).then((url) => setThumbnail(url));

    try {
      const buf = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const form = pdfDoc.getForm();
      setFieldCount(form.getFields().length);
    } catch {
      setFieldCount(0);
    }
  };

  const handleFlatten = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(20);

    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setProgress(50);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      if (fields.length) form.flatten();
      const bytes = await pdfDoc.save();
      setProgress(100);

      const name = file.name.replace(/\.pdf$/i, '_flattened.pdf');
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
      setSuccess(fields.length ? 'Form fields flattened.' : 'No form fields found. Exported as-is.');
      addRecentFile({ tool: 'flatten_forms', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'flatten_forms', { tool: 'flatten_forms', status: 'success', meta: { fields: fields.length } });
    } catch (err) {
      setError('Flatten failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'flatten_forms', { tool: 'flatten_forms', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Flatten Settings</p>
      <div className="flatten-card">
        <div className="flatten-title">What this does</div>
        <p>Converts interactive form fields into static content so values cannot be edited.</p>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Form Fields</span><strong>{fieldCount}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Flattening form fields..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Flattened</p>
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
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Flattened" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Flatten PDF Forms"
      subtitle="Lock form fields so they cannot be edited."
      icon="F"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Flattening...' : 'Flatten PDF'}
      onAction={handleFlatten}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="flattenForms" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF with form fields" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Flatten fields and export a locked version.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div className="flatten-preview">
            <div className="flatten-thumb">
              {thumbnail ? <img src={thumbnail} alt="PDF preview" /> : <div className="flatten-thumb-placeholder" />}
            </div>
            <div className="flatten-info">
              <div className="flatten-name">{file.name}</div>
              <div className="flatten-sub">{formatBytes(file.size)}</div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="flattenForms" />
      <RecentFilesPanel tool="flatten_forms" title="Recent form flattening" />
    </ToolPageLayout>
  );
}
