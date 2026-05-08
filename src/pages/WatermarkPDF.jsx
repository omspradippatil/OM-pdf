import React, { useMemo, useState } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { formatBytes } from '../fileManager';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return rgb(0.2, 0.2, 0.2);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function computePosition(page, { width, height }, position, margin) {
  const { width: pw, height: ph } = page.getSize();
  switch (position) {
    case 'top-left': return { x: margin, y: ph - height - margin };
    case 'top-right': return { x: pw - width - margin, y: ph - height - margin };
    case 'bottom-left': return { x: margin, y: margin };
    case 'bottom-right': return { x: pw - width - margin, y: margin };
    case 'center':
    default:
      return { x: (pw - width) / 2, y: (ph - height) / 2 };
  }
}

async function applyTextWatermark(file, opts, onProgress) {
  const {
    text,
    fontSize,
    color,
    opacity,
    rotation,
    position,
    margin,
    pattern,
    spacing,
  } = opts;

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
      const stepX = textWidth + spacing;
      const stepY = textHeight + spacing;
      for (let y = margin; y <= ph + stepY; y += stepY) {
        for (let x = margin; x <= pw + stepX; x += stepX) {
          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: hexToRgb(color),
            opacity,
            rotate: degrees(rotation),
          });
        }
      }
    } else {
      const { x, y } = computePosition(page, { width: textWidth, height: textHeight }, position, margin);
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: hexToRgb(color),
        opacity,
        rotate: degrees(rotation),
      });
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
  const pages = pdfDoc.getPages();
  const total = pages.length;

  const imageBytes = await imageFile.arrayBuffer();
  const isPng = imageFile.type === 'image/png';
  const isJpg = imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg';
  const img = isPng
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  const imgDims = img.scale(scale);

  pages.forEach((page, idx) => {
    if (pattern === 'tile') {
      const { width: pw, height: ph } = page.getSize();
      const stepX = imgDims.width + spacing;
      const stepY = imgDims.height + spacing;
      for (let y = margin; y <= ph + stepY; y += stepY) {
        for (let x = margin; x <= pw + stepX; x += stepX) {
          page.drawImage(img, {
            x,
            y,
            width: imgDims.width,
            height: imgDims.height,
            opacity,
            rotate: degrees(rotation),
          });
        }
      }
    } else {
      const { x, y } = computePosition(page, { width: imgDims.width, height: imgDims.height }, position, margin);
      page.drawImage(img, {
        x,
        y,
        width: imgDims.width,
        height: imgDims.height,
        opacity,
        rotate: degrees(rotation),
      });
    }
    onProgress?.(Math.round(((idx + 1) / total) * 90));
  });

  onProgress?.(98);
  return pdfDoc.save();
}

export default function WatermarkPDF() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(36);
  const [color, setColor] = useState('#111827');
  const [opacity, setOpacity] = useState(0.2);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState('center');
  const [scale, setScale] = useState(0.35);
  const [pattern, setPattern] = useState('single');
  const [spacing, setSpacing] = useState(140);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');

  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: working ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: working ? progress : success ? 100 : 0,
    etaMs: file.size ? Math.max(1200, Math.round((file.size / (1024 * 1024)) * 900)) : null,
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

  const imageLabel = useMemo(() => imageFile?.name || 'Choose watermark image', [imageFile]);

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Select a valid image.');
      return;
    }
    setImageFile(f);
    setError('');
  };

  const handleApply = async () => {
    if (!file) return;
    if (mode === 'text' && !text.trim()) { setError('Enter watermark text.'); return; }
    if (mode === 'image' && !imageFile) { setError('Select a watermark image.'); return; }

    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const margin = 24;
      const opts = { opacity, rotation, position, margin, pattern, spacing };
      const bytes = mode === 'text'
        ? await applyTextWatermark(file, { ...opts, text, fontSize, color }, setProgress)
        : await applyImageWatermark(file, imageFile, { ...opts, scale }, setProgress);

      const name = file.name.replace(/\.pdf$/i, '_watermarked.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes);
      setLastName(name);
      setSuccess(`"${name}" saved`);

      addRecentFile({ tool: 'watermark', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'watermark', {
        tool: 'watermark',
        status: 'success',
        meta: {
          outputName: name,
          mode,
          pattern,
          position,
          rotation,
          spacing: pattern === 'tile' ? spacing : null,
        }
      });
    } catch (err) {
      setError('Watermark failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'watermark', {
        tool: 'watermark',
        status: 'error',
        meta: { error: err?.message || 'Watermark failed' }
      });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  return (
    <ToolPageLayout
      title="Watermark PDF"
      subtitle="Add text or image watermarks to every page in seconds."
      icon="💧"
    >
      <SEO
        keywords="watermark pdf, stamp pdf, add watermark"
        title="Watermark PDF Online Free — Text or Image | OM PDF"
        description="Add a text or image watermark to any PDF. 100% private, processed locally."
        url="https://om-pdf.netlify.app/watermark-pdf"
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to watermark" hint="Single PDF - Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span></div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-option-panel">
            <label className="split-label">Watermark type</label>
            <div className="split-modes">
              <button className={`split-mode-btn${mode === 'text' ? ' active' : ''}`} onClick={() => setMode('text')}>Text</button>
              <button className={`split-mode-btn${mode === 'image' ? ' active' : ''}`} onClick={() => setMode('image')}>Image</button>
            </div>

            <label className="split-label" style={{ marginTop: 12 }}>Pattern</label>
            <div className="split-modes">
              <button className={`split-mode-btn${pattern === 'single' ? ' active' : ''}`} onClick={() => setPattern('single')}>Single</button>
              <button className={`split-mode-btn${pattern === 'tile' ? ' active' : ''}`} onClick={() => setPattern('tile')}>Full page</button>
            </div>

            {mode === 'text' ? (
              <div className="wm-grid">
                <div className="wm-group">
                  <label className="split-label" htmlFor="wmText">Text</label>
                  <input id="wmText" className="split-range-input" type="text" value={text}
                    onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL" />
                </div>
                <div className="wm-group">
                  <label className="split-label" htmlFor="wmSize">Font size</label>
                  <input id="wmSize" className="split-range-input" type="number" min={8} max={120} value={fontSize}
                    onChange={e => setFontSize(Math.max(8, parseInt(e.target.value) || 36))} />
                </div>
                <div className="wm-group">
                  <label className="split-label" htmlFor="wmColor">Color</label>
                  <input id="wmColor" className="wm-color" type="color" value={color} onChange={e => setColor(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="wm-grid">
                <div className="wm-group">
                  <label className="split-label" htmlFor="wmImage">Image</label>
                  <input id="wmImage" className="wm-file" type="file" accept="image/*" onChange={onPickImage} />
                  <div className="wm-file-name">{imageLabel}</div>
                </div>
                <div className="wm-group">
                  <label className="split-label" htmlFor="wmScale">Scale</label>
                  <input id="wmScale" className="split-range-input" type="number" step={0.05} min={0.1} max={1.2} value={scale}
                    onChange={e => setScale(Math.max(0.1, Math.min(1.2, parseFloat(e.target.value) || 0.35)))} />
                </div>
              </div>
            )}

            <div className="wm-grid wm-grid-compact">
              <div className="wm-group">
                <label className="split-label" htmlFor="wmOpacity">Opacity</label>
                <input id="wmOpacity" className="split-range-input" type="number" step={0.05} min={0.05} max={0.8} value={opacity}
                  onChange={e => setOpacity(Math.max(0.05, Math.min(0.8, parseFloat(e.target.value) || 0.2)))} />
              </div>
              {pattern === 'tile' && (
                <div className="wm-group">
                  <label className="split-label" htmlFor="wmSpacing">Spacing (pt)</label>
                  <input id="wmSpacing" className="split-range-input" type="number" step={10} min={40} max={300} value={spacing}
                    onChange={e => setSpacing(Math.max(40, Math.min(300, parseInt(e.target.value) || 140)))} />
                </div>
              )}
              <div className="wm-group">
                <label className="split-label" htmlFor="wmRotation">Rotation (deg)</label>
                <input id="wmRotation" className="split-range-input" type="number" step={5} min={-180} max={180} value={rotation}
                  onChange={e => setRotation(parseInt(e.target.value) || 0)} />
              </div>
              <div className="wm-group">
                <label className="split-label" htmlFor="wmPosition">Position</label>
                <select id="wmPosition" className="pn-select" value={position} onChange={e => setPosition(e.target.value)}>
                  <option value="center">Center</option>
                  <option value="top-left">Top left</option>
                  <option value="top-right">Top right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="bottom-right">Bottom right</option>
                </select>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error"><span>! {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {working && <ProgressBar pct={progress} label="Applying watermark..." />}

          {success && (
            <SuccessBanner message="Watermark applied!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Watermarked" />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button className="btn-merge" onClick={handleApply} disabled={working}>
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Apply Watermark
              </span>
            </button>
            <p className="merge-hint">Processed locally - no upload</p>
          </div>
        </div>
      )}

      <RecentFilesPanel tool="watermark" title="Recent watermarks" />
    </ToolPageLayout>
  );
}
