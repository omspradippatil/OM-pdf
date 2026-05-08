import React, { useState } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { pdfjsLib } from '../utils/pdfjs';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';

import { runPdfWorkerTask } from '../workers/workerClient';

/**
 * Basic client-side PDF "compression":
 * Re-saves the PDF with pdf-lib which can remove some redundancy and clean object streams.
 * This is lightweight but real — not image recompression.
 */
async function compressPDF(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const { bytes } = await runPdfWorkerTask('compress_lossless', { buffer }, [buffer], onProgress);
  return bytes;
}

async function compressByRaster(file, { quality, scale }, onProgress) {
  onProgress?.(5);
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf, verbosity: 0 }).promise;
  const total = pdf.numPages;
  const outDoc = await PDFDocument.create();

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) {
      throw new Error('Failed to render a page image for compression.');
    }
    const imgBuf = await blob.arrayBuffer();
    const img = await outDoc.embedJpg(imgBuf);
    const outPage = outDoc.addPage([viewport.width, viewport.height]);
    outPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    onProgress?.(Math.round((i / total) * 90));
    await new Promise(r => setTimeout(r, 0));
  }

  onProgress?.(98);
  const bytes = await outDoc.save();
  onProgress?.(100);
  return bytes;
}

export default function CompressPDF() {
  
  const { user } = useAuth();
  const [file, setFile]         = useState(null);
  const [progress, setProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null); // { bytes, origSize, newSize, name }
  const [mode, setMode] = useState('lossless');
  const [quality, setQuality] = useState(0.72);
  const [scale, setScale] = useState(1.4);
  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: compressing ? 'processing' : error ? 'error' : result ? 'done' : 'ready',
    progress: compressing ? progress : result ? 100 : 0,
    etaMs: file.size ? Math.max(1200, Math.round((file.size / (1024 * 1024)) * 900)) : null,
    message: error || '',
  }] : [];

  const loadFile = (raw) => {
    const f = raw[0];
    if (!f || f.type !== 'application/pdf') { setError('Please select a valid PDF.'); return; }
    setFile(f); setError(''); setResult(null);
  };

  const handleCompress = async () => {
    if (!file) return;
    setError(''); setResult(null); setCompressing(true); setProgress(0);
    try {
      const bytes = mode === 'lossless'
        ? await compressPDF(file, setProgress)
        : await compressByRaster(file, { quality, scale }, setProgress);
      const savings = ((1 - bytes.byteLength / file.size) * 100).toFixed(1);
      setResult({ bytes, origSize: file.size, newSize: bytes.byteLength, savings, name: file.name.replace(/\.pdf$/i, '_compressed.pdf') });
      addRecentFile({ tool: 'compress', name: file.name.replace(/\.pdf$/i, '_compressed.pdf'), size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'compress', {
        tool: 'compress',
        status: 'success',
        meta: {
          outputName: file.name.replace(/\.pdf$/i, '_compressed.pdf'),
          originalSize: file.size,
          newSize: bytes.byteLength,
          savings: Number(savings),
          mode,
          quality,
          scale,
        }
      });
    } catch (err) {
      setError('Compression failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'compress', {
        tool: 'compress',
        status: 'error',
        meta: { error: err?.message || 'Compression failed' }
      });
    } finally { setCompressing(false); setProgress(0); }
  };

  const downloadResult = () => {
    if (!result) return;
    const blob = new Blob([result.bytes], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = result.name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  };

  return (
    <ToolPageLayout title="Compress PDF" subtitle="Reduce PDF file size using client-side stream optimization." icon="⚡">
      <SEO keywords="compress pdf, reduce pdf size, shrink pdf, pdf optimizer, small pdf, local pdf compression" title="Compress PDF Online Free — Reduce PDF Size | OM PDF" description="Reduce PDF file size without losing quality. Free client-side PDF compression — your file never leaves your browser." url="https://om-pdf.netlify.app/compress-pdf" />
      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        <span>ℹ️ Choose lossless (safe) or lossy (smaller size). Lossy mode rasterizes pages to images.</span>
      </div>

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to compress" hint="Single PDF · Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span></div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setResult(null); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          {error && <div className="alert alert-error"><span>❌ {error}</span></div>}
          <div className="split-option-panel">
            <label className="split-label">Compression mode</label>
            <div className="split-modes">
              <button className={`split-mode-btn${mode === 'lossless' ? ' active' : ''}`} onClick={() => setMode('lossless')}>Lossless</button>
              <button className={`split-mode-btn${mode === 'lossy' ? ' active' : ''}`} onClick={() => setMode('lossy')}>Lossy (smaller)</button>
            </div>
            {mode === 'lossy' && (
              <div className="compress-controls">
                <label className="split-label" htmlFor="qualityRange">JPEG quality ({Math.round(quality * 100)}%)</label>
                <input id="qualityRange" type="range" min={50} max={95} value={Math.round(quality * 100)}
                  onChange={e => setQuality(Math.min(0.95, Math.max(0.5, parseInt(e.target.value, 10) / 100)))} />
                <label className="split-label" htmlFor="scaleRange">Render scale ({scale.toFixed(1)}x)</label>
                <input id="scaleRange" type="range" min={10} max={20} value={Math.round(scale * 10)}
                  onChange={e => setScale(Math.min(2, Math.max(1, parseInt(e.target.value, 10) / 10)))} />
              </div>
            )}
          </div>
          <QueuePanel title="File queue" items={queueItems} />
          {compressing && <ProgressBar pct={progress} label="Compressing PDF…" />}

          {result && (
            <SuccessBanner
              message="Compression complete!"
              details={`${formatBytes(result.origSize)} → ${formatBytes(result.newSize)} (${result.savings > 0 ? '-' + result.savings + '%' : 'no reduction'})`}
              onDismiss={() => setResult(null)}
            >
              <button className="btn-action-sm btn-action-download" onClick={downloadResult}>↓ Download</button>
              <SaveToDriveButton
                bytes={result.bytes}
                filename={result.name}
                toolFolder="Compressed"
              />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button className="btn-merge" style={{ background: 'linear-gradient(135deg,#0EA5E9,#2563EB)' }}
              onClick={handleCompress} disabled={compressing}>
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Compress PDF
              </span>
            </button>
            <p className="merge-hint">🔒 Processed locally — no upload</p>
          </div>
        </div>
      )}
      <RecentFilesPanel tool="compress" title="Recent compressions" />
    </ToolPageLayout>
  );
}








