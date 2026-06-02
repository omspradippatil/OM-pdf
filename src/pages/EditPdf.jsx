import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import DropZone from '../components/DropZone';
import PdfCanvas from '../components/PdfCanvas';
import ToolSeoHead from '../components/ToolSeoHead';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { useCrashRecovery } from '../hooks/useCrashRecovery';
import CrashRecoveryBanner from '../components/CrashRecoveryBanner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '../styles/EditPdf.css';

// SVG Icons
const IconPan = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
const IconSelect = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg>;
const IconText = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>;
const IconDraw = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>;
const IconHighlight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path></svg>;
const IconImage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconShape = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
const IconCircle = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>;
const IconUnderline = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>;
const IconUndo = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconRotate = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg>;
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

const SortableThumbnail = ({ p, i, activePageId, setActivePageId, sourceFiles, addMenuOpenId, setAddMenuOpenId, rotatePage, deletePage, insertSecondaryFile, addBlankPageAfter }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : (transform ? 1 : 0),
    position: 'relative',
    opacity: isDragging ? 0.6 : 1,
    touchAction: 'none'
  };

  return (
    <div ref={setNodeRef} style={style} className="edit-pdf-thumbnail-wrap" {...attributes} {...listeners}>
      <div 
        className={`edit-pdf-thumbnail-card ${activePageId === p.id ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setActivePageId(p.id); }}
        style={{ transform: `rotate(${p.rotation}deg)`, cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {p.type === 'original' && sourceFiles[p.sourceDocId] ? (
          <PdfCanvas file={sourceFiles[p.sourceDocId]} pageNumber={p.originalIndex + 1} width={136} />
        ) : (
          <div style={{ width: 136, height: 192, background: 'white' }} />
        )}
      </div>
      <div className="edit-pdf-page-label">{i + 1}</div>
      
      <div className="edit-pdf-thumbnail-controls">
        <button className="edit-pdf-thumbnail-btn" title="Add Page" onClick={(e) => { e.stopPropagation(); setAddMenuOpenId(addMenuOpenId === p.id ? null : p.id); }}>
          <IconPlus />
        </button>
        <button className="edit-pdf-thumbnail-btn" title="Rotate 90°" onClick={(e) => { e.stopPropagation(); rotatePage(p.id); }}>
          <IconRotate />
        </button>
        <button className="edit-pdf-thumbnail-btn" title="Delete page" onClick={(e) => { e.stopPropagation(); deletePage(p.id); }}>
          <IconTrash />
        </button>
      </div>

      {addMenuOpenId === p.id && (
        <div className="edit-pdf-add-menu" onClick={e => e.stopPropagation()}>
          <button className="edit-pdf-add-menu-btn" onClick={() => addBlankPageAfter(p.id)}>
            Blank Page
          </button>
          <label className="edit-pdf-add-menu-btn">
            Insert Another PDF
            <input 
              type="file" 
              accept="application/pdf" 
              style={{ display: 'none' }} 
              onChange={(e) => insertSecondaryFile(e.target.files, p.id)} 
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default function EditPdf() {
  const { triggerExport } = useExport();
  const { user } = useAuth();
  
  // File state (Map of docId -> File object)
  const [sourceFiles, setSourceFiles] = useState({}); 
  const [pages, setPages] = useState([]); // { id, type: 'original'|'blank', sourceDocId, originalIndex, rotation }
  
  const [activePageId, setActivePageId] = useState(null);
  const [tool, setTool] = useState('select'); // select, pan, text, draw, highlight, shape_rect, shape_circle, image, underline
  const [zoom, setZoom] = useState(1);
  const [color, setColor] = useState('#000000'); // current tool color
  
  const [annotations, setAnnotations] = useState({}); // { [pageId]: [annotation_objects] }
  const [working, setWorking] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const drawCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // Dragging state for annotations
  const [selectedAnnId, setSelectedAnnId] = useState(null);
  const [dragState, setDragState] = useState(null); // { annId, startX, startY, pointerX, pointerY }

  // Sidebar menus
  const [addMenuOpenId, setAddMenuOpenId] = useState(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 } // 5px drag required to differentiate from a click
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id && over?.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Auto-Save / Recovery
  const {
    hasRecoveredData,
    recovering,
    recoverFiles,
    discardRecovery,
    saveFilesToCache,
    clearCache
  } = useCrashRecovery('edit_session');

  useEffect(() => {
    if (Object.keys(sourceFiles).length > 0) {
      saveFilesToCache([], { sourceFiles, pages, activePageId, annotations });
    } else {
      clearCache();
    }
  }, [sourceFiles, pages, activePageId, annotations, saveFilesToCache, clearCache]);

  const handleRestore = async () => {
    const session = await recoverFiles();
    if (session && session.metadata && Object.keys(session.metadata.sourceFiles || {}).length > 0) {
      setSourceFiles(session.metadata.sourceFiles);
      setPages(session.metadata.pages || []);
      setActivePageId(session.metadata.activePageId || null);
      setAnnotations(session.metadata.annotations || {});
    }
  };

  const loadPrimaryFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') return;
    
    const docId = generateId();
    setSourceFiles({ [docId]: f });
    
    const buf = await f.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const count = doc.getPageCount();
    
    const initialPages = Array.from({ length: count }).map((_, i) => ({
      id: generateId(),
      type: 'original',
      sourceDocId: docId,
      originalIndex: i,
      rotation: 0
    }));
    
    setPages(initialPages);
    setActivePageId(initialPages[0].id);
    setAnnotations({});
  };

  const insertSecondaryFile = async (raw, insertAfterPageId) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') return;
    
    const docId = generateId();
    setSourceFiles(prev => ({ ...prev, [docId]: f }));
    
    const buf = await f.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const count = doc.getPageCount();
    
    const newPages = Array.from({ length: count }).map((_, i) => ({
      id: generateId(),
      type: 'original',
      sourceDocId: docId,
      originalIndex: i,
      rotation: 0
    }));

    setPages(prev => {
      const idx = prev.findIndex(p => p.id === insertAfterPageId);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, ...newPages);
      return next;
    });
    setAddMenuOpenId(null);
  };

  const activePage = pages.find(p => p.id === activePageId);

  // --- Page Operations ---
  const rotatePage = (id) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  const deletePage = (id) => {
    setPages(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activePageId === id && next.length > 0) setActivePageId(next[0].id);
      return next;
    });
  };

  const addBlankPageAfter = (id) => {
    setPages(prev => {
      const idx = prev.findIndex(p => p.id === id);
      const newPage = { id: generateId(), type: 'blank', rotation: 0 };
      const next = [...prev];
      next.splice(idx + 1, 0, newPage);
      return next;
    });
    setAddMenuOpenId(null);
  };

  // --- Coordinate Logic ---
  const getPointerCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  // --- Canvas Pointer Handlers ---
  const onPointerDownCanvas = (e) => {
    if (tool === 'select' || tool === 'pan') {
      setSelectedAnnId(null);
      return;
    }

    const coords = getPointerCoords(e, drawCanvasRef.current);
    
    if (tool === 'text' || tool === 'underline') {
      addAnnotation(activePageId, {
        id: generateId(),
        type: 'text',
        x: coords.x,
        y: coords.y,
        text: 'New Text',
        color,
        size: tool === 'underline' ? 16 : 18,
        underline: tool === 'underline'
      });
      setTool('select');
      return;
    }

    if (tool === 'shape_rect' || tool === 'shape_circle') {
      addAnnotation(activePageId, {
        id: generateId(),
        type: tool,
        x: coords.x,
        y: coords.y,
        width: 100,
        height: 100,
        color
      });
      setTool('select');
      return;
    }
    
    if (tool === 'draw' || tool === 'highlight') {
      setIsDrawing(true);
      setCurrentPath([coords]);
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMoveCanvas = (e) => {
    if (!isDrawing) return;
    const coords = getPointerCoords(e, drawCanvasRef.current);
    setCurrentPath(prev => [...prev, coords]);
  };

  const onPointerUpCanvas = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    e.target.releasePointerCapture(e.pointerId);
    
    if (currentPath.length > 1) {
      addAnnotation(activePageId, {
        id: generateId(),
        type: tool,
        path: currentPath,
        color,
        thickness: tool === 'highlight' ? 20 : 3
      });
    }
    setCurrentPath([]);
  };

  // --- Draggable Annotation Handlers ---
  const onPointerDownAnn = (e, annId, ann) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    setSelectedAnnId(annId);
    
    const coords = getPointerCoords(e, drawCanvasRef.current);
    setDragState({
      annId,
      startX: ann.x,
      startY: ann.y,
      pointerX: coords.x,
      pointerY: coords.y
    });
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMoveContainer = (e) => {
    if (!dragState) return;
    const coords = getPointerCoords(e, drawCanvasRef.current);
    const dx = coords.x - dragState.pointerX;
    const dy = coords.y - dragState.pointerY;
    
    setAnnotations(prev => ({
      ...prev,
      [activePageId]: prev[activePageId].map(a => 
        a.id === dragState.annId 
          ? { ...a, x: dragState.startX + dx, y: dragState.startY + dy } 
          : a
      )
    }));
  };

  const onPointerUpContainer = (e) => {
    if (dragState) {
      containerRef.current.releasePointerCapture(e.pointerId);
      setDragState(null);
    }
  };

  // --- Annotation Operations ---
  const addAnnotation = (pageId, ann) => {
    setAnnotations(prev => ({
      ...prev,
      [pageId]: [...(prev[pageId] || []), ann]
    }));
  };

  const updateAnnotationField = (pageId, annId, field, value) => {
    setAnnotations(prev => ({
      ...prev,
      [pageId]: prev[pageId].map(a => a.id === annId ? { ...a, [field]: value } : a)
    }));
  };

  const deleteAnnotation = (pageId, annId) => {
    setAnnotations(prev => ({
      ...prev,
      [pageId]: prev[pageId].filter(a => a.id !== annId)
    }));
  };

  const handleAddImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // scale down if too large
        let w = img.width;
        let h = img.height;
        if (w > 300) {
          h = (300 / w) * h;
          w = 300;
        }
        addAnnotation(activePageId, {
          id: generateId(),
          type: 'image',
          x: 100,
          y: 100,
          width: w,
          height: h,
          dataUrl: ev.target.result
        });
        setTool('select');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  // --- Export Logic ---
  const handleExport = async () => {
    if (Object.keys(sourceFiles).length === 0) return;
    setWorking(true);
    try {
      // Pre-load all source documents into memory
      const loadedDocs = {};
      for (const [docId, f] of Object.entries(sourceFiles)) {
        const buf = await f.arrayBuffer();
        loadedDocs[docId] = await PDFDocument.load(buf, { ignoreEncryption: true });
      }

      const exportPdf = await PDFDocument.create();

      for (let i = 0; i < pages.length; i++) {
        const pState = pages[i];
        let outPage;

        if (pState.type === 'original' && loadedDocs[pState.sourceDocId]) {
          const originalPdf = loadedDocs[pState.sourceDocId];
          const [copiedPage] = await exportPdf.copyPages(originalPdf, [pState.originalIndex]);
          outPage = copiedPage;
        } else {
          outPage = exportPdf.addPage([595.28, 841.89]); // A4 default for blank
        }

        if (pState.rotation !== 0) {
          outPage.setRotation(degrees(outPage.getRotation().angle + pState.rotation));
        }

        exportPdf.addPage(outPage);
        const { width, height } = outPage.getSize();

        // Apply Annotations
        const pageAnns = annotations[pState.id] || [];
        for (const ann of pageAnns) {
          const c = ann.color ? hexToRgb(ann.color) : {r:0,g:0,b:0};
          const pdfColor = rgb(c.r, c.g, c.b);

          if (ann.type === 'text') {
            outPage.drawText(ann.text, {
              x: ann.x,
              y: height - ann.y - ann.size, // flip Y for PDF-lib
              size: ann.size,
              color: pdfColor
            });
            if (ann.underline) {
              const textWidth = ann.text.length * (ann.size * 0.5); // rough estimate
              outPage.drawLine({
                start: { x: ann.x, y: height - ann.y - ann.size - 2 },
                end: { x: ann.x + textWidth, y: height - ann.y - ann.size - 2 },
                thickness: 1,
                color: pdfColor
              });
            }
          } else if (ann.type === 'draw') {
            for (let j = 1; j < ann.path.length; j++) {
              const p1 = ann.path[j-1];
              const p2 = ann.path[j];
              outPage.drawLine({
                start: { x: p1.x, y: height - p1.y },
                end: { x: p2.x, y: height - p2.y },
                thickness: ann.thickness,
                color: pdfColor
              });
            }
          } else if (ann.type === 'highlight') {
            for (let j = 1; j < ann.path.length; j++) {
              const p1 = ann.path[j-1];
              const p2 = ann.path[j];
              outPage.drawLine({
                start: { x: p1.x, y: height - p1.y },
                end: { x: p2.x, y: height - p2.y },
                thickness: ann.thickness,
                color: pdfColor,
                opacity: 0.3
              });
            }
          } else if (ann.type === 'shape_rect') {
            outPage.drawRectangle({
              x: ann.x,
              y: height - ann.y - ann.height,
              width: ann.width,
              height: ann.height,
              borderColor: pdfColor,
              borderWidth: 2,
            });
          } else if (ann.type === 'shape_circle') {
            outPage.drawEllipse({
              x: ann.x + (ann.width/2),
              y: height - ann.y - (ann.height/2),
              xScale: ann.width / 2,
              yScale: ann.height / 2,
              borderColor: pdfColor,
              borderWidth: 2,
            });
          } else if (ann.type === 'image') {
            // Check image format
            let embedImg;
            if (ann.dataUrl.includes('image/png')) {
              embedImg = await exportPdf.embedPng(ann.dataUrl);
            } else if (ann.dataUrl.includes('image/jpeg')) {
              embedImg = await exportPdf.embedJpg(ann.dataUrl);
            }
            if (embedImg) {
              outPage.drawImage(embedImg, {
                x: ann.x,
                y: height - ann.y - ann.height,
                width: ann.width,
                height: ann.height
              });
            }
          }
        }
      }

      const bytes = await exportPdf.save();
      const firstFileName = Object.values(sourceFiles)[0]?.name || 'document.pdf';
      const name = firstFileName.replace(/\.pdf$/i, '_edited.pdf');
      
      triggerExport(bytes, name, 'application/pdf', 'Edited');

      addRecentFile({ tool: 'edit_pdf', name, size: bytes.byteLength });
      bumpLocalJob();
      await logUserAction(user, 'edit_pdf', { status: 'success' });
      clearSession('edit_session');

    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setWorking(false);
    }
  };

  // Render current drawing path (lines)
  useEffect(() => {
    if (!drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    
    // Draw committed annotations (paths only)
    const pageAnns = annotations[activePageId] || [];
    pageAnns.forEach(ann => {
      if (ann.type === 'draw' || ann.type === 'highlight') {
        ctx.beginPath();
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (ann.type === 'highlight') ctx.globalAlpha = 0.3;
        else ctx.globalAlpha = 1.0;
        
        ctx.moveTo(ann.path[0].x, ann.path[0].y);
        for (let i = 1; i < ann.path.length; i++) {
          ctx.lineTo(ann.path[i].x, ann.path[i].y);
        }
        ctx.stroke();
      }
    });

    // Draw current active path
    if (isDrawing && currentPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = tool === 'highlight' ? 20 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'highlight') ctx.globalAlpha = 0.3;
      else ctx.globalAlpha = 1.0;

      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }, [annotations, activePageId, isDrawing, currentPath, color, tool]);

  if (Object.keys(sourceFiles).length === 0) {
    return (
      <div style={{ padding: 40, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ToolSeoHead toolKey="editPdf" />
        <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Annotate & Edit PDF</h1>
        <div style={{ flex: 1, maxWidth: 800, margin: '0 auto', width: '100%' }}>
          {hasRecoveredData && (
            <CrashRecoveryBanner onRestore={handleRestore} onDiscard={discardRecovery} recovering={recovering} />
          )}
          <DropZone onFiles={loadPrimaryFile} label="Drop a PDF to edit" hint="100% offline. No uploads." />
        </div>
      </div>
    );
  }

  return (
    <div className="edit-pdf-container">
      <ToolSeoHead toolKey="editPdf" />
      
      {/* Top Toolbar */}
      <div className="edit-pdf-topbar">
        <div className="edit-pdf-topbar-left">
          <button className="edit-pdf-back-btn" onClick={() => setSourceFiles({})}>
            ← Back
          </button>
          
          <div className="edit-pdf-toolbar">
            <button className={`edit-pdf-tool-btn ${tool === 'pan' ? 'active' : ''}`} onClick={() => setTool('pan')} title="Pan">
              <IconPan />
            </button>
            <button className={`edit-pdf-tool-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool('select')} title="Select & Move">
              <IconSelect />
            </button>
            <div style={{ width: 1, height: 24, background: '#cbd5e1', margin: '0 4px' }} />
            
            <button className={`edit-pdf-tool-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')} title="Add Text">
              <IconText />
            </button>
            <button className={`edit-pdf-tool-btn ${tool === 'underline' ? 'active' : ''}`} onClick={() => setTool('underline')} title="Underline Text">
              <IconUnderline />
            </button>
            <button className={`edit-pdf-tool-btn ${tool === 'draw' ? 'active' : ''}`} onClick={() => setTool('draw')} title="Draw (Signature)">
              <IconDraw />
            </button>
            <button className={`edit-pdf-tool-btn ${tool === 'highlight' ? 'active' : ''}`} onClick={() => setTool('highlight')} title="Highlight">
              <IconHighlight />
            </button>
            
            <button className={`edit-pdf-tool-btn ${tool === 'shape_rect' ? 'active' : ''}`} onClick={() => setTool('shape_rect')} title="Rectangle">
              <IconShape />
            </button>
            <button className={`edit-pdf-tool-btn ${tool === 'shape_circle' ? 'active' : ''}`} onClick={() => setTool('shape_circle')} title="Circle">
              <IconCircle />
            </button>

            {/* Image Upload triggers standard file input */}
            <label className="edit-pdf-tool-btn" title="Add Image/Signature" style={{ cursor: 'pointer' }}>
              <IconImage />
              <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleAddImage} />
            </label>
            
            <div style={{ width: 1, height: 24, background: '#cbd5e1', margin: '0 4px' }} />
            
            <div className="edit-pdf-color-picker">
              {['#000000', '#e11d48', '#2563eb', '#16a34a', '#facc15'].map(c => (
                <div 
                  key={c} 
                  className={`edit-pdf-color-swatch ${color === c ? 'active' : ''}`} 
                  style={{ background: c }} 
                  onClick={() => setColor(c)} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="edit-pdf-topbar-right">
          <button className="edit-pdf-tool-btn" onClick={() => {
             const pageAnns = annotations[activePageId] || [];
             if (pageAnns.length > 0) {
               setAnnotations(prev => ({
                 ...prev,
                 [activePageId]: pageAnns.slice(0, -1)
               }));
             }
          }}>
            <IconUndo /> Undo
          </button>
          <button className="edit-pdf-export-btn" onClick={handleExport} disabled={working}>
            {working ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <div className="edit-pdf-main">
        {/* Left Sidebar Thumbnails */}
        <div className="edit-pdf-sidebar">
          <div className="edit-pdf-sidebar-header">
            <span>Pages</span>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{pages.length}</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="edit-pdf-thumbnails">
                {pages.map((p, i) => (
                  <SortableThumbnail 
                    key={p.id}
                    p={p}
                    i={i}
                    activePageId={activePageId}
                    setActivePageId={setActivePageId}
                    sourceFiles={sourceFiles}
                    addMenuOpenId={addMenuOpenId}
                    setAddMenuOpenId={setAddMenuOpenId}
                    rotatePage={rotatePage}
                    deletePage={deletePage}
                    insertSecondaryFile={insertSecondaryFile}
                    addBlankPageAfter={addBlankPageAfter}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Main Canvas Workspace */}
        <div 
          className="edit-pdf-workspace" 
          ref={containerRef}
          onPointerMove={onPointerMoveContainer}
          onPointerUp={onPointerUpContainer}
          style={{ cursor: tool === 'pan' ? 'grab' : (tool === 'select' ? 'default' : 'crosshair') }}
        >
          {activePage && (
            <div 
              className="edit-pdf-canvas-container" 
              style={{ transform: `scale(${zoom}) rotate(${activePage.rotation}deg)` }}
            >
              {/* The underlying PDF render */}
              {activePage.type === 'original' && sourceFiles[activePage.sourceDocId] ? (
                <PdfCanvas 
                  file={sourceFiles[activePage.sourceDocId]} 
                  pageNumber={activePage.originalIndex + 1} 
                  width={800} 
                  onRender={() => {
                    if (drawCanvasRef.current) drawCanvasRef.current.width = 800;
                  }} 
                />
              ) : (
                <div style={{ width: 800, height: 1131, background: 'white' }} />
              )}
              
              {/* The Interactive Overlay Layer */}
              <div 
                className="edit-pdf-overlay"
                onPointerDown={onPointerDownCanvas}
                onPointerMove={onPointerMoveCanvas}
                onPointerUp={onPointerUpCanvas}
                onPointerLeave={onPointerUpCanvas}
                style={{ touchAction: 'none' }}
              >
                {/* Canvas for strokes */}
                <canvas 
                  ref={drawCanvasRef} 
                  width={800} 
                  height={1131} 
                  style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                />

                {/* DOM Layer for Draggable Elements */}
                <div className="edit-pdf-interactive-layer">
                  {(annotations[activePageId] || []).map(ann => {
                    if (ann.type === 'draw' || ann.type === 'highlight') return null; // paths rendered in canvas
                    
                    const isSelected = selectedAnnId === ann.id;
                    return (
                      <div
                        key={ann.id}
                        className={`edit-pdf-draggable-wrapper ${isSelected ? 'selected' : ''}`}
                        style={{ left: ann.x, top: ann.y }}
                        onPointerDown={(e) => onPointerDownAnn(e, ann.id, ann)}
                      >
                        {/* Delete Badge */}
                        <div 
                          className="edit-pdf-delete-badge" 
                          onPointerDown={(e) => e.stopPropagation()} 
                          onClick={(e) => { e.stopPropagation(); deleteAnnotation(activePageId, ann.id); }}
                        >✕</div>

                        {/* Rendering by Type */}
                        {ann.type === 'text' && (
                          <textarea
                            className="edit-pdf-text-input"
                            style={{
                              color: ann.color,
                              fontSize: `${ann.size}px`,
                              fontFamily: 'sans-serif',
                              textDecoration: ann.underline ? 'underline' : 'none'
                            }}
                            value={ann.text}
                            onChange={(e) => updateAnnotationField(activePageId, ann.id, 'text', e.target.value)}
                            onPointerDown={(e) => {
                              if (tool !== 'select') e.stopPropagation(); 
                              // let pointerdown propagate if select to enable drag wrapper
                            }}
                          />
                        )}

                        {ann.type === 'shape_rect' && (
                          <div style={{
                            width: ann.width, height: ann.height, 
                            border: `2px solid ${ann.color}`,
                            background: 'transparent'
                          }} />
                        )}

                        {ann.type === 'shape_circle' && (
                          <div style={{
                            width: ann.width, height: ann.height, 
                            border: `2px solid ${ann.color}`,
                            borderRadius: '50%',
                            background: 'transparent'
                          }} />
                        )}

                        {ann.type === 'image' && (
                          <img 
                            src={ann.dataUrl} 
                            alt="annotation" 
                            style={{ width: ann.width, height: ann.height, pointerEvents: 'none' }} 
                            draggable={false}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Zoom Bar */}
          <div className="edit-pdf-zoom-bar">
            <button className="edit-pdf-thumbnail-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>-</button>
            <span style={{ fontSize: '0.875rem', width: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button className="edit-pdf-thumbnail-btn" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
