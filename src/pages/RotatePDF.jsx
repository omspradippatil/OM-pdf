import React, { useEffect, useState } from 'react';
import SEO from '../components/SEO';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';
import '../utils/pdfjs';
import { Document, Page } from 'react-pdf';

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
  const [file, setFile]         = useState(null);
  const [pageThumbs, setPageThumbs] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [selectedPage, setSelectedPage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName]   = useState('');

  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: rotating ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: rotating ? progress : success ? 100 : 0,
    etaMs: file.size ? Math.max(1200, Math.round((file.size / (1024 * 1024)) * 900)) : null,
    message: error || '',
  }] : [];

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : raw[0];
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess('');
    setPageThumbs([]);
    setRotations([]);
    setSelectedPage(1);
  };

  useEffect(() => {
    if (!file) return;
    let active = true;
    generatePageThumbnails(file).then(thumbs => {
      if (!active) return;
      const nextThumbs = thumbs || [];
      setPageThumbs(nextThumbs);
      setRotations(Array.from({ length: nextThumbs.length }, () => 0));
      setSelectedPage(1);
    });
    return () => { active = false; };
  }, [file]);

  const rotatePage = (index, delta) => {
    setRotations(prev => {
      const next = [...prev];
      const current = next[index] || 0;
      next[index] = (current + delta + 360) % 360;
      return next;
    });
  };

  const rotateAll = (delta) => {
    setRotations(prev => prev.map(v => (v + delta + 360) % 360));
  };

  const handleRotate = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setRotating(true); setProgress(0);
    try {
      const bytes = await rotatePDF(file, rotations, setProgress);
      const name  = file.name.replace(/\.pdf$/i, `_rotated.pdf`);
      setLastBytes(bytes); setLastName(name);
      download(bytes, name);
      setSuccess(`"${name}" rotated pages saved`);
      addRecentFile({ tool: 'rotate', name, size: bytes.byteLength || 0, pages: rotations.length });
      bumpLocalJob();
      await logUserAction(user, 'rotate', {
        tool: 'rotate',
        status: 'success',
        meta: { outputName: name }
      });
    } catch (err) {
      setError('Rotation failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'rotate', {
        tool: 'rotate',
        status: 'error',
        meta: { error: err?.message || 'Rotation failed' }
      });
    } finally { setRotating(false); setProgress(0); }
  };

  return (
    <ToolPageLayout title="Rotate PDF"
      subtitle="Rotate all pages in a PDF by 90°, 180°, or 270° — instantly in your browser."
      icon="🔄"
    >
      <SEO keywords="rotate pdf, flip pdf, turn pdf, pdf page rotation, free online pdf tools" title="Rotate PDF Online Free � OM PDF | 90� 180� 270�" description="Rotate all pages of a PDF by 90�, 180� or 270�. Fast, free and private � processed entirely in your browser." url="https://om-pdf.netlify.app/rotate-pdf" />
      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to rotate" hint="Single PDF · Max 200 MB" />
      ) : (
        <div className="split-file-info">
          {/* File card */}
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span></div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="split-option-panel">
            <label className="split-label">Rotate pages individually</label>
            <div className="rotate-tools">
              <button className="btn-text" type="button" onClick={() => rotateAll(90)}>Rotate all ↺</button>
              <button className="btn-text" type="button" onClick={() => rotateAll(270)}>Rotate all ↻</button>
            </div>
            <div className="rotate-grid">
              {pageThumbs.map((thumb, idx) => (
                <div key={idx} className={`rotate-card${selectedPage === idx + 1 ? ' active' : ''}`}>
                  <button type="button" className="rotate-thumb" onClick={() => setSelectedPage(idx + 1)}>
                    {thumb
                      ? <img src={thumb} alt={`Page ${idx + 1} preview`} />
                      : <div className="page-thumb-placeholder" aria-hidden="true" />}
                  </button>
                  <div className="rotate-card-footer">
                    <span>Page {idx + 1}</span>
                    <div className="rotate-card-actions">
                      <button type="button" onClick={() => rotatePage(idx, 270)}>↻</button>
                      <button type="button" onClick={() => rotatePage(idx, 90)}>↺</button>
                    </div>
                  </div>
                  {rotations[idx] ? <span className="rotate-badge">{rotations[idx]}°</span> : null}
                </div>
              ))}
            </div>
            <div className="rotate-preview">
              <Document file={file} loading="Loading preview…">
                <Page pageNumber={selectedPage} width={420} renderAnnotationLayer={false} renderTextLayer={false} />
              </Document>
            </div>
          </div>

          {error   && <div className="alert alert-error"><span>❌ {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {rotating && <ProgressBar pct={progress} label="Rotating PDF…" />}
          {success && (
            <SuccessBanner message="PDF rotated!" details={success} onDismiss={() => setSuccess('')}>
              <button
                className="btn-action-sm btn-action-download"
                onClick={() => download(lastBytes, lastName)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Again
              </button>
              <SaveToDriveButton
                bytes={lastBytes}
                filename={lastName}
                toolFolder="Rotated"
              />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button
              className="btn-merge"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB)' }}
              onClick={handleRotate}
              disabled={rotating}
            >
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Rotate PDF
              </span>
            </button>
            <p className="merge-hint">🔒 Processed locally — no upload</p>
          </div>
        </div>
      )}
      <RecentFilesPanel tool="rotate" title="Recent rotations" />
    </ToolPageLayout>
  );
}








