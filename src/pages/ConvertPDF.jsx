import React, { useState, useRef } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';

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
    if (!blob) {
      throw new Error('Failed to render a page image for conversion.');
    }
    blobs.push({ blob, name: `page_${String(i).padStart(3,'0')}.jpg` });
    onProgress?.(Math.round((i / total) * 90));
  }
  return blobs;
}

export default function ConvertPDF() {
  
  const { user } = useAuth();
  const [file, setFile]     = useState(null);
  const [pages, setPages]   = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const lastBlobRef = useRef(null);
  const lastNameRef = useRef('');
  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: converting ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: converting ? progress : success ? 100 : 0,
    etaMs: file.size ? Math.max(1200, Math.round((file.size / (1024 * 1024)) * 900)) : null,
    message: error || '',
  }] : [];

  const loadFile = async (raw) => {
    const f = raw[0];
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess('');
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
      await logUserAction(user, 'convert', {
        tool: 'convert',
        status: 'success',
        meta: {
          pages: images.length,
          outputName,
          format: 'jpg',
          zipped: images.length > 1,
        }
      });
    } catch (err) {
      setError('Conversion failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'convert', {
        tool: 'convert',
        status: 'error',
        meta: { error: err?.message || 'Conversion failed' }
      });
    } finally { setConverting(false); setProgress(0); }
  };

  return (
    <ToolPageLayout title="Convert PDF to Images" subtitle="Export each page as a high-quality JPG image, right in your browser." icon="🖼️">
      <SEO keywords="pdf to jpg, convert pdf to image, extract images from pdf, pdf to jpeg, high quality pdf conversion" title="PDF to JPG Online Free — Convert PDF to Images | OM PDF" description="Convert PDF pages to high-quality JPG images instantly. Free, private, no upload — download as ZIP for multi-page PDFs." url="https://om-pdf.netlify.app/convert-pdf" />
      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        <span>ℹ️ Currently supports <strong>PDF → JPG</strong>. Doc/Word conversion requires a server and is not available client-side.</span>
      </div>

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to convert" hint="Single PDF · Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta">
                <span className="file-size">{formatBytes(file.size)}</span>
                <span className="file-pages">{pages ? `${pages} pages → ${pages} JPGs` : 'counting…'}</span>
              </div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setPages(null); setSuccess(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          {error && <div className="alert alert-error"><span>❌ {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {converting && <ProgressBar pct={progress} label="Converting pages to JPG…" />}
          {success && (
            <SuccessBanner message="Conversion complete!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton
                bytes={lastBlobRef.current}
                filename={lastNameRef.current}
                toolFolder="Converted"
                mimeType={lastNameRef.current?.endsWith('.zip') ? 'application/zip' : 'image/jpeg'}
              />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button className="btn-merge" style={{ background: 'linear-gradient(135deg,#10B981,#2563EB)' }}
              onClick={handleConvert} disabled={converting}>
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="16 3 21 3 21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="20" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="21 16 21 21 16 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Convert to JPG
              </span>
            </button>
            <p className="merge-hint">🔒 Processed locally — no server upload</p>
          </div>
        </div>
      )}
      <RecentFilesPanel tool="convert" title="Recent conversions" />
    </ToolPageLayout>
  );
}








