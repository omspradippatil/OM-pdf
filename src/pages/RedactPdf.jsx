import React, { useState, useRef, useEffect } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { formatBytes } from '../fileManager';
import { PDFDocument, rgb } from 'pdf-lib';
import PdfCanvas from '../components/PdfCanvas';


async function redactPdf(file, boxesByPage, onProgress) {
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const total = pages.length;

  pages.forEach((page, idx) => {
    const { width: pw, height: ph } = page.getSize();
    const boxes = boxesByPage[idx] || [];
    
    boxes.forEach(box => {
      // box coords are in percentages
      const x = (box.x / 100) * pw;
      const topToBottomY = (box.y / 100) * ph;
      const w = (box.w / 100) * pw;
      const h = (box.h / 100) * ph;
      const y = ph - topToBottomY - h; // PDF coordinates

      page.drawRectangle({
        x, y, width: w, height: h, color: rgb(0, 0, 0)
      });
    });

    onProgress?.(Math.round(((idx + 1) / total) * 90));
  });

  onProgress?.(98);
  return pdfDoc.save();
}

export default function RedactPdf() {
  const { triggerExport } = useExport();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const [previewDims, setPreviewDims] = useState(null);
  
  const [pageIndex, setPageIndex] = useState(0);
  const [boxesByPage, setBoxesByPage] = useState({}); // { pageIndex: [{x, y, w, h}] }

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentBox, setCurrentBox] = useState(null);
  const drawRef = useRef(null);

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0); setPageIndex(0); setBoxesByPage({});
  };

  const handleApply = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const bytes = await redactPdf(file, boxesByPage, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_redacted.pdf');
      triggerExport(bytes, name, 'application/pdf', "Redacted");
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created!`);
      addRecentFile({ tool: 'redact', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'redact', { tool: 'redact', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Redaction failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'redact', { tool: 'redact', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const clearPage = () => {
    setBoxesByPage(prev => {
      const next = { ...prev };
      delete next[pageIndex];
      return next;
    });
  };

  const getCoords = (e, rect) => {
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    return { x: (x / rect.width) * 100, y: (y / rect.height) * 100 };
  };

  const onPointerDown = (e) => {
    if (!previewDims || !drawRef.current) return;
    setIsDrawing(true);
    e.target.setPointerCapture(e.pointerId);
    const pos = getCoords(e, drawRef.current.getBoundingClientRect());
    setStartPos(pos);
    setCurrentBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const onPointerMove = (e) => {
    if (!isDrawing || !startPos || !drawRef.current) return;
    const pos = getCoords(e, drawRef.current.getBoundingClientRect());
    
    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const w = Math.abs(pos.x - startPos.x);
    const h = Math.abs(pos.y - startPos.y);
    
    setCurrentBox({ x, y, w, h });
  };

  const onPointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    e.target.releasePointerCapture(e.pointerId);
    if (currentBox && currentBox.w > 0.5 && currentBox.h > 0.5) {
      setBoxesByPage(prev => ({
        ...prev,
        [pageIndex]: [...(prev[pageIndex] || []), currentBox]
      }));
    }
    setCurrentBox(null);
    setStartPos(null);
  };

  const currentPageBoxes = boxesByPage[pageIndex] || [];

  const sidebarContent = (
    <>
      <p className="ux-section-label">Redaction Settings</p>
      
      <div className="ux-field">
        <label className="ux-label">Page Number</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ux-btn-secondary" onClick={() => setPageIndex(p => Math.max(0, p - 1))}>←</button>
          <input className="ux-input" type="number" min={1} value={pageIndex + 1} onChange={(e) => setPageIndex(Math.max(0, parseInt(e.target.value) - 1 || 0))} style={{ textAlign: 'center' }} />
          <button className="ux-btn-secondary" onClick={() => setPageIndex(p => p + 1)}>→</button>
        </div>
      </div>

      <div className="ux-field">
        <button className="ux-btn-secondary" onClick={clearPage} disabled={currentPageBoxes.length === 0} style={{ width: '100%' }}>
          Clear Page Rectangles
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Draw rectangles over the preview to redact sensitive data. The selected areas will be permanently covered.
      </p>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Redacting document…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Redacted!</p>
          </div>
          <div className="ux-result-body">
             <button className="ux-btn-primary" onClick={() => triggerExport(lastBytes, lastName, 'application/pdf', "Redacted")}>↓ Download</button>
             <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Redacted" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !file}>
      {working ? 'Redacting…' : 'Apply Redactions'}
    </button>
  );

  return (
    <ToolPageLayout
      title="PDF Redactor"
      subtitle="Mask and sanitize sensitive data permanently. 100% offline."
      icon="⬛"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="redact" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to redact" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Click and drag to draw redaction boxes.</p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile(null); setSuccess(''); }}>Remove File</button>
          </div>

          <div style={{ flex:1, display:'flex', justifyContent:'center', padding:20, background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'auto' }}>
            <div 
              ref={drawRef}
              style={{ position:'relative', boxShadow:'0 10px 30px rgba(0,0,0,0.1)', cursor: 'crosshair', touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <PdfCanvas 
                file={file} 
                pageNumber={pageIndex + 1} 
                width={600}
                onRender={({ width, height }) => setPreviewDims({ width, height })}
                onError={(err) => setError('Preview error: ' + err.message)}
              />
              {previewDims && currentPageBoxes.map((box, i) => (
                <div key={i} style={{ 
                  position: 'absolute', 
                  left: `${box.x}%`, 
                  top: `${box.y}%`, 
                  width: `${box.w}%`, 
                  height: `${box.h}%`, 
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  pointerEvents: 'none'
                }} />
              ))}
              {previewDims && currentBox && (
                <div style={{ 
                  position: 'absolute', 
                  left: `${currentBox.x}%`, 
                  top: `${currentBox.y}%`, 
                  width: `${currentBox.w}%`, 
                  height: `${currentBox.h}%`, 
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '1px dashed #000',
                  pointerEvents: 'none'
                }} />
              )}
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="redact" />
    </ToolPageLayout>
  );
}
