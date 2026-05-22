import React, { useState, useRef, useEffect } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { formatBytes } from '../fileManager';
import { PDFDocument } from 'pdf-lib';
import PdfCanvas from '../components/PdfCanvas';
import '../styles/WatermarkPDF.css'; // Reuse watermark styles for basic layout

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// Generate an image from text
function createTextSignature(text, fontColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.font = 'italic 48px "Times New Roman", serif';
  ctx.fillStyle = fontColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 200, 50);
  return canvas.toDataURL('image/png');
}

async function applySignature(file, sigDataUrl, pageIndex, xPct, yPct, scale, onProgress) {
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const page = pages[pageIndex];
  
  if (!page) throw new Error("Invalid page index");

  const sigImageBytes = await fetch(sigDataUrl).then(res => res.arrayBuffer());
  const img = await pdfDoc.embedPng(sigImageBytes);
  
  const imgDims = img.scale(scale);
  const { width: pw, height: ph } = page.getSize();

  // Convert percentages back to PDF coordinates
  // (xPct is left to right, yPct is top to bottom in UI, but PDF is bottom to top)
  const x = (xPct / 100) * pw;
  const topToBottomY = (yPct / 100) * ph;
  const y = ph - topToBottomY - imgDims.height; // PDF coordinates

  page.drawImage(img, {
    x,
    y,
    width: imgDims.width,
    height: imgDims.height,
  });

  onProgress?.(90);
  const resultBytes = await pdfDoc.save();
  onProgress?.(100);
  return resultBytes;
}

export default function DrawSignPdf() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const [previewDims, setPreviewDims] = useState(null);
  
  const [sigMode, setSigMode] = useState('type'); // type, draw, upload
  const [typedText, setTypedText] = useState('John Doe');
  const [sigColor, setSigColor] = useState('#000000');
  const [sigDataUrl, setSigDataUrl] = useState(null);
  const [scale, setScale] = useState(0.5);
  const [pos, setPos] = useState({ x: 50, y: 50 }); // percentages 0-100
  const [pageIndex, setPageIndex] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  useEffect(() => {
    if (sigMode === 'type') {
      if (typedText) {
        setSigDataUrl(createTextSignature(typedText, sigColor));
      } else {
        setSigDataUrl(null);
      }
    }
  }, [typedText, sigColor, sigMode]);

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0); setPageIndex(0);
  };

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSigDataUrl(ev.target.result);
      setSigMode('upload');
    };
    reader.readAsDataURL(f);
  };

  const handleApply = async () => {
    if (!file || !sigDataUrl) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const bytes = await applySignature(file, sigDataUrl, pageIndex, pos.x, pos.y, scale, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_signed.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created!`);
      addRecentFile({ tool: 'draw_sign', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'draw_sign', { tool: 'draw_sign', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Signing failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'draw_sign', { tool: 'draw_sign', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const onPointerDown = (e) => {
    if (!previewDims) return;
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging || !previewDims || !dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const onPointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Signature Source</p>

      <div className="ux-field">
        <div className="ux-mode-tabs">
          <button className={`ux-mode-tab${sigMode==='type'?' active':''}`} onClick={() => setSigMode('type')}>Type</button>
          <button className={`ux-mode-tab${sigMode==='upload'?' active':''}`} onClick={() => document.getElementById('sigImgUpload').click()}>Upload</button>
        </div>
        <input id="sigImgUpload" type="file" accept="image/png, image/jpeg" style={{display:'none'}} onChange={onPickImage} />
      </div>

      {sigMode === 'type' && (
        <>
          <div className="ux-field">
            <label className="ux-label">Name</label>
            <input className="ux-input" type="text" value={typedText} onChange={(e) => setTypedText(e.target.value)} />
          </div>
          <div className="ux-field">
            <label className="ux-label">Color</label>
            <input type="color" value={sigColor} onChange={(e) => setSigColor(e.target.value)} style={{ width:'100%', height:36, borderRadius:8 }} />
          </div>
        </>
      )}

      {sigMode === 'upload' && sigDataUrl && (
        <div className="ux-field" style={{ textAlign: 'center' }}>
          <img src={sigDataUrl} alt="Signature" style={{ maxHeight: '60px', maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '4px' }} />
        </div>
      )}

      <p className="ux-section-label" style={{ marginTop:20 }}>Placement</p>
      
      <div className="ux-field">
        <label className="ux-label">Page Number (1-based)</label>
        <input className="ux-input" type="number" min={1} value={pageIndex + 1} onChange={(e) => setPageIndex(Math.max(0, parseInt(e.target.value) - 1 || 0))} />
      </div>

      <div className="ux-field">
        <div className="ux-range-header">
          <label className="ux-label" style={{ margin:0 }}>Scale</label>
          <span className="ux-range-value">{Math.round(scale * 100)}%</span>
        </div>
        <input type="range" className="ux-range" min={10} max={200} value={scale * 100} onChange={e => setScale(parseInt(e.target.value)/100)} />
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Drag the signature on the preview to position it precisely.</p>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Applying signature…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Signed Successfully!</p>
          </div>
          <div className="ux-result-body">
             <button className="ux-btn-primary" onClick={() => downloadBytes(lastBytes, lastName)}>↓ Download</button>
             <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Signed" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !file || !sigDataUrl}>
      {working ? 'Signing…' : 'Apply Signature'}
    </button>
  );

  return (
    <ToolPageLayout
      title="Draw & Sign PDF"
      subtitle="Sign your documents electronically. 100% private and offline."
      icon="✍️"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="drawSign" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to sign" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Drag the signature over the page.</p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile(null); setSuccess(''); }}>Remove File</button>
          </div>

          <div style={{ flex:1, display:'flex', justifyContent:'center', padding:20, background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'auto' }}>
            <div 
              ref={dragRef}
              style={{ position:'relative', boxShadow:'0 10px 30px rgba(0,0,0,0.1)', cursor: 'crosshair', touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <PdfCanvas 
                file={file} 
                pageNumber={pageIndex + 1} 
                width={600}
                onRender={({ width, height }) => setPreviewDims({ width, height })}
                onError={(err) => setError('Preview error: ' + err.message)}
              />
              {previewDims && sigDataUrl && (
                <div style={{ 
                  position: 'absolute', 
                  left: `${pos.x}%`, 
                  top: `${pos.y}%`, 
                  pointerEvents: 'none',
                  border: '1px dashed rgba(59, 130, 246, 0.5)'
                }}>
                  <img src={sigDataUrl} alt="Sig" style={{ display: 'block', transformOrigin: 'top left', transform: `scale(${scale})` }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="drawSign" />
    </ToolPageLayout>
  );
}
