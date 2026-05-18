import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { PDFDocument } from 'pdf-lib';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/AddMargins.css';

const DEFAULT_MARGINS = { top: 24, right: 24, bottom: 24, left: 24 };

export default function AddMargins() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [margins, setMargins] = useState(DEFAULT_MARGINS);
  const [mode, setMode] = useState('add');
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
  };

  const updateMargin = (key, value) => {
    setMargins((prev) => ({ ...prev, [key]: Math.max(0, Number(value) || 0) }));
  };

  const handleMargin = async () => {
    if (!file) return;
    setWorking(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();

      const pages = srcDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const extraW = margins.left + margins.right;
        const extraH = margins.top + margins.bottom;

        const newWidth = mode === 'add' ? width + extraW : Math.max(40, width - extraW);
        const newHeight = mode === 'add' ? height + extraH : Math.max(40, height - extraH);
        const newPage = outDoc.addPage([newWidth, newHeight]);
        const embedded = await outDoc.embedPage(page);

        const x = mode === 'add' ? margins.left : Math.max(0, (newWidth - width) / 2);
        const y = mode === 'add' ? margins.bottom : Math.max(0, (newHeight - height) / 2);
        newPage.drawPage(embedded, { x, y, width, height });

        setProgress(Math.round(((i + 1) / pages.length) * 80));
      }

      const bytes = await outDoc.save();
      const name = file.name.replace(/\.pdf$/i, `_margins.pdf`);
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
      setSuccess('Margins applied.');
      addRecentFile({ tool: 'add_margins', name, size: bytes.byteLength || 0, pages: pages.length });
      bumpLocalJob();
      await logUserAction(user, 'add_margins', { tool: 'add_margins', status: 'success', meta: { mode, margins } });
    } catch (err) {
      setError('Margin update failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'add_margins', { tool: 'add_margins', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Margins</p>

      <div className="margins-grid">
        {['top', 'right', 'bottom', 'left'].map((key) => (
          <label className="ux-field" key={key}>
            <span>{key}</span>
            <input
              className="ux-input"
              type="number"
              min="0"
              value={margins[key]}
              onChange={(e) => updateMargin(key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <label className="ux-field" style={{ marginTop: 12 }}>
        <span>Mode</span>
        <select className="ux-select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="add">Add margins</option>
          <option value="trim">Trim margins</option>
        </select>
      </label>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Applying margins..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Updated</p>
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
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Add Margins" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Add Margins"
      subtitle="Add or trim margins across all pages."
      icon="A"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Applying...' : 'Apply Margins'}
      onAction={handleMargin}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="addMargins" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to update margins" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="margins-preview">
          <div className="margins-card">
            <div className="margins-card-title">Top</div>
            <div className="margins-card-value">{margins.top} pt</div>
          </div>
          <div className="margins-card">
            <div className="margins-card-title">Right</div>
            <div className="margins-card-value">{margins.right} pt</div>
          </div>
          <div className="margins-card">
            <div className="margins-card-title">Bottom</div>
            <div className="margins-card-value">{margins.bottom} pt</div>
          </div>
          <div className="margins-card">
            <div className="margins-card-title">Left</div>
            <div className="margins-card-value">{margins.left} pt</div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="addMargins" />
      <RecentFilesPanel tool="add_margins" title="Recent margin updates" />
    </ToolPageLayout>
  );
}
