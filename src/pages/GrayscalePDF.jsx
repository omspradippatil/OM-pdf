import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import FileList from '../components/FileList';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
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
  const [files, setFiles] = useState([]);
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(0.9);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');
  const isZipRef     = useRef(false);
  const fileInputRef = useRef(null);

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

  const handleConvert = async () => {
    if (!files.length) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(0);

    try {
      const safeScale = clamp(parseFloat(scale) || 2, 1, 3);
      const safeQuality = clamp(parseFloat(quality) || 0.9, 0.7, 0.98);
      
      if (files.length === 1) {
        const fileObj = files[0].file;
        const bytes = await buildGrayscalePdf(fileObj, { scale: safeScale, quality: safeQuality }, setProgress);
        const name = fileObj.name.replace(/\.pdf$/i, '_grayscale.pdf');
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

        lastBytesRef.current = bytes; lastNameRef.current = name; isZipRef.current = false;
        setProgress(100);
        setSuccess('Grayscale PDF created.');
        addRecentFile({ tool: 'grayscale', name, size: bytes.byteLength || 0 });
        bumpLocalJob();
        await logUserAction(user, 'grayscale', { tool: 'grayscale', status: 'success', meta: { scale: safeScale, quality: safeQuality, batch: false } });
      } else {
        const zip = new JSZip();
        const folder = zip.folder('Grayscale_PDFs');
        
        for (let i = 0; i < files.length; i++) {
          const fileObj = files[i].file;
          
          setProgress(Math.round((i / files.length) * 90));
          const bytes = await buildGrayscalePdf(fileObj, { scale: safeScale, quality: safeQuality }, (p) => {
             // scale the 0-90 progress from buildGrayscalePdf into our 0-90 overall progress window
             setProgress(Math.round(((i + (p/90)) / files.length) * 90));
          });
          
          folder.file(fileObj.name.replace(/\.pdf$/i, '_grayscale.pdf'), bytes);
        }
        
        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        setProgress(100);
        
        const zipName = `grayscale_batch_${Date.now()}.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a'); a.href = url; a.download = zipName;
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        lastBytesRef.current = zipBlob; lastNameRef.current = zipName; isZipRef.current = true;
        setSuccess(`Successfully grayscaled ${files.length} files!`);
        
        addRecentFile({ tool: 'grayscale_batch', name: zipName, size: zipBlob.size });
        bumpLocalJob();
        await logUserAction(user, 'grayscale', { tool: 'grayscale', status: 'success', meta: { scale: safeScale, quality: safeQuality, batch: true, count: files.length } });
      }
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
                const blob = isZipRef.current ? lastBytesRef.current : new Blob([lastBytesRef.current], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = lastNameRef.current;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download</button>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Grayscale" mimeType={isZipRef.current ? "application/zip" : "application/pdf"} />
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
      actionDisabled={working || !files.length}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="grayscale" />

      <input ref={fileInputRef} type="file" multiple accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFiles(e.target.files)} />

      {!files.length ? (
        <DropZone onFiles={loadFiles} label="Drop PDF(s) to convert" hint="Multiple PDFs supported · 200 MB Recommended" multiple />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{files.length} file{files.length > 1 ? 's' : ''} ready to grayscale.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => fileInputRef.current?.click()}>
                Add More
              </button>
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

      <ToolSeoContent toolKey="grayscale" />
      <RecentFilesPanel tool="grayscale" title="Recent grayscale exports" />
    </ToolPageLayout>
  );
}
