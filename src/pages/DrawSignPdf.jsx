import { useState, useRef, useMemo, useCallback } from 'react';
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
import { PDFDocument } from 'pdf-lib';
import PdfCanvas from '../components/PdfCanvas';
import { dataUrlToBytes, imageToPngDataUrl } from '../utils/dataUrl';
import '../styles/DrawSignPdf.css';

// Font styles for typed signatures
const SIGNATURE_FONTS = [
  { id: 'cursive', name: 'Elegant Cursive', font: 'italic 52px "Brush Script MT", "Dancing Script", cursive' },
  { id: 'formal', name: 'Formal Script', font: 'italic 48px "Lucida Calligraphy", "Great Vibes", cursive' },
  { id: 'serif', name: 'Classic Serif', font: 'italic bold 44px "Times New Roman", serif' },
  { id: 'handwriting', name: 'Handwritten', font: '50px "Caveat", "Comic Sans MS", cursive' },
];

/**
 * Generate a high-DPI transparent PNG signature from text
 */
function createTextSignature(text, fontColor, fontDef) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = fontDef || SIGNATURE_FONTS[0].font;
  ctx.fillStyle = fontColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 400, 100);
  return canvas.toDataURL('image/png');
}

/**
 * Apply signature image to specified page in PDF using pure in-memory bytes
 */
async function applySignature(file, sigDataUrl, pageIndex, xPct, yPct, scale, onProgress) {
  onProgress?.(20);
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const targetPageIndex = Math.max(0, Math.min(pageIndex, pages.length - 1));
  const page = pages[targetPageIndex];

  if (!page) throw new Error("Invalid page index");

  onProgress?.(50);
  // Safely convert Data URL to bytes without window.fetch to avoid Safari "Load failed" errors
  const sigImageBytes = dataUrlToBytes(sigDataUrl);
  const img = await pdfDoc.embedPng(sigImageBytes);

  const imgDims = img.scale(scale * 0.5); // normalized scale factor for 800x200 canvas
  const { width: pw, height: ph } = page.getSize();

  // Convert percentage coordinates (top-left based in UI) to PDF bottom-left coordinates
  const x = (xPct / 100) * pw;
  const topToBottomY = (yPct / 100) * ph;
  const y = ph - topToBottomY - imgDims.height;

  page.drawImage(img, {
    x: Math.max(0, Math.min(x, pw - imgDims.width)),
    y: Math.max(0, Math.min(y, ph - imgDims.height)),
    width: imgDims.width,
    height: imgDims.height,
  });

  onProgress?.(90);
  const resultBytes = await pdfDoc.save();
  onProgress?.(100);
  return resultBytes;
}

export default function DrawSignPdf() {
  const { triggerExport } = useExport();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const [previewDims, setPreviewDims] = useState(null);

  // Signature creation mode: 'type' | 'draw' | 'upload'
  const [sigMode, setSigMode] = useState('type');
  const [typedText, setTypedText] = useState('John Doe');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].id);
  const [sigColor, setSigColor] = useState('#1e3a8a'); // default navy signature ink
  const [penWidth, setPenWidth] = useState(3);
  // Placement & Scaling
  const [scale, setScale] = useState(0.6);
  const [pos, setPos] = useState({ x: 30, y: 70 }); // percentages 0-100

  // Drawing Pad State & Canvas Ref
  const drawCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [drawnSigDataUrl, setDrawnSigDataUrl] = useState(null);
  const [uploadedSigDataUrl, setUploadedSigDataUrl] = useState(null);

  // Dragging State on PDF Preview
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  // Compute active signature data URL based on current mode
  const typedSigDataUrl = useMemo(() => {
    if (!typedText.trim()) return null;
    const fontObj = SIGNATURE_FONTS.find(f => f.id === selectedFont) || SIGNATURE_FONTS[0];
    return createTextSignature(typedText, sigColor, fontObj.font);
  }, [typedText, sigColor, selectedFont]);

  const sigDataUrl = sigMode === 'type'
    ? typedSigDataUrl
    : sigMode === 'draw'
    ? drawnSigDataUrl
    : uploadedSigDataUrl;

  // Handle File Load
  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    setFile(f);
    setError('');
    setSuccess('');
    setProgress(0);
    setPageIndex(0);
  };

  // Drawing Pad Handlers
  const startDrawing = (e) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    isDrawingRef.current = true;
    lastPointRef.current = { x, y };

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(x, y, penWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = sigColor;
    ctx.fill();
  };

  const drawMove = (e) => {
    if (!isDrawingRef.current || !drawCanvasRef.current || !lastPointRef.current) return;
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    if (drawCanvasRef.current) {
      setDrawnSigDataUrl(drawCanvasRef.current.toDataURL('image/png'));
    }
  };

  const clearDrawingPad = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnSigDataUrl(null);
  };

  // Handle Signature Image Upload
  const onPickImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          // Normalize to transparent PNG to ensure embedPng compatibility
          const pngUrl = await imageToPngDataUrl(ev.target.result);
          setUploadedSigDataUrl(pngUrl);
          setSigMode('upload');
          setError('');
        } catch (convErr) {
          setError('Failed to process image: ' + convErr.message);
        }
      };
      reader.readAsDataURL(f);
    } catch (err) {
      setError('Failed to read signature image: ' + err.message);
    }
  };

  // Apply Signature to PDF
  const handleApply = async () => {
    if (!file || !sigDataUrl) {
      setError('Please select or draw a signature before applying.');
      return;
    }
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(10);

    try {
      const bytes = await applySignature(file, sigDataUrl, pageIndex, pos.x, pos.y, scale, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_signed.pdf');

      triggerExport(bytes, name, 'application/pdf', 'Signed');
      setLastBytes(bytes);
      setLastName(name);
      setSuccess(`Document signed successfully! Output saved as "${name}".`);

      addRecentFile({ tool: 'draw_sign', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'draw_sign', { tool: 'draw_sign', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Signing failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'draw_sign', { tool: 'draw_sign', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  // Dragging Handlers on PDF Preview
  const onPointerDown = useCallback((e) => {
    if (!previewDims || !dragRef.current) return;
    setIsDragging(true);
    const rect = dragRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Set position relative to bounding box
    const xPct = Math.max(0, Math.min((clickX / rect.width) * 100, 95));
    const yPct = Math.max(0, Math.min((clickY / rect.height) * 100, 95));
    setPos({ x: xPct, y: yPct });
    
    e.target.setPointerCapture(e.pointerId);
  }, [previewDims]);

  const onPointerMove = useCallback((e) => {
    if (!isDragging || !previewDims || !dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setPos({
      x: Math.max(0, Math.min((x / rect.width) * 100, 95)),
      y: Math.max(0, Math.min((y / rect.height) * 100, 95))
    });
  }, [isDragging, previewDims]);

  const onPointerUp = useCallback((e) => {
    setIsDragging(false);
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const sidebarContent = (
    <>
      <p className="ux-section-label">Signature Creation</p>

      <div className="ux-field">
        <div className="ux-mode-tabs">
          <button
            className={`ux-mode-tab ${sigMode === 'type' ? 'active' : ''}`}
            onClick={() => setSigMode('type')}
          >
            ⌨️ Type
          </button>
          <button
            className={`ux-mode-tab ${sigMode === 'draw' ? 'active' : ''}`}
            onClick={() => setSigMode('draw')}
          >
            ✍️ Draw
          </button>
          <button
            className={`ux-mode-tab ${sigMode === 'upload' ? 'active' : ''}`}
            onClick={() => {
              setSigMode('upload');
              document.getElementById('sigImgUpload').click();
            }}
          >
            📁 Upload
          </button>
        </div>
        <input
          id="sigImgUpload"
          type="file"
          accept="image/png, image/jpeg, image/webp"
          style={{ display: 'none' }}
          onChange={onPickImage}
        />
      </div>

      {/* Mode 1: Type Signature */}
      {sigMode === 'type' && (
        <>
          <div className="ux-field">
            <label className="ux-label">Your Name / Text</label>
            <input
              className="ux-input"
              type="text"
              value={typedText}
              placeholder="e.g. Jane Doe"
              onChange={(e) => setTypedText(e.target.value)}
            />
          </div>

          <div className="ux-field">
            <label className="ux-label">Font Style</label>
            <div className="draw-font-selector">
              {SIGNATURE_FONTS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  className={`draw-font-btn ${selectedFont === f.id ? 'active' : ''}`}
                  onClick={() => setSelectedFont(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="ux-field">
            <label className="ux-label">Ink Color</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={sigColor}
                onChange={(e) => setSigColor(e.target.value)}
                style={{ width: 44, height: 36, padding: 0, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
              />
              <button
                type="button"
                className="ux-btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setSigColor('#1e3a8a')}
              >
                Navy Ink
              </button>
              <button
                type="button"
                className="ux-btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setSigColor('#000000')}
              >
                Black
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mode 2: Draw Signature */}
      {sigMode === 'draw' && (
        <div className="ux-field">
          <label className="ux-label">Draw Signature with Mouse or Touch</label>
          <div className="draw-sign-pad-container">
            <canvas
              ref={drawCanvasRef}
              width={600}
              height={200}
              className="draw-sign-canvas"
              onMouseDown={startDrawing}
              onMouseMove={drawMove}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={drawMove}
              onTouchEnd={stopDrawing}
            />
            <div className="draw-sign-pad-actions">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="color"
                  value={sigColor}
                  onChange={(e) => setSigColor(e.target.value)}
                  style={{ width: 32, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  title="Pen Color"
                />
                <select
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.78rem' }}
                >
                  <option value={2}>Fine (2px)</option>
                  <option value={3}>Medium (3px)</option>
                  <option value={5}>Bold (5px)</option>
                </select>
              </div>
              <button
                type="button"
                className="ux-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={clearDrawingPad}
              >
                🗑️ Clear Pad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Uploaded Image Preview */}
      {sigMode === 'upload' && sigDataUrl && (
        <div className="ux-field" style={{ textAlign: 'center' }}>
          <label className="ux-label">Uploaded Signature Stamp</label>
          <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <img
              src={sigDataUrl}
              alt="Signature Preview"
              style={{ maxHeight: 70, maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      <p className="ux-section-label" style={{ marginTop: 24 }}>Placement & Size</p>

      <div className="ux-field">
        <div className="ux-range-header">
          <label className="ux-label" style={{ margin: 0 }}>Target Page</label>
          <span className="ux-range-value">Page {pageIndex + 1} of {pageCount}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button
            type="button"
            className="ux-btn-secondary"
            style={{ flex: 1, padding: '6px' }}
            disabled={pageIndex === 0}
            onClick={() => setPageIndex(p => Math.max(0, p - 1))}
          >
            ← Prev
          </button>
          <input
            className="ux-input"
            type="number"
            min={1}
            max={pageCount}
            value={pageIndex + 1}
            onChange={(e) => setPageIndex(Math.max(0, Math.min(pageCount - 1, (parseInt(e.target.value, 10) - 1) || 0)))}
            style={{ width: 60, textAlign: 'center' }}
          />
          <button
            type="button"
            className="ux-btn-secondary"
            style={{ flex: 1, padding: '6px' }}
            disabled={pageIndex >= pageCount - 1}
            onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
          >
            Next →
          </button>
        </div>
      </div>

      <div className="ux-field">
        <div className="ux-range-header">
          <label className="ux-label" style={{ margin: 0 }}>Signature Scale</label>
          <span className="ux-range-value">{Math.round(scale * 100)}%</span>
        </div>
        <input
          type="range"
          className="ux-range"
          min={20}
          max={150}
          value={scale * 100}
          onChange={(e) => setScale(parseInt(e.target.value, 10) / 100)}
        />
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
        💡 Click or drag on the page preview to position the signature box accurately.
      </p>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Embedding signature into PDF…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Signed Successfully!</p>
          </div>
          <div className="ux-result-body">
            <button
              className="ux-btn-primary"
              onClick={() => triggerExport(lastBytes, lastName, 'application/pdf', 'Signed')}
            >
              ↓ Download Again
            </button>
            <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Signed" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button
      className="ux-action-btn"
      onClick={handleApply}
      disabled={working || !file || !sigDataUrl}
    >
      {working ? 'Signing…' : '✅ Apply Signature & Download'}
    </button>
  );

  return (
    <ToolPageLayout
      title="Draw & Sign PDF"
      subtitle="Electronically sign your PDF documents with custom drawing, cursive text, or stamp images. 100% private and offline."
      icon="✍️"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="drawSign" />

      {!file ? (
        <DropZone
          onFiles={loadFile}
          label="Drop a PDF to sign"
          hint="Supports single & multi-page PDFs · Zero server upload"
        />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                Page {pageIndex + 1} of {pageCount}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {file.name} ({formatBytes(file.size)}) — Click or drag to reposition your signature stamp.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ux-btn-secondary"
                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
              >
                ← Prev Page
              </button>
              <button
                className="ux-btn-secondary"
                onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
                disabled={pageIndex >= pageCount - 1}
              >
                Next Page →
              </button>
              <button
                className="ux-btn-secondary"
                onClick={() => {
                  setFile(null);
                  setSuccess('');
                  setError('');
                }}
              >
                Change File
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 20, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'auto' }}>
            <div
              ref={dragRef}
              className="draw-sign-preview-wrap"
              style={{ cursor: 'crosshair' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <PdfCanvas
                file={file}
                pageNumber={pageIndex + 1}
                width={620}
                onRender={({ width, height, pageCount: pc }) => {
                  setPreviewDims({ width, height });
                  if (pc) setPageCount(pc);
                }}
                onError={(err) => setError('Preview error: ' + err.message)}
              />

              {previewDims && sigDataUrl && (
                <div
                  className={`draw-sign-draggable ${isDragging ? 'active' : ''}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transformOrigin: 'top left',
                  }}
                >
                  <span className="draw-sign-badge">✍️ Signature</span>
                  <img
                    src={sigDataUrl}
                    alt="Signature Stamp"
                    style={{
                      display: 'block',
                      maxHeight: 60 * scale,
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="drawSign" />
      <RecentFilesPanel tool="draw_sign" title="Recent signed documents" />
    </ToolPageLayout>
  );
}
