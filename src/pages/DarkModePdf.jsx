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
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

async function buildDarkModePdf(file, options, onProgress) {
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
    
    // Mathematically invert all pixel colors
    for (let p = 0; p < data.length; p += 4) {
      data[p]     = 255 - data[p];     // R
      data[p + 1] = 255 - data[p + 1]; // G
      data[p + 2] = 255 - data[p + 2]; // B
      // Alpha data[p + 3] remains unchanged
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', options.quality));
    if (!blob) throw new Error('Failed to render dark mode page.');

    const imgBytes = await blob.arrayBuffer();
    const img = await outDoc.embedJpg(imgBytes);
    const outPage = outDoc.addPage([img.width, img.height]);
    outPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });

    onProgress?.(Math.round((i / total) * 90));
    await new Promise((r) => setTimeout(r, 0));
  }

  return outDoc.save();
}

export default function DarkModePdf() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [quality, setQuality] = useState(0.85);
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
      const safeScale = clamp(parseFloat(scale) || 1.5, 1, 3);
      const safeQuality = clamp(parseFloat(quality) || 0.85, 0.7, 0.98);
      const bytes = await buildDarkModePdf(file, { scale: safeScale, quality: safeQuality }, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_darkmode.pdf');
      
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
      setSuccess('Dark Mode PDF created successfully!');
      addRecentFile({ tool: 'dark_mode_pdf', name, size: bytes.byteLength || 0, pages });
      bumpLocalJob();
      await logUserAction(user, 'dark_mode_pdf', { tool: 'dark_mode_pdf', status: 'success', meta: { pages, scale: safeScale, quality: safeQuality } });
    } catch (err) {
      setError('Conversion failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'dark_mode_pdf', { tool: 'dark_mode_pdf', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Rendering Quality</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="scale">Resolution Scale</label>
        <select id="scale" className="ux-input" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))}>
          <option value="1">1.0x (Fastest, Small File)</option>
          <option value="1.5">1.5x (Recommended Balanced)</option>
          <option value="2">2.0x (High Sharpness)</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="quality">JPEG Compression Quality</label>
        <input id="quality" className="gray-range" type="range" min={0.7} max={0.98} step={0.02} value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} />
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{Math.round(quality * 100)}%</div>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: 12, borderRadius: 8, lineHeight: 1.5, marginTop: 12 }}>
        💡 <strong>How it works:</strong> All colors are inverted mathematically (black becomes white, white backgrounds become dark). Great for late night reading!
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Generating Night Mode PDF…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Dark Mode PDF Ready!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop: 0 }} onClick={() => {
                const blob = new Blob([lastBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = lastName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>↓ Download Again</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="DarkMode" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Dark Mode PDF"
      subtitle="Invert PDF page backgrounds and colors for easier reading at night."
      icon="🌙"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Converting...' : '🌙 Convert to Dark Mode'}
      onAction={handleConvert}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="darkModePdf" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to invert colors" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Workspace</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Preview and convert your document to night mode locally.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius: '10px', padding: '8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, border: '1px solid var(--border)', borderRadius: 12, marginTop: 12, background: '#f8fafc', padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--border)', padding: 16, borderRadius: 12, maxWidth: 280, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ width: '100%', height: 260, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#eee', position: 'relative' }}>
                {thumbnail ? (
                  <img src={thumbnail} alt="PDF preview" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'invert(1)' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Preview</div>
                )}
                <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4 }}>Simulated Dark Mode</div>
              </div>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{file.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatBytes(file.size)} • {pages || '-'} pages</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="darkModePdf" />
      <RecentFilesPanel tool="dark_mode_pdf" title="Recent dark mode exports" />
    </ToolPageLayout>
  );
}
