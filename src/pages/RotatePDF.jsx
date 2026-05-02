import React, { useState } from 'react';
import useSEO from '../hooks/useSEO';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { formatBytes } from '../fileManager';

const ANGLES = [
  { label: '90° Clockwise',         value: -90  },
  { label: '180° (Flip)',            value: 180  },
  { label: '90° Counter-Clockwise',  value: 90   },
];

async function rotatePDF(file, angle, onProgress) {
  onProgress?.(10);
  const buf    = await file.arrayBuffer();
  onProgress?.(30);
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages  = pdfDoc.getPages();
  onProgress?.(50);
  pages.forEach(page => page.setRotation(degrees((page.getRotation().angle + angle + 360) % 360)));
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
  useSEO('Rotate PDF Online Free � OM PDF | 90� 180� 270�','Rotate all pages of a PDF by 90�, 180� or 270�. Fast, free and private � processed entirely in your browser.','https://om-pdf.netlify.app/rotate-pdf');
  const [file, setFile]         = useState(null);
  const [angle, setAngle]       = useState(-90);
  const [progress, setProgress] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName]   = useState('');

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : raw[0];
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess('');
  };

  const handleRotate = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setRotating(true); setProgress(0);
    try {
      const bytes = await rotatePDF(file, angle, setProgress);
      const name  = file.name.replace(/\.pdf$/i, `_rotated.pdf`);
      setLastBytes(bytes); setLastName(name);
      download(bytes, name);
      setSuccess(`"${name}" rotated ${Math.abs(angle)}°`);
    } catch (err) {
      setError('Rotation failed: ' + (err.message || 'Unexpected error.'));
    } finally { setRotating(false); setProgress(0); }
  };

  return (
    <ToolPageLayout
      title="Rotate PDF"
      subtitle="Rotate all pages in a PDF by 90°, 180°, or 270° — instantly in your browser."
      icon="🔄"
    >
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

          {/* Angle selector */}
          <div className="split-option-panel">
            <label className="split-label">Rotation direction</label>
            <div className="rotate-angle-grid">
              {ANGLES.map(a => (
                <button
                  key={a.value}
                  className={`rotate-angle-btn${angle === a.value ? ' active' : ''}`}
                  onClick={() => setAngle(a.value)}
                >
                  <span className="rotate-icon" style={{ transform: `rotate(${a.value === -90 ? 90 : a.value === 90 ? -90 : 180}deg)` }}>↻</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {error   && <div className="alert alert-error"><span>❌ {error}</span></div>}
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
    </ToolPageLayout>
  );
}
