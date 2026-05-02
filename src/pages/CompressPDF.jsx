import React, { useState } from 'react';
import useSEO from '../hooks/useSEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';

/**
 * Basic client-side PDF "compression":
 * Re-saves the PDF with pdf-lib which can remove some redundancy and clean object streams.
 * This is lightweight but real — not image recompression.
 */
async function compressPDF(file, onProgress) {
  onProgress?.(10);
  const buf = await file.arrayBuffer();
  onProgress?.(30);
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  onProgress?.(60);
  const bytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  onProgress?.(100);
  return bytes;
}

export default function CompressPDF() {
  useSEO('Compress PDF Online Free � OM PDF | Reduce PDF Size','Reduce PDF file size without losing quality. Free client-side PDF compression � your file never leaves your browser.','https://om-pdf.netlify.app/compress-pdf');
  const [file, setFile]         = useState(null);
  const [progress, setProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null); // { bytes, origSize, newSize, name }

  const loadFile = (raw) => {
    const f = raw[0];
    if (!f || f.type !== 'application/pdf') { setError('Please select a valid PDF.'); return; }
    setFile(f); setError(''); setResult(null);
  };

  const handleCompress = async () => {
    if (!file) return;
    setError(''); setResult(null); setCompressing(true); setProgress(0);
    try {
      const bytes = await compressPDF(file, setProgress);
      const savings = ((1 - bytes.byteLength / file.size) * 100).toFixed(1);
      setResult({ bytes, origSize: file.size, newSize: bytes.byteLength, savings, name: file.name.replace(/\.pdf$/i, '_compressed.pdf') });
    } catch (err) {
      setError('Compression failed: ' + (err.message || 'Unexpected error.'));
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
      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        <span>ℹ️ Client-side compression re-saves and optimises object streams. For heavy image-based PDFs, results may vary.</span>
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
    </ToolPageLayout>
  );
}
