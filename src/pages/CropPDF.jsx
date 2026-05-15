import React, { useMemo, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
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
  const a = document.createElement('a'); a.href = url; a.download = name;
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

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0);
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
    return {
      top: convertToPt(margins.top),
      right: convertToPt(margins.right),
      bottom: convertToPt(margins.bottom),
      left: convertToPt(margins.left),
    };
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
    setError(''); setSuccess(''); setWorking(true); setProgress(0);
    try {
      const bytes = await cropPdf(file, derived, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_cropped.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created!`);
      addRecentFile({ tool: 'crop', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'crop', { tool: 'crop', status: 'success', meta: { outputName: name, unit, margins: derived } });
    } catch (err) {
      setError('Crop failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'crop', { tool: 'crop', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Crop Settings</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="cropUnit">Measurement Units</label>
        <select id="cropUnit" className="ux-input" value={unit} onChange={e => setUnit(e.target.value)}>
          <option value="pt">Points (pt)</option>
          <option value="mm">Millimeters (mm)</option>
          <option value="in">Inches (in)</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label">Presets</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          <button type="button" className="ux-chip" onClick={() => applyPreset(0)}>None</button>
          <button type="button" className="ux-chip" onClick={() => applyPreset(12)}>Small</button>
          <button type="button" className="ux-chip" onClick={() => applyPreset(24)}>Medium</button>
          <button type="button" className="ux-chip" onClick={() => applyPreset(36)}>Large</button>
        </div>
      </div>

      <div className="ux-toggle-row">
        <div className="ux-toggle-info">
          <p>Uniform Margins</p>
          <span>Apply same value to all sides</span>
        </div>
        <label className="ux-toggle">
          <input type="checkbox" checked={uniform} onChange={e => { setUniform(e.target.checked); if (e.target.checked) applyUniform(uniformValue); }} />
          <span className="ux-toggle-slider" />
        </label>
      </div>

      {uniform ? (
        <div className="ux-field" style={{ marginTop:12 }}>
          <label className="ux-label" htmlFor="cropAll">All Sides ({unit})</label>
          <input id="cropAll" className="ux-input" type="number" min={0} step={1} value={uniformValue} onChange={e => applyUniform(parseFloat(e.target.value) || 0)} />
          <input className="ux-range" type="range" min={0} max={200} value={uniformValue} onChange={e => applyUniform(parseInt(e.target.value, 10) || 0)} style={{ marginTop:8 }} />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
          {['top','right','bottom','left'].map(side => (
            <div className="ux-field" key={side}>
              <label className="ux-label" style={{ textTransform:'capitalize' }}>{side}</label>
              <input className="ux-input" type="number" min={0} value={margins[side]} onChange={e => onChangeMargin(side, parseFloat(e.target.value) || 0)} />
            </div>
          ))}
        </div>
      )}

      {error   && <div className="alert alert-error"   style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Cropping pages…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Cropped!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
               <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => downloadBytes(lastBytes, lastName)}>
                ↓ Download
              </button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Cropped" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !file}>
      {working ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Cropping…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9h6v6H9z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Apply Crop
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Crop PDF"
      subtitle="Trim white margins or focus on specific areas. 100% local."
      icon="✂️"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="crop" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to crop" hint="Single PDF · Max 200 MB" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Blue box shows the area that will be kept.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div style={{ display:'flex', flex:1, minHeight:400, gap:20, padding:'20px', background:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)', overflow:'auto' }}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>Original</p>
              <div style={{ position:'relative', boxShadow:'0 10px 30px rgba(0,0,0,0.1)', borderRadius:'4px', overflow:'hidden' }}>
                <PdfCanvas file={file} pageNumber={1} width={400}
                  onRender={({ width, height, scale }) => { setPreviewDims({ width, height, scale }); setPreviewError(''); }}
                  onError={(err) => setPreviewError(err?.message || 'Preview failed to load.')}
                />
                {preview && (
                  <div className="crop-preview-overlay" style={{ left: preview.left, top: preview.top, width: preview.width, height: preview.height, border:'2px solid var(--primary)', background:'rgba(79, 70, 229, 0.1)', position:'absolute' }} />
                )}
              </div>
            </div>

            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>Cropped Preview</p>
              <div style={{ boxShadow:'0 10px 30px rgba(0,0,0,0.1)', borderRadius:'4px', overflow:'hidden', width: preview?.width || 0, height: preview?.height || 0, background:'#fff' }}>
                {preview ? (
                  <div style={{ transform: `translate(${-preview.left}px, ${-preview.top}px)` }}>
                    <PdfCanvas file={file} pageNumber={1} width={400} />
                  </div>
                ) : (
                  <div style={{ height:400, width:300, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>Loading preview…</div>
                )}
              </div>
            </div>
          </div>
          {previewError && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {previewError}</span></div>}
        </div>
      )}

      <ToolSeoContent toolKey="crop" />
      <RecentFilesPanel tool="crop" title="Recent crops" />
    </ToolPageLayout>
  );
}
