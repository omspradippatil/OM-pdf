import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { PDFDocument, degrees } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/AutoRotateDeskew.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function AutoRotateDeskew() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [pages, setPages] = useState(null);
  const [rotateLandscape, setRotateLandscape] = useState(true);
  const [deskew, setDeskew] = useState(0);
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
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPages(doc.getPageCount());
    } catch {
      setPages(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const list = pdfDoc.getPages();
      const total = list.length;
      const skew = clamp(parseFloat(deskew) || 0, -5, 5);

      list.forEach((page, idx) => {
        const { width, height } = page.getSize();
        let rotation = page.getRotation().angle || 0;
        if (rotateLandscape && width > height) {
          rotation = (rotation + 90) % 360;
        }
        if (skew) {
          rotation += skew;
        }
        page.setRotation(degrees(rotation));
        setProgress(Math.round(((idx + 1) / total) * 90));
      });

      const bytes = await pdfDoc.save();
      const name = file.name.replace(/\.pdf$/i, '_autorotated.pdf');
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
      setProgress(100);
      setSuccess('Auto-rotate complete.');
      addRecentFile({ tool: 'auto_rotate', name, size: bytes.byteLength || 0, pages: total });
      bumpLocalJob();
      await logUserAction(user, 'auto_rotate', { tool: 'auto_rotate', status: 'success', meta: { rotateLandscape, deskew: skew } });
    } catch (err) {
      setError('Auto-rotate failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'auto_rotate', { tool: 'auto_rotate', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Rotation Settings</p>

      <div className="ux-toggle-row">
        <div className="ux-toggle-info">
          <p>Rotate landscape pages</p>
          <span>Turns wide pages to portrait</span>
        </div>
        <label className="ux-toggle">
          <input type="checkbox" checked={rotateLandscape} onChange={(e) => setRotateLandscape(e.target.checked)} />
          <span className="ux-toggle-slider" />
        </label>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="deskew">Deskew angle (deg)</label>
        <input id="deskew" className="ux-input" type="number" min={-5} max={5} step={0.25} value={deskew} onChange={(e) => setDeskew(e.target.value)} />
        <p className="auto-rotate-note">Deskew applies a small rotation to all pages.</p>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Auto-rotating..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Rotation done</p>
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
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Auto Rotate" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Auto Rotate and Deskew"
      subtitle="Best-effort auto-rotation with optional deskew angle."
      icon="R"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Processing...' : 'Auto Rotate PDF'}
      onAction={handleProcess}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="autoRotate" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to auto-rotate" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Apply smart rotation and optional deskew.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div className="auto-rotate-preview">
            <div className="auto-rotate-thumb">
              {thumbnail ? <img src={thumbnail} alt="PDF preview" /> : <div className="auto-rotate-thumb-placeholder" />}
            </div>
            <div className="auto-rotate-info">
              <div className="auto-rotate-name">{file.name}</div>
              <div className="auto-rotate-sub">{formatBytes(file.size)} - {pages || '-'} pages</div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="autoRotate" />
      <RecentFilesPanel tool="auto_rotate" title="Recent auto-rotations" />
    </ToolPageLayout>
  );
}
