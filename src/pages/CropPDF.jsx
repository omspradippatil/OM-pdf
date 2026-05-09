import React, { useMemo, useState } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';
import '../styles/CropPDF.css';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { formatBytes } from '../fileManager';
import { PDFDocument } from 'pdf-lib';
import PdfCanvas from '../components/PdfCanvas';

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function cropPdf(file, margins, onProgress) {
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const total = pages.length;

  pages.forEach((page, idx) => {
    const { width, height } = page.getSize();
    const left = clamp(margins.left, 0, width - 1);
    const right = clamp(margins.right, 0, width - left - 1);
    const bottom = clamp(margins.bottom, 0, height - 1);
    const top = clamp(margins.top, 0, height - bottom - 1);

    const newWidth = width - left - right;
    const newHeight = height - top - bottom;

    page.setCropBox(left, bottom, newWidth, newHeight);
    page.setMediaBox(left, bottom, newWidth, newHeight);

    onProgress?.(Math.round(((idx + 1) / total) * 90));
  });

  onProgress?.(98);
  return pdfDoc.save();
}

export default function CropPDF() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const [previewDims, setPreviewDims] = useState(null);
  const [previewError, setPreviewError] = useState('');

  const [unit, setUnit] = useState('pt');
  const [margins, setMargins] = useState({ top: 24, right: 24, bottom: 24, left: 24 });
  const [uniform, setUniform] = useState(true);
  const [uniformValue, setUniformValue] = useState(24);

  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: working ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: working ? progress : success ? 100 : 0,
    etaMs: file.size ? Math.max(1200, Math.round((file.size / (1024 * 1024)) * 900)) : null,
    message: error || '',
  }] : [];

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setProgress(0);
  };

  const convertToPt = (value) => {
    if (unit === 'pt') return value;
    if (unit === 'mm') return value * 2.83465;
    if (unit === 'in') return value * 72;
    return value;
  };

  const onChangeMargin = (key, value) => {
    setMargins(prev => ({ ...prev, [key]: value }));
  };

  const applyUniform = (value) => {
    setUniformValue(value);
    setMargins({ top: value, right: value, bottom: value, left: value });
  };

  const applyPreset = (value) => {
    applyUniform(value);
    setUniform(true);
  };

  const derived = useMemo(() => {
    const values = {
      top: convertToPt(margins.top),
      right: convertToPt(margins.right),
      bottom: convertToPt(margins.bottom),
      left: convertToPt(margins.left),
    };
    return values;
  }, [margins, unit]);

  const preview = useMemo(() => {
    if (!previewDims) return null;
    const left = clamp(derived.left * previewDims.scale, 0, previewDims.width - 1);
    const right = clamp(derived.right * previewDims.scale, 0, previewDims.width - left - 1);
    const bottom = clamp(derived.bottom * previewDims.scale, 0, previewDims.height - 1);
    const top = clamp(derived.top * previewDims.scale, 0, previewDims.height - bottom - 1);
    const width = Math.max(1, previewDims.width - left - right);
    const height = Math.max(1, previewDims.height - top - bottom);
    return { left, right, top, bottom, width, height };
  }, [derived, previewDims]);

  const handleApply = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const bytes = await cropPdf(file, derived, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_cropped.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes);
      setLastName(name);
      setSuccess(`"${name}" saved`);

      addRecentFile({ tool: 'crop', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'crop', {
        tool: 'crop',
        status: 'success',
        meta: {
          outputName: name,
          unit,
          margins: derived,
        }
      });
    } catch (err) {
      setError('Crop failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'crop', {
        tool: 'crop',
        status: 'error',
        meta: { error: err?.message || 'Crop failed' }
      });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  return (
    <ToolPageLayout
      title="Crop PDF"
      subtitle="Trim white margins on every page with precise controls."
      icon="✂️"
    >
      <SEO
        keywords="crop pdf, trim pdf margins"
        title="Crop PDF Online Free — Trim Margins | OM PDF"
        description="Trim PDF margins locally in your browser. No upload required."
        url="https://om-pdf.netlify.app/crop-pdf"
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to crop" hint="Single PDF - Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span></div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-option-panel">
            <div className="crop-toolbar">
              <div>
                <div className="crop-title">Crop margins</div>
                <div className="crop-sub">Apply to all pages (best for removing white borders)</div>
              </div>
              <div className="crop-unit">
                <label className="split-label" htmlFor="cropUnit">Units</label>
                <select id="cropUnit" className="pn-select" value={unit} onChange={e => setUnit(e.target.value)}>
                  <option value="pt">pt</option>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>

            <div className="crop-presets">
              <span className="crop-presets-label">Presets</span>
              <button type="button" className="crop-chip" onClick={() => applyPreset(0)}>None</button>
              <button type="button" className="crop-chip" onClick={() => applyPreset(12)}>Small</button>
              <button type="button" className="crop-chip" onClick={() => applyPreset(24)}>Medium</button>
              <button type="button" className="crop-chip" onClick={() => applyPreset(36)}>Large</button>
              <button type="button" className="crop-chip" onClick={() => applyPreset(60)}>Extra</button>
            </div>

            <label className="crop-toggle">
              <input
                type="checkbox"
                checked={uniform}
                onChange={(e) => {
                  const next = e.target.checked;
                  setUniform(next);
                  if (next) applyUniform(uniformValue);
                }}
              />
              Use uniform margins
            </label>

            {uniform ? (
              <div className="crop-grid">
                <div className="crop-field">
                  <label className="split-label" htmlFor="cropAll">All sides</label>
                  <input
                    id="cropAll"
                    className="split-range-input"
                    type="number"
                    min={0}
                    step={1}
                    value={uniformValue}
                    onChange={e => applyUniform(parseFloat(e.target.value) || 0)}
                  />
                  <input
                    className="crop-range"
                    type="range"
                    min={0}
                    max={200}
                    value={uniformValue}
                    onChange={e => applyUniform(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>
            ) : (
              <div className="crop-grid">
                <div className="crop-field">
                  <label className="split-label" htmlFor="cropTop">Top</label>
                  <input id="cropTop" className="split-range-input" type="number" min={0} step={1}
                    value={margins.top} onChange={e => onChangeMargin('top', parseFloat(e.target.value) || 0)} />
                  <input className="crop-range" type="range" min={0} max={200} value={margins.top}
                    onChange={e => onChangeMargin('top', parseInt(e.target.value, 10) || 0)} />
                </div>
                <div className="crop-field">
                  <label className="split-label" htmlFor="cropRight">Right</label>
                  <input id="cropRight" className="split-range-input" type="number" min={0} step={1}
                    value={margins.right} onChange={e => onChangeMargin('right', parseFloat(e.target.value) || 0)} />
                  <input className="crop-range" type="range" min={0} max={200} value={margins.right}
                    onChange={e => onChangeMargin('right', parseInt(e.target.value, 10) || 0)} />
                </div>
                <div className="crop-field">
                  <label className="split-label" htmlFor="cropBottom">Bottom</label>
                  <input id="cropBottom" className="split-range-input" type="number" min={0} step={1}
                    value={margins.bottom} onChange={e => onChangeMargin('bottom', parseFloat(e.target.value) || 0)} />
                  <input className="crop-range" type="range" min={0} max={200} value={margins.bottom}
                    onChange={e => onChangeMargin('bottom', parseInt(e.target.value, 10) || 0)} />
                </div>
                <div className="crop-field">
                  <label className="split-label" htmlFor="cropLeft">Left</label>
                  <input id="cropLeft" className="split-range-input" type="number" min={0} step={1}
                    value={margins.left} onChange={e => onChangeMargin('left', parseFloat(e.target.value) || 0)} />
                  <input className="crop-range" type="range" min={0} max={200} value={margins.left}
                    onChange={e => onChangeMargin('left', parseInt(e.target.value, 10) || 0)} />
                </div>
              </div>
            )}

            <div className="crop-hint">Tip: 24pt = 1/3 inch. Adjust margins until borders disappear.</div>
          </div>

          <div className="crop-preview">
            <div className="crop-preview-card">
              <div className="crop-preview-label">Original</div>
              <div className="crop-preview-frame">
                <div
                  className="crop-preview-canvas"
                  style={{
                    width: previewDims?.width || 'auto',
                    height: previewDims?.height || 'auto',
                  }}
                >
                  <PdfCanvas
                    file={file}
                    pageNumber={1}
                    width={420}
                    onRender={({ width, height, scale }) => {
                      setPreviewDims({ width, height, scale });
                      setPreviewError('');
                    }}
                    onError={(err) => setPreviewError(err?.message || 'Preview failed to load.')}
                  />
                  {preview ? (
                    <div
                      className="crop-preview-overlay"
                      style={{
                        left: preview.left,
                        top: preview.top,
                        width: preview.width,
                        height: preview.height,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="crop-preview-card">
              <div className="crop-preview-label">Cropped preview</div>
              <div className="crop-preview-frame">
                {preview ? (
                  <div
                    className="crop-preview-crop"
                    style={{ width: preview.width, height: preview.height }}
                  >
                    <div
                      className="crop-preview-shift"
                      style={{ transform: `translate(${-preview.left}px, ${-preview.top}px)` }}
                    >
                      <PdfCanvas file={file} pageNumber={1} width={420} />
                    </div>
                  </div>
                ) : (
                  <div className="crop-preview-empty">Adjust margins to see crop preview.</div>
                )}
              </div>
            </div>
          </div>

          {previewError ? <div className="alert alert-error"><span>! {previewError}</span></div> : null}

          {error && <div className="alert alert-error"><span>! {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {working && <ProgressBar pct={progress} label="Cropping pages..." />}

          {success && (
            <SuccessBanner message="Crop complete!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Cropped" />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button className="btn-merge" onClick={handleApply} disabled={working}>
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 9h6v6H9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Apply Crop
              </span>
            </button>
            <p className="merge-hint">Processed locally - no upload</p>
          </div>
        </div>
      )}

      <RecentFilesPanel tool="crop" title="Recent crops" />
    </ToolPageLayout>
  );
}
