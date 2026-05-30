import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/GrayscalePDF.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

async function buildGrayscalePdf(file, options, onProgress) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const outDoc = await PDFDocument.create();
  const total = pdf.numPages;

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: options.scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let p = 0; p < data.length; p += 4) {
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      data[p] = gray;
      data[p + 1] = gray;
      data[p + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', options.quality));
    if (!blob) throw new Error('Failed to render grayscale page.');

    const imgBytes = await blob.arrayBuffer();
    const img = await outDoc.embedJpg(imgBytes);
    const outPage = outDoc.addPage([img.width, img.height]);
    outPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });

    onProgress?.(Math.round((i / total) * 90));
    await new Promise((r) => setTimeout(r, 0));
  }

  return outDoc.save();
}

export default function GrayscalePDF() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(0.9);
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
      const safeScale = clamp(parseFloat(scale) || 2, 1, 3);
      const safeQuality = clamp(parseFloat(quality) || 0.9, 0.7, 0.98);
      const bytes = await buildGrayscalePdf(file, { scale: safeScale, quality: safeQuality }, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_grayscale.pdf');
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
      setSuccess('Grayscale PDF created.');
      addRecentFile({ tool: 'grayscale', name, size: bytes.byteLength || 0, pages });
      bumpLocalJob();
      await logUserAction(user, 'grayscale', { tool: 'grayscale', status: 'success', meta: { pages, scale: safeScale, quality: safeQuality } });
    } catch (err) {
      setError('Conversion failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'grayscale', { tool: 'grayscale', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Output Settings</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="grayScale">Scale (1x to 3x)</label>
        <input id="grayScale" className="ux-input" type="number" min={1} max={3} step={0.5} value={scale} onChange={(e) => setScale(e.target.value)} />
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="grayQuality">JPG Quality</label>
        <input id="grayQuality" className="gray-range" type="range" min={0.7} max={0.98} step={0.02} value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} />
        <div className="gray-range-value">{Math.round(quality * 100)}%</div>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      <div className="gray-note">Output is rasterized for consistent grayscale printing.</div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Converting to grayscale..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Grayscale ready!</p>
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
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Grayscale" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Grayscale PDF"
      subtitle="Create printer-friendly grayscale PDFs locally."
      icon="G"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Converting...' : 'Create Grayscale PDF'}
      onAction={handleConvert}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="grayscale" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to convert" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Preview the first page and export in grayscale.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div className="gray-preview">
            <div className="gray-card">
              <div className="gray-thumb">
                {thumbnail ? <img src={thumbnail} alt="PDF preview" /> : <div className="gray-thumb-placeholder" />}
              </div>
              <div className="gray-meta">
                <div className="gray-name">{file.name}</div>
                <div className="gray-sub">{formatBytes(file.size)} - {pages || '-'} pages</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="grayscale" />
      <RecentFilesPanel tool="grayscale" title="Recent grayscale exports" />
    </ToolPageLayout>
  );
}
