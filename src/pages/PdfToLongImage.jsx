import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/PdfToLongImage.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

async function renderLongImage(file, options, onProgress) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const total = pdf.numPages;
  const canvases = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: options.scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    canvases.push(canvas);
    totalHeight += canvas.height;
    maxWidth = Math.max(maxWidth, canvas.width);
    onProgress?.(Math.round((i / total) * 80));
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = maxWidth;
  outCanvas.height = totalHeight;
  const outCtx = outCanvas.getContext('2d');

  if (options.format === 'jpg') {
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  }

  let y = 0;
  canvases.forEach((canvas) => {
    const x = Math.floor((maxWidth - canvas.width) / 2);
    outCtx.drawImage(canvas, x, y);
    y += canvas.height;
  });

  const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = options.format === 'png' ? 1 : options.quality;
  const blob = await new Promise((resolve) => outCanvas.toBlob(resolve, mime, quality));
  if (!blob) throw new Error('Failed to render long image.');

  return blob;
}

export default function PdfToLongImage() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [pages, setPages] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(0.9);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBlob, setLastBlob] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setLastBlob(null);
    setLastName('');
    setThumbnail(null);

    generateThumbnail(f).then((url) => setThumbnail(url));
    try {
      const buf = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPages(doc.numPages);
    } catch {
      setPages(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const safeScale = clamp(parseFloat(scale) || 1.5, 1, 2.5);
      const safeQuality = clamp(parseFloat(quality) || 0.9, 0.7, 0.98);
      const blob = await renderLongImage(file, { scale: safeScale, format, quality: safeQuality }, setProgress);
      const baseName = file.name.replace(/\.pdf$/i, '');
      const name = `${baseName}_long.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      setLastBlob(blob);
      setLastName(name);
      setProgress(100);
      setSuccess('Long image exported.');
      addRecentFile({ tool: 'long_image', name, size: blob.size || 0, pages });
      bumpLocalJob();
      await logUserAction(user, 'long_image', { tool: 'long_image', status: 'success', meta: { pages, scale: safeScale, format } });
    } catch (err) {
      setError('Conversion failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'long_image', { tool: 'long_image', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Output Settings</p>

      <div className="ux-field">
        <label className="ux-label">Format</label>
        <div className="long-toggle">
          <button type="button" className={format === 'png' ? 'active' : ''} onClick={() => setFormat('png')}>PNG</button>
          <button type="button" className={format === 'jpg' ? 'active' : ''} onClick={() => setFormat('jpg')}>JPG</button>
        </div>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="longScale">Scale (1x to 2.5x)</label>
        <input id="longScale" className="ux-input" type="number" min={1} max={2.5} step={0.25} value={scale} onChange={(e) => setScale(e.target.value)} />
      </div>

      {format === 'jpg' && (
        <div className="ux-field">
          <label className="ux-label" htmlFor="longQuality">JPG Quality</label>
          <input id="longQuality" className="long-range" type="range" min={0.7} max={0.98} step={0.02} value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} />
          <div className="long-range-value">{Math.round(quality * 100)}%</div>
        </div>
      )}

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      <div className="long-note">Large PDFs can create very big images. Reduce scale if needed.</div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Rendering long image..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Image ready</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const url = URL.createObjectURL(lastBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = lastName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download</button>
              <SaveToDriveButton bytes={lastBlob} filename={lastName} toolFolder="Long Image" mimeType={format === 'png' ? 'image/png' : 'image/jpeg'} />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="PDF to Long Image"
      subtitle="Export all pages into a single vertical image."
      icon="L"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Rendering...' : 'Create Long Image'}
      onAction={handleConvert}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="longImage" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to convert" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Export a single scrollable image.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div className="long-preview">
            <div className="long-thumb">
              {thumbnail ? <img src={thumbnail} alt="PDF preview" /> : <div className="long-thumb-placeholder" />}
            </div>
            <div className="long-info">
              <div className="long-name">{file.name}</div>
              <div className="long-sub">{formatBytes(file.size)} - {pages || '-'} pages</div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="longImage" />
      <RecentFilesPanel tool="long_image" title="Recent long images" />
    </ToolPageLayout>
  );
}
