import React, { useEffect, useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/RotatePDF.css';
import PdfCanvas from '../components/PdfCanvas';

async function rotatePDF(file, rotations, onProgress) {
  onProgress?.(10);
  const buf    = await file.arrayBuffer();
  onProgress?.(30);
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages  = pdfDoc.getPages();
  onProgress?.(50);
  pages.forEach((page, idx) => {
    const delta = rotations?.[idx] || 0;
    if (!delta) return;
    const current = page.getRotation().angle;
    const next = (current + ((delta % 360) + 360) % 360) % 360;
    page.setRotation(degrees(next));
  });
  onProgress?.(80);
  const bytes = await pdfDoc.save();
  onProgress?.(100);
  return bytes;
}

function download(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a   = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

export default function RotatePDF() {
  const { user } = useAuth();
  const [file, setFile]               = useState(null);
  const [pageThumbs, setPageThumbs]   = useState([]);
  const [rotations, setRotations]     = useState([]);
  const [selectedPage, setSelectedPage] = useState(1);
  const [progress, setProgress]       = useState(0);
  const [rotating, setRotating]       = useState(false);
  const [error, setError]             = useState('');
  const [previewError, setPreviewError] = useState('');
  const [success, setSuccess]         = useState('');
  const [lastBytes, setLastBytes]     = useState(null);
  const [lastName, setLastName]       = useState('');

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess('');
    setPageThumbs([]); setRotations([]); setSelectedPage(1); setPreviewError('');
  };

  useEffect(() => {
    if (!file) return;
    let active = true;
    generatePageThumbnails(file).then(thumbs => {
      if (!active) return;
      const nextThumbs = thumbs || [];
      setPageThumbs(nextThumbs);
      if (nextThumbs.length) {
        setRotations(Array.from({ length: nextThumbs.length }, () => 0));
        setSelectedPage(1);
      }
    });
    return () => { active = false; };
  }, [file]);

  const rotatePage = (index, delta) => {
    setRotations(prev => { const next = [...prev]; next[index] = (next[index] + delta + 360) % 360; return next; });
  };
  const rotateAll = (delta) => setRotations(prev => prev.map(v => (v + delta + 360) % 360));

  const handleRotate = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setRotating(true); setProgress(0);
    try {
      const bytes = await rotatePDF(file, rotations, setProgress);
      const name  = file.name.replace(/\.pdf$/i, '_rotated.pdf');
      setLastBytes(bytes); setLastName(name);
      download(bytes, name);
      setSuccess(`"${name}" rotated and saved`);
      addRecentFile({ tool: 'rotate', name, size: bytes.byteLength || 0, pages: rotations.length });
      bumpLocalJob();
    } catch (err) {
      setError('Rotation failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'rotate', { tool: 'rotate', status: 'error', meta: { error: err?.message } });
    } finally { setRotating(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Rotation Options</p>

      {/* Bulk rotate buttons */}
      {pageThumbs.length > 0 && (
        <div className="ux-field">
          <label className="ux-label">Rotate All Pages</label>
          <div style={{ display:'flex', gap:10 }}>
            <button className="ux-btn-secondary" style={{ flex:1 }} onClick={() => rotateAll(270)}>
              ↺ 90° Left
            </button>
            <button className="ux-btn-secondary" style={{ flex:1 }} onClick={() => rotateAll(90)}>
              ↻ 90° Right
            </button>
          </div>
          <button className="ux-btn-secondary" style={{ width:'100%', marginTop:10 }} onClick={() => rotateAll(180)}>
            ⟳ Rotate All 180°
          </button>
        </div>
      )}

      {/* Selected page info */}
      {pageThumbs.length > 0 && (
        <div className="ux-summary">
          <div className="ux-summary-row">
            <span>Selected Page</span>
            <strong>Page {selectedPage} / {pageThumbs.length}</strong>
          </div>
          <div className="ux-summary-row">
            <span>Current Angle</span>
            <strong>{rotations[selectedPage - 1] || 0}°</strong>
          </div>
        </div>
      )}

      {/* Per-page rotate */}
      {pageThumbs.length > 0 && (
        <div className="ux-field">
          <label className="ux-label">Rotate Selected Page</label>
          <div style={{ display:'flex', gap:8 }}>
            <button className="ux-btn-secondary" style={{ flex:1, padding:'12px' }} onClick={() => rotatePage(selectedPage - 1, 270)}>↺ Left</button>
            <button className="ux-btn-secondary" style={{ flex:1, padding:'12px' }} onClick={() => rotatePage(selectedPage - 1, 90)}>↻ Right</button>
            <button className="ux-btn-secondary" style={{ flex:1, padding:'12px' }} onClick={() => rotatePage(selectedPage - 1, 180)}>⟳ 180</button>
          </div>
        </div>
      )}

      {error   && <div className="alert alert-error"   style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {rotating && <ProgressBar pct={progress} label="Rotating PDF…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Rotated Successfully!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => download(lastBytes, lastName)}>
                ↓ Download
              </button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Rotated" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleRotate} disabled={rotating || !file}>
      {rotating ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Rotating…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Save Rotated PDF
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Rotate PDF"
      subtitle="Rotate individual pages or all pages at once. 100% local."
      icon="🔄"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="rotate" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to rotate" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Click pages to select, use buttons below to rotate.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
            {/* Thumbnail grid */}
            <div className="ux-page-grid" style={{ flex:1 }}>
              {pageThumbs.map((thumb, idx) => (
                <div key={idx} className={`ux-page-card${selectedPage === idx + 1 ? ' selected-for-split' : ''}`} onClick={() => setSelectedPage(idx + 1)} style={{ cursor:'pointer' }}>
                  <div className="ux-page-thumb-wrap">
                    {thumb
                      ? <img src={thumb} alt={`Page ${idx + 1}`} className="ux-page-thumb-img" style={{ transform: rotations[idx] ? `rotate(${rotations[idx]}deg)` : undefined }} />
                      : <div className="ux-page-thumb-placeholder" aria-hidden="true" />}
                  </div>
                  <div className="ux-page-num" style={{ fontWeight: selectedPage === idx + 1 ? 700 : 500 }}>Pg {idx + 1} {rotations[idx] ? `(${rotations[idx]}°)` : ''}</div>
                </div>
              ))}
            </div>

            {/* Live preview (Focused) */}
            <div className="rotate-preview" style={{ sticky: 'top 0', padding:'20px', background:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <p className="ux-section-label" style={{ marginBottom:16 }}>Focused Preview (Page {selectedPage})</p>
              <div style={{ transform: rotations[selectedPage - 1] ? `rotate(${rotations[selectedPage - 1]}deg)` : undefined, transition:'transform 0.3s ease' }}>
                <PdfCanvas
                  file={file}
                  pageNumber={selectedPage}
                  width={340}
                  onRender={() => setPreviewError('')}
                  onError={(err) => setPreviewError(err?.message || 'Preview failed.')}
                />
              </div>
              {previewError && <div className="rotate-preview-error">{previewError}</div>}
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                 <button className="ux-btn-secondary" onClick={() => rotatePage(selectedPage - 1, 270)}>↺ Left</button>
                 <button className="ux-btn-secondary" onClick={() => rotatePage(selectedPage - 1, 90)}>↻ Right</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="rotate" />
      <RecentFilesPanel tool="rotate" title="Recent rotations" />
    </ToolPageLayout>
  );
}
