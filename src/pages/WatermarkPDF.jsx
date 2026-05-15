import React, { useMemo, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/WatermarkPDF.css';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return rgb(0.2, 0.2, 0.2);
  return rgb(parseInt(clean.slice(0,2),16)/255, parseInt(clean.slice(2,4),16)/255, parseInt(clean.slice(4,6),16)/255);
}
function computePosition(page, { width, height }, position, margin) {
  const { width: pw, height: ph } = page.getSize();
  switch (position) {
    case 'top-left':     return { x: margin, y: ph - height - margin };
    case 'top-right':    return { x: pw - width - margin, y: ph - height - margin };
    case 'bottom-left':  return { x: margin, y: margin };
    case 'bottom-right': return { x: pw - width - margin, y: margin };
    default:             return { x: (pw - width) / 2, y: (ph - height) / 2 };
  }
}
async function applyTextWatermark(file, opts, onProgress) {
  const { text, fontSize, color, opacity, rotation, position, margin, pattern, spacing } = opts;
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const total = pages.length;
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;
  pages.forEach((page, idx) => {
    if (pattern === 'tile') {
      const { width: pw, height: ph } = page.getSize();
      const stepX = textWidth + spacing; const stepY = textHeight + spacing;
      for (let y = margin; y <= ph + stepY; y += stepY)
        for (let x = margin; x <= pw + stepX; x += stepX)
          page.drawText(text, { x, y, size: fontSize, font, color: hexToRgb(color), opacity, rotate: degrees(rotation) });
    } else {
      const { x, y } = computePosition(page, { width: textWidth, height: textHeight }, position, margin);
      page.drawText(text, { x, y, size: fontSize, font, color: hexToRgb(color), opacity, rotate: degrees(rotation) });
    }
    onProgress?.(Math.round(((idx + 1) / total) * 90));
  });
  onProgress?.(98);
  return pdfDoc.save();
}
async function applyImageWatermark(file, imageFile, opts, onProgress) {
  const { scale, opacity, rotation, position, margin, pattern, spacing } = opts;
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages(); const total = pages.length;
  const imageBytes = await imageFile.arrayBuffer();
  const img = imageFile.type === 'image/png' ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
  const imgDims = img.scale(scale);
  pages.forEach((page, idx) => {
    if (pattern === 'tile') {
      const { width: pw, height: ph } = page.getSize();
      const stepX = imgDims.width + spacing; const stepY = imgDims.height + spacing;
      for (let y = margin; y <= ph + stepY; y += stepY)
        for (let x = margin; x <= pw + stepX; x += stepX)
          page.drawImage(img, { x, y, width: imgDims.width, height: imgDims.height, opacity, rotate: degrees(rotation) });
    } else {
      const { x, y } = computePosition(page, { width: imgDims.width, height: imgDims.height }, position, margin);
      page.drawImage(img, { x, y, width: imgDims.width, height: imgDims.height, opacity, rotate: degrees(rotation) });
    }
    onProgress?.(Math.round(((idx + 1) / total) * 90));
  });
  onProgress?.(98);
  return pdfDoc.save();
}

const POSITIONS = ['center','top-left','top-right','bottom-left','bottom-right'];

export default function WatermarkPDF() {
  const { user } = useAuth();
  const [file, setFile]           = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [mode, setMode]           = useState('text');
  const [text, setText]           = useState('CONFIDENTIAL');
  const [fontSize, setFontSize]   = useState(36);
  const [color, setColor]         = useState('#111827');
  const [opacity, setOpacity]     = useState(0.2);
  const [rotation, setRotation]   = useState(0);
  const [position, setPosition]   = useState('center');
  const [scale, setScale]         = useState(0.35);
  const [pattern, setPattern]     = useState('single');
  const [spacing, setSpacing]     = useState(140);
  const [progress, setProgress]   = useState(0);
  const [working, setWorking]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName]   = useState('');

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0); setThumbnail(null);
    generateThumbnail(f).then(url => setThumbnail(url));
  };
  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Select a valid image.'); return; }
    setImageFile(f); setError('');
  };
  const handleApply = async () => {
    if (!file) return;
    if (mode === 'text' && !text.trim()) { setError('Enter watermark text.'); return; }
    if (mode === 'image' && !imageFile) { setError('Select a watermark image.'); return; }
    setError(''); setSuccess(''); setWorking(true); setProgress(0);
    try {
      const margin = 24;
      const opts = { opacity, rotation, position, margin, pattern, spacing };
      const bytes = mode === 'text'
        ? await applyTextWatermark(file, { ...opts, text, fontSize, color }, setProgress)
        : await applyImageWatermark(file, imageFile, { ...opts, scale }, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_watermarked.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created!`);
      addRecentFile({ tool: 'watermark', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'watermark', { tool: 'watermark', status: 'success', meta: { outputName: name, mode, pattern, position, rotation } });
    } catch (err) {
      setError('Watermark failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'watermark', { tool: 'watermark', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Watermark Options</p>

      <div className="ux-field">
        <label className="ux-label">Type</label>
        <div className="ux-mode-tabs">
          <button className={`ux-mode-tab${mode==='text'?' active':''}`} onClick={() => setMode('text')}>Text</button>
          <button className={`ux-mode-tab${mode==='image'?' active':''}`} onClick={() => setMode('image')}>Image</button>
        </div>
      </div>

      {mode === 'text' && (
        <>
          <div className="ux-field">
            <label className="ux-label" htmlFor="wmText">Text</label>
            <input id="wmText" className="ux-input" type="text" value={text} onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="ux-field">
              <label className="ux-label" htmlFor="wmSize">Size (pt)</label>
              <input id="wmSize" className="ux-input" type="number" min={8} max={120} value={fontSize} onChange={e => setFontSize(Math.max(8,parseInt(e.target.value)||36))} />
            </div>
            <div className="ux-field">
              <label className="ux-label" htmlFor="wmColor">Color</label>
              <input id="wmColor" type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width:'100%', height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer' }} />
            </div>
          </div>
        </>
      )}

      {mode === 'image' && (
        <div className="ux-field">
          <label className="ux-label">Image File</label>
          <input id="wmImg" type="file" accept="image/*" onChange={onPickImage} style={{ display:'none' }} />
          <label htmlFor="wmImg" className="ux-btn-secondary" style={{ display:'flex', justifyContent:'center', cursor:'pointer', padding:'8px' }}>
            {imageFile ? imageFile.name : '📁 Choose Image'}
          </label>
          <div className="ux-range-header" style={{ marginTop:12 }}>
            <label className="ux-label" style={{ margin:0 }}>Scale</label>
            <span className="ux-range-value">{scale.toFixed(2)}×</span>
          </div>
          <input type="range" className="ux-range" min={10} max={120} value={Math.round(scale*100)} onChange={e => setScale(parseInt(e.target.value)/100)} />
        </div>
      )}

      <p className="ux-section-label" style={{ marginTop:20 }}>Appearance</p>
      
      <div className="ux-field">
        <label className="ux-label">Pattern</label>
        <div className="ux-mode-tabs">
          <button className={`ux-mode-tab${pattern==='single'?' active':''}`} onClick={() => setPattern('single')}>Single</button>
          <button className={`ux-mode-tab${pattern==='tile'  ?' active':''}`} onClick={() => setPattern('tile')}>Tile</button>
        </div>
      </div>

      <div className="ux-field">
        <div className="ux-range-header">
          <label className="ux-label" style={{ margin:0 }}>Opacity</label>
          <span className="ux-range-value">{Math.round(opacity*100)}%</span>
        </div>
        <input type="range" className="ux-range" min={5} max={80} value={Math.round(opacity*100)} onChange={e => setOpacity(parseInt(e.target.value)/100)} />
      </div>

      <div className="ux-field">
        <div className="ux-range-header">
          <label className="ux-label" style={{ margin:0 }}>Rotation</label>
          <span className="ux-range-value">{rotation}°</span>
        </div>
        <input type="range" className="ux-range" min={-180} max={180} value={rotation} onChange={e => setRotation(parseInt(e.target.value))} />
      </div>

      {pattern === 'single' ? (
        <div className="ux-field">
          <label className="ux-label" htmlFor="wmPos">Position</label>
          <select id="wmPos" className="ux-input" value={position} onChange={e => setPosition(e.target.value)}>
            {POSITIONS.map(p => <option key={p} value={p}>{p.replace('-',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
          </select>
        </div>
      ) : (
        <div className="ux-field">
          <label className="ux-label" htmlFor="wmSpacing">Spacing (pt)</label>
          <input id="wmSpacing" className="ux-input" type="number" min={40} max={300} step={10} value={spacing} onChange={e => setSpacing(Math.max(40,Math.min(300,parseInt(e.target.value)||140)))} />
        </div>
      )}

      {error   && <div className="alert alert-error"   style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Applying watermark…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Applied!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
               <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => downloadBytes(lastBytes, lastName)}>
                ↓ Download
              </button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Watermarked" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !file}>
      {working ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Applying…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Apply Watermark
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Watermark PDF"
      subtitle="Add text or image watermarks to every page instantly. 100% local."
      icon="💧"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="watermark" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to watermark" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Visual preview of the first page.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); setThumbnail(null); }}>
              Remove File
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, minHeight:280, gap:14, background:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)' }}>
            <div className="ux-page-card" style={{ width: '220px', cursor: 'default' }}>
              <div className="ux-page-thumb-wrap" style={{ height: '300px' }}>
                {thumbnail ? <img className="ux-page-thumb-img" src={thumbnail} alt="PDF Preview" /> : <div className="ux-page-thumb-placeholder" />}
              </div>
            </div>
            <p style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)', margin:0 }}>{file.name}</p>
            <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', margin:0 }}>{formatBytes(file.size)} · Document ready</p>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="watermark" />
      <RecentFilesPanel tool="watermark" title="Recent watermarks" />
    </ToolPageLayout>
  );
}
