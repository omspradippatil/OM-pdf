import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/ResizePages.css';

const PAGE_PRESETS = {
  Letter: { w: 612, h: 792 },
  A4: { w: 595.28, h: 841.89 },
  A5: { w: 419.53, h: 595.28 },
  Legal: { w: 612, h: 1008 },
  Tabloid: { w: 792, h: 1224 },
};

export default function ResizePages() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState('A4');
  const [mode, setMode] = useState('fit');
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

  const handleResize = async () => {
    if (!file) return;
    setWorking(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      const helv = await outDoc.embedFont(StandardFonts.Helvetica);
      const pages = srcDoc.getPages();
      const preset = PAGE_PRESETS[target];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const newPage = outDoc.addPage([preset.w, preset.h]);
        const embedded = await outDoc.embedPage(page);

        const scaleFit = Math.min(preset.w / width, preset.h / height);
        const scaleFill = Math.max(preset.w / width, preset.h / height);
        const scale = mode === 'fill' ? scaleFill : scaleFit;
        const drawW = width * scale;
        const drawH = height * scale;
        const x = (preset.w - drawW) / 2;
        const y = (preset.h - drawH) / 2;

        newPage.drawPage(embedded, { x, y, width: drawW, height: drawH });
        if (mode === 'fit') {
          const label = `${target} (${Math.round(preset.w)}x${Math.round(preset.h)}pt)`;
          newPage.drawText(label, { x: 18, y: 18, size: 9, font: helv, color: outDoc.context.obj([0.4, 0.4, 0.4]) });
        }

        setProgress(Math.round(((i + 1) / pages.length) * 80));
      }

      const bytes = await outDoc.save();
      const name = file.name.replace(/\.pdf$/i, `_resized_${target}.pdf`);
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
      setSuccess('Pages resized.');
      addRecentFile({ tool: 'resize_pages', name, size: bytes.byteLength || 0, pages: pages.length });
      bumpLocalJob();
      await logUserAction(user, 'resize_pages', { tool: 'resize_pages', status: 'success', meta: { preset: target, mode } });
    } catch (err) {
      setError('Resize failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'resize_pages', { tool: 'resize_pages', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Resize Options</p>

      <div className="resize-panel">
        <label className="ux-field">
          <span>Preset</span>
          <select className="ux-select" value={target} onChange={(e) => setTarget(e.target.value)}>
            {Object.keys(PAGE_PRESETS).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>
        <label className="ux-field">
          <span>Mode</span>
          <select className="ux-select" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="fit">Fit (no crop)</option>
            <option value="fill">Fill (may crop)</option>
          </select>
        </label>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Resizing pages..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Resized</p>
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
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Resize Pages" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Resize Pages"
      subtitle="Normalize page sizes to common presets."
      icon="R"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Resizing...' : 'Resize Pages'}
      onAction={handleResize}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="resizePages" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to resize" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="resize-workspace">
          <div className="resize-card">
            <div className="resize-card-label">Target</div>
            <div className="resize-card-value">{target}</div>
          </div>
          <div className="resize-card">
            <div className="resize-card-label">Mode</div>
            <div className="resize-card-value">{mode === 'fit' ? 'Fit' : 'Fill'}</div>
          </div>
          <div className="resize-card">
            <div className="resize-card-label">Ready</div>
            <div className="resize-card-value">Click resize to apply</div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="resizePages" />
      <RecentFilesPanel tool="resize_pages" title="Recent resized PDFs" />
    </ToolPageLayout>
  );
}
