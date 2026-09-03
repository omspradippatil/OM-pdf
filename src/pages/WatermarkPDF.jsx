import { useState } from 'react';
import JSZip from 'jszip';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import ToolChaining from '../components/ToolChaining';
import FileList from '../components/FileList';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/WatermarkPDF.css';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

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
async function applyTextWatermark(file, opts) {
  const { text, fontSize, color, opacity, rotation, position, margin, pattern, spacing } = opts;
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;
  pages.forEach((page) => {
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
  });
  return pdfDoc.save();
}
async function applyImageWatermark(file, imageFile, opts) {
  const { scale, opacity, rotation, position, margin, pattern, spacing } = opts;
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const imageBytes = await imageFile.arrayBuffer();
  const img = imageFile.type === 'image/png' ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
  const imgDims = img.scale(scale);
  pages.forEach((page) => {
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
  });
  return pdfDoc.save();
}

const POSITIONS = ['center','top-left','top-right','bottom-left','bottom-right'];

export default function WatermarkPDF() {
  const { user } = useAuth();
  const [files, setFiles]           = useState([]);
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
  const [lastResult, setLastResult] = useState(null);

  const loadFiles = (raw) => {
    const valid = Array.from(raw).filter(f => f.type === 'application/pdf');
    if (!valid.length) { setError('Select at least one valid PDF.'); return; }
    
    const newFiles = valid.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name,
      size: f.size
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setError(''); setSuccess(''); setProgress(0);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Select a valid image.'); return; }
    setImageFile(f); setError('');
  };

  const handleApply = async () => {
    if (!files.length) return;
    if (mode === 'text' && !text.trim()) { setError('Enter watermark text.'); return; }
    if (mode === 'image' && !imageFile) { setError('Select a watermark image.'); return; }
    setError(''); setSuccess(''); setWorking(true); setProgress(0);
    
    // Initialize file states
    setFiles(prev => prev.map(f => ({ ...f, status: 'queued', progress: 0 })));
    
    const updateFileState = (id, updates) => {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    try {
      const margin = 24;
      const opts = { opacity, rotation, position, margin, pattern, spacing };
      
      if (files.length === 1) {
        const { id, file: fileObj } = files[0];
        updateFileState(id, { status: 'processing', progress: 30 });
        setProgress(30);
        
        const bytes = mode === 'text'
          ? await applyTextWatermark(fileObj, { ...opts, text, fontSize, color })
          : await applyImageWatermark(fileObj, imageFile, { ...opts, scale });
        
        updateFileState(id, { status: 'success', progress: 100 });
        setProgress(90);
        
        const name = fileObj.name.replace(/\.pdf$/i, '_watermarked.pdf');
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.body.appendChild(document.createElement('a'));
        a.href = url; a.download = name; a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        
        setLastResult({ bytes, name, isZip: false });
        setSuccess('Successfully applied watermark!');
        setProgress(100);
        addRecentFile({ tool: 'watermark', name, size: bytes.byteLength || 0 });
        bumpLocalJob();
        await logUserAction(user, 'watermark', { tool: 'watermark', status: 'success', meta: { outputName: name, batch: false } });
      } else {
        const zip = new JSZip();
        const folder = zip.folder('Watermarked_PDFs');
        let completed = 0;
        
        const tasks = files.map(async (fileData, i) => {
          const { id, file: fileObj } = fileData;
          updateFileState(id, { status: 'processing', progress: 10 });
          try {
            await new Promise(r => setTimeout(r, 50 * i)); // Stagger execution
            updateFileState(id, { progress: 50 });
            
            const bytes = mode === 'text'
              ? await applyTextWatermark(fileObj, { ...opts, text, fontSize, color })
              : await applyImageWatermark(fileObj, imageFile, { ...opts, scale });
            
            updateFileState(id, { status: 'success', progress: 100 });
            completed++;
            setProgress(Math.round((completed / files.length) * 90));
            return { out: bytes, fileObj };
          } catch (err) {
            updateFileState(id, { status: 'error', progress: 0 });
            throw err;
          }
        });
        
        const results = await Promise.allSettled(tasks);
        let successCount = 0;
        
        for (const res of results) {
          if (res.status === 'fulfilled') {
            const { out, fileObj } = res.value;
            folder.file(fileObj.name.replace(/\.pdf$/i, '_watermarked.pdf'), out);
            successCount++;
          }
        }
        
        if (successCount === 0) throw new Error("All files failed to process.");

        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        setProgress(100);
        
        const zipName = `watermarked_batch_${Date.now()}.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a'); a.href = url; a.download = zipName;
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        setLastResult({ bytes: zipBlob, name: zipName, isZip: true });
        setSuccess(`Successfully watermarked ${successCount} files!`);
        
        addRecentFile({ tool: 'watermark_batch', name: zipName, size: zipBlob.size });
        bumpLocalJob();
        await logUserAction(user, 'watermark', { tool: 'watermark', status: 'success', meta: { outputName: zipName, batch: true, count: successCount } });
      }
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

      {success && lastResult && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Applied!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
               <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                 const blob = lastResult.isZip ? lastResult.bytes : new Blob([lastResult.bytes], { type: 'application/pdf' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a'); a.href = url; a.download = lastResult.name;
                 a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
               }}>
                ↓ Download
              </button>
              <SaveToDriveButton bytes={lastResult.bytes} filename={lastResult.name} toolFolder="Watermarked" mimeType={lastResult.isZip ? "application/zip" : "application/pdf"} />
            </div>
            {!lastResult.isZip && (
              <ToolChaining lastBytes={lastResult.bytes} lastName={lastResult.name} currentTool="watermark" />
            )}
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !files.length}>
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

      {!files.length ? (
        <DropZone onFiles={loadFiles} label="Drop PDF(s) to watermark" hint="Multiple PDFs supported · 200 MB Recommended" multiple />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{files.length} file{files.length > 1 ? 's' : ''} ready to watermark.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px', cursor: 'pointer' }}>
                Add More
                <input type="file" multiple accept=".pdf" style={{ display: 'none' }} onChange={(e) => loadFiles(e.target.files)} />
              </label>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFiles([]); setSuccess(''); setError(''); }}>
                Clear All
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <FileList 
              files={files} 
              onRemove={removeFile}
              onClear={() => setFiles([])}
            />
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="watermark" />
      <RecentFilesPanel tool="watermark" title="Recent watermarks" />
    </ToolPageLayout>
  );
}
