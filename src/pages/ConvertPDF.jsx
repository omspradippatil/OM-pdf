import React, { useState, useRef } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { generateThumbnail } from '../thumbnailGenerator';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/ConvertPDF.css';

async function pdfToImages(file, onProgress) {
  const buf   = await file.arrayBuffer();
  const pdf   = await pdfjsLib.getDocument({ data: buf }).promise;
  const total = pdf.numPages;
  const blobs = [];
  for (let i = 1; i <= total; i++) {
    const page    = await pdf.getPage(i);
    const vp      = page.getViewport({ scale: 2 });
    const canvas  = document.createElement('canvas');
    canvas.width  = vp.width; canvas.height = vp.height;
    const ctx     = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
    if (!blob) throw new Error('Failed to render a page image for conversion.');
    blobs.push({ blob, name: `page_${String(i).padStart(3,'0')}.jpg` });
    onProgress?.(Math.round((i / total) * 90));
  }
  return blobs;
}

export default function ConvertPDF() {
  const { user } = useAuth();
  const [file, setFile]         = useState(null);
  const [pages, setPages]       = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const lastBlobRef = useRef(null);
  const lastNameRef = useRef('');

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setThumbnail(null);
    generateThumbnail(f).then(url => setThumbnail(url));
    try {
      const buf = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPages(doc.numPages);
    } catch { setPages(null); }
  };

  const handleConvert = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setConverting(true); setProgress(0);
    try {
      const images = await pdfToImages(file, setProgress);
      setProgress(95);
      let outputName = '';
      if (images.length === 1) {
        const url = URL.createObjectURL(images[0].blob);
        const a = document.createElement('a'); a.href = url; a.download = images[0].name;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        lastBlobRef.current = images[0].blob;
        lastNameRef.current = images[0].name;
        outputName = images[0].name;
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        images.forEach(img => zip.file(img.name, img.blob));
        const blob = await zip.generateAsync({ type: 'blob' });
        const zipName = file.name.replace(/\.pdf$/i, '_images.zip');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = zipName;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        lastBlobRef.current = blob;
        lastNameRef.current = zipName;
        outputName = zipName;
      }
      setProgress(100);
      setSuccess(`Converted ${images.length} page${images.length !== 1 ? 's' : ''} to JPG${images.length > 1 ? ' (ZIP)' : ''}`);
      addRecentFile({ tool: 'convert', name: outputName, size: lastBlobRef.current?.size || 0, pages: images.length });
      bumpLocalJob();
      await logUserAction(user, 'convert', { tool: 'convert', status: 'success', meta: { pages: images.length, outputName, format: 'jpg', zipped: images.length > 1 } });
    } catch (err) {
      setError('Conversion failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'convert', { tool: 'convert', status: 'error', meta: { error: err?.message } });
    } finally { setConverting(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Conversion Settings</p>

      <div className="ux-option-card selected recommended">
        <div className="ux-recommended-badge">ONLY</div>
        <div>
          <div className="ux-option-title">🖼️ PDF → JPG Images</div>
          <div className="ux-option-desc">Pages rendered at 2× resolution. Multiple pages download as ZIP.</div>
        </div>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Pages</span><strong>{pages ? `${pages} JPGs` : 'Counting…'}</strong></div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {converting && <ProgressBar pct={progress} label="Converting pages…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Converted Successfully!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
               <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const url = URL.createObjectURL(lastBlobRef.current);
                const a = document.createElement('a'); a.href = url; a.download = lastNameRef.current;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>↓ Download</button>
              <SaveToDriveButton bytes={lastBlobRef.current} filename={lastNameRef.current} toolFolder="Converted" mimeType={lastNameRef.current?.endsWith('.zip') ? 'application/zip' : 'image/jpeg'} />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleConvert} disabled={converting || !file}>
      {converting ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Converting…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <polyline points="16 3 21 3 21 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="4" y1="20" x2="21" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="21 16 21 21 16 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Convert to JPG
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Convert PDF to Images"
      subtitle="Export pages as high-quality JPG images. 100% local."
      icon="🖼️"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="convert" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to convert" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Visual preview of the first page.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); }}>
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
            <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', margin:0 }}>{formatBytes(file.size)} · Ready to convert</p>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="convert" />
      <RecentFilesPanel tool="convert" title="Recent conversions" />
    </ToolPageLayout>
  );
}
