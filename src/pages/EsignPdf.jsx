import React, { useState, useRef, useCallback, useEffect } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { PDFDocument, rgb } from 'pdf-lib';
import PdfCanvas from '../components/PdfCanvas';

/* ─── Types ────────────────────────────────────────────────────── */
const FIELD_TYPES = ['Signature', 'Initial', 'Date', 'Name'];
const FIELD_COLORS = {
  Signature: '#3949ab',
  Initial:   '#0891b2',
  Date:      '#059669',
  Name:      '#d97706',
};

let nextId = 1;

/* ─── Helpers ──────────────────────────────────────────────────── */
function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

/** Draw text/value onto a PDF page at % coords using pdf-lib */
async function applyFieldsToPdf(file, fields) {
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (const f of fields) {
    if (!f.value?.trim()) continue;
    const page = pages[f.pageIndex] || pages[0];
    const { width: pw, height: ph } = page.getSize();

    // Convert %  →  PDF coordinates (Y axis flipped)
    const x = (f.x / 100) * pw;
    const y = ph - (f.y / 100) * ph - 20; // 20pt text height offset

    const [r, g, b] = hexToRgb(FIELD_COLORS[f.type] || '#000000');
    page.drawText(f.value, {
      x: Math.max(0, x),
      y: Math.max(0, y),
      size: f.type === 'Signature' ? 22 : 14,
      color: rgb(r, g, b),
    });
  }

  return pdfDoc.save();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

/* ─── Component ────────────────────────────────────────────────── */
export default function EsignPdf() {
  const { user } = useAuth();
  const [file, setFile]           = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [fields, setFields]       = useState([]);
  const [activeType, setActiveType] = useState('Signature');
  const [placing, setPlacing]     = useState(false); // click-to-place mode
  const [selected, setSelected]   = useState(null);  // selected field id

  const [working, setWorking]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName]   = useState('');

  const overlayRef = useRef(null);

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Please select a valid PDF.'); return; }
    setFile(f); setFields([]); setError(''); setSuccess(''); setPageIndex(0);
  };

  const handleCanvasClick = useCallback((e) => {
    if (!placing || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top)  / rect.height) * 100;

    const newField = {
      id:        nextId++,
      type:      activeType,
      pageIndex,
      x: xPct,
      y: yPct,
      value:     '',
    };
    setFields(prev => [...prev, newField]);
    setSelected(newField.id);
    setPlacing(false);
  }, [placing, activeType, pageIndex]);

  const updateField = (id, key, val) =>
    setFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));

  const removeField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selected === id) setSelected(null);
  };

  const handleApply = async () => {
    if (!file) return;
    const filled = fields.filter(f => f.value?.trim());
    if (!filled.length) { setError('Add at least one field with a value before applying.'); return; }

    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const bytes = await applyFieldsToPdf(file, filled);
      setProgress(90);
      const name = file.name.replace(/\.pdf$/i, '_signed.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created with ${filled.length} field${filled.length !== 1 ? 's' : ''}!`);
      addRecentFile({ tool: 'esign_pdf', name, size: bytes.byteLength });
      bumpLocalJob();
      await logUserAction(user, 'esign_pdf', { tool: 'esign_pdf', status: 'success', meta: { fields: filled.length } });
      setProgress(100);
    } catch (err) {
      setError('Failed to apply fields: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'esign_pdf', { tool: 'esign_pdf', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
    }
  };

  const pageFields = fields.filter(f => f.pageIndex === pageIndex);
  const selField   = fields.find(f => f.id === selected);

  /* ─── Sidebar ─────────────────────────────────────────────────── */
  const sidebarContent = (
    <>
      <p className="ux-section-label">Add Field</p>

      {/* Type selector */}
      <div className="ux-field">
        <label className="ux-label">Field Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {FIELD_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: `2px solid ${activeType === t ? FIELD_COLORS[t] : 'var(--border)'}`,
                background: activeType === t ? FIELD_COLORS[t] + '18' : 'var(--bg-card)',
                color: activeType === t ? FIELD_COLORS[t] : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="ux-field">
        <label className="ux-label">Page (1-based)</label>
        <input
          className="ux-input"
          type="number"
          min={1}
          max={pageCount}
          value={pageIndex + 1}
          onChange={e => setPageIndex(Math.max(0, Math.min(pageCount - 1, parseInt(e.target.value) - 1 || 0)))}
        />
      </div>

      <button
        className={placing ? 'ux-btn-primary' : 'ux-btn-secondary'}
        style={{ width: '100%', marginTop: 4 }}
        onClick={() => setPlacing(p => !p)}
      >
        {placing ? '🖱️ Click canvas to place…' : `➕ Place ${activeType} Field`}
      </button>

      {/* Field list */}
      {fields.length > 0 && (
        <>
          <p className="ux-section-label" style={{ marginTop: 20 }}>Fields ({fields.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {fields.map(f => (
              <div
                key={f.id}
                onClick={() => { setSelected(f.id); setPageIndex(f.pageIndex); }}
                style={{
                  background: selected === f.id ? FIELD_COLORS[f.type] + '15' : 'var(--bg-muted)',
                  border: `1px solid ${selected === f.id ? FIELD_COLORS[f.type] : 'var(--border)'}`,
                  borderRadius: 8,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: FIELD_COLORS[f.type], minWidth: 64 }}>
                  {f.type} <span style={{ opacity: 0.6 }}>p.{f.pageIndex + 1}</span>
                </span>
                <span style={{ flex: 1, fontSize: '0.78rem', color: f.value ? 'var(--text)' : 'var(--text-muted)', fontStyle: f.value ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.value || '(empty)'}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); removeField(f.id); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                >✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Selected field editor */}
      {selField && (
        <>
          <p className="ux-section-label" style={{ marginTop: 16 }}>Edit: {selField.type}</p>
          <div className="ux-field">
            <label className="ux-label">Value</label>
            <input
              className="ux-input"
              type={selField.type === 'Date' ? 'date' : 'text'}
              value={selField.value}
              placeholder={selField.type === 'Signature' ? 'e.g. John Doe' : selField.type === 'Date' ? '' : 'Enter value…'}
              onChange={e => updateField(selField.id, 'value', e.target.value)}
            />
          </div>
        </>
      )}

      {error  && <div className="alert alert-error"   style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Applying fields…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Signed!</p>
          </div>
          <div className="ux-result-body">
            <button className="ux-btn-primary" onClick={() => downloadBytes(lastBytes, lastName)}>↓ Download Again</button>
            <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Signed" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !file || !fields.length}>
      {working ? 'Applying…' : '✅ Apply & Download'}
    </button>
  );

  /* ─── Render ──────────────────────────────────────────────────── */
  return (
    <ToolPageLayout
      title="E-Sign PDF"
      subtitle="Place signature, name, date and initial fields. 100% offline."
      icon="✍️"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="esignPdf" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to sign" hint="Single PDF · Click to place fields on any page" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                Page {pageIndex + 1}
                {pageCount > 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.9rem' }}> of {pageCount}</span>}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {placing ? '🖱️ Click on the page to place a field' : 'Use "Place Field" in the sidebar, then click the page.'}
              </p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile(null); setFields([]); setSuccess(''); }}>
              Remove File
            </button>
          </div>

          {/* Canvas + overlay */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 20, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'auto' }}>
            <div
              ref={overlayRef}
              style={{ position: 'relative', cursor: placing ? 'crosshair' : 'default', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
              onClick={handleCanvasClick}
            >
              <PdfCanvas
                file={file}
                pageNumber={pageIndex + 1}
                width={600}
                onRender={({ pageCount: pc }) => pc && setPageCount(pc)}
                onError={err => setError('Preview error: ' + err.message)}
              />

              {/* Render field markers */}
              {pageFields.map(f => (
                <div
                  key={f.id}
                  onClick={e => { e.stopPropagation(); setSelected(f.id); setPlacing(false); }}
                  style={{
                    position: 'absolute',
                    left: `${f.x}%`,
                    top:  `${f.y}%`,
                    transform: 'translate(-50%, -50%)',
                    background: FIELD_COLORS[f.type] + (selected === f.id ? 'ee' : 'cc'),
                    color: '#fff',
                    borderRadius: 6,
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    border: selected === f.id ? '2px solid #fff' : '2px solid transparent',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    pointerEvents: 'auto',
                  }}
                >
                  {f.type}: {f.value || <em style={{ opacity: 0.7 }}>empty</em>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="esignPdf" />
    </ToolPageLayout>
  );
}
