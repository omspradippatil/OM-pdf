import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import DropZone from '../components/DropZone';
import PdfCanvas from '../components/PdfCanvas';
import ToolSeoHead from '../components/ToolSeoHead';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/EditPdf.css'; // Reuse EditPdf styles for canvas and toolbar

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function FormBuilderPdf() {
  const { triggerExport } = useExport();
  const { user } = useAuth();
  
  const [sourceFile, setSourceFile] = useState(null); 
  const [pages, setPages] = useState([]); 
  const [activePageId, setActivePageId] = useState(null);
  
  const [tool, setTool] = useState('select'); // select, textField, checkbox
  const [zoom, setZoom] = useState(1);
  
  const [formFields, setFormFields] = useState([]); // { id, pageId, type, name, x, y, width, height, value }
  const [working, setWorking] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  const containerRef = useRef(null);
  const [dragState, setDragState] = useState(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') return;
    
    setSourceFile(f);
    
    const buf = await f.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const count = doc.getPageCount();
    
    const initialPages = Array.from({ length: count }).map((_, i) => ({
      id: generateId(),
      originalIndex: i,
    }));
    
    setPages(initialPages);
    setActivePageId(initialPages[0].id);
    setFormFields([]);
  };

  const activePage = pages.find(p => p.id === activePageId);

  // --- Coordinate Logic ---
  const getPointerCoords = (e, container) => {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    return { x, y };
  };

  const onPointerDownCanvas = (e) => {
    if (!activePageId) return;
    if (tool === 'select') {
      setSelectedFieldId(null);
      return;
    }
    
    const { x, y } = getPointerCoords(e, e.currentTarget);
    const newField = {
      id: generateId(),
      pageId: activePageId,
      type: tool,
      name: `${tool}_${generateId()}`,
      x, y,
      width: tool === 'checkbox' ? 24 : 150,
      height: tool === 'checkbox' ? 24 : 30,
      value: ''
    };
    
    setFormFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setTool('select');
  };

  const onPointerDownField = (e, id) => {
    e.stopPropagation();
    setSelectedFieldId(id);
    if (tool !== 'select') return;

    const { x, y } = getPointerCoords(e, containerRef.current);
    const field = formFields.find(f => f.id === id);
    if (!field) return;

    setDragState({
      id,
      startX: field.x,
      startY: field.y,
      pointerX: x,
      pointerY: y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMoveContainer = (e) => {
    if (dragState) {
      const { x, y } = getPointerCoords(e, containerRef.current);
      const dx = x - dragState.pointerX;
      const dy = y - dragState.pointerY;
      
      setFormFields(prev => prev.map(f => 
        f.id === dragState.id ? { ...f, x: dragState.startX + dx, y: dragState.startY + dy } : f
      ));
    }
  };

  const onPointerUpContainer = (e) => {
    if (dragState) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setDragState(null);
    }
  };

  const updateField = (id, key, val) => {
    setFormFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const deleteField = (id) => {
    setFormFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleExport = async () => {
    if (!sourceFile) return;
    setWorking(true);
    try {
      const buf = await sourceFile.arrayBuffer();
      const exportPdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      const form = exportPdf.getForm();

      for (const field of formFields) {
        const pState = pages.find(p => p.id === field.pageId);
        if (!pState) continue;
        
        const page = exportPdf.getPage(pState.originalIndex);
        const { width, height } = page.getSize();
        
        // Ensure unique name
        let safeName = field.name;
        let counter = 1;
        while (form.getFieldMaybe(safeName)) {
          safeName = `${field.name}_${counter++}`;
        }

        if (field.type === 'textField') {
          const tf = form.createTextField(safeName);
          if (field.value) tf.setText(field.value);
          tf.addToPage(page, { 
            x: field.x, 
            y: height - field.y - field.height, // flip Y
            width: field.width, 
            height: field.height 
          });
        } else if (field.type === 'checkbox') {
          const cb = form.createCheckBox(safeName);
          if (field.value === 'checked') cb.check();
          cb.addToPage(page, { 
            x: field.x, 
            y: height - field.y - field.height, 
            width: field.width, 
            height: field.height 
          });
        }
      }

      const bytes = await exportPdf.save();
      const name = sourceFile.name.replace(/\.pdf$/i, '_form.pdf');
      
      triggerExport(bytes, name, 'application/pdf', 'Fillable Forms');
      addRecentFile({ tool: 'form_builder', name, size: bytes.byteLength });
      bumpLocalJob();
      await logUserAction(user, 'form_builder', { status: 'success' });
    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setWorking(false);
    }
  };

  if (!sourceFile) {
    return (
      <div style={{ padding: 40, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ToolSeoHead toolKey="form_builder" />
        <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Form Builder</h1>
        <div style={{ flex: 1 }}>
          <DropZone onFiles={loadFile} label="Drop a PDF to create a form" hint="100% offline. No uploads." />
        </div>
      </div>
    );
  }

  return (
    <div className="edit-pdf-container">
      <ToolSeoHead toolKey="form_builder" />
      
      {/* Top Toolbar */}
      <div className="edit-pdf-topbar">
        <div className="edit-pdf-topbar-left">
          <button className="edit-pdf-back-btn" onClick={() => setSourceFile(null)}>
            ← Back
          </button>
          
          <div className="edit-pdf-toolbar">
            <button className={`edit-pdf-tool-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool('select')} title="Select & Move">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg>
            </button>
            <div style={{ width: 1, height: 24, background: '#cbd5e1', margin: '0 4px' }} />
            
            <button className={`edit-pdf-tool-btn ${tool === 'textField' ? 'active' : ''}`} onClick={() => setTool('textField')} title="Text Field">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
            </button>
            <button className={`edit-pdf-tool-btn ${tool === 'checkbox' ? 'active' : ''}`} onClick={() => setTool('checkbox')} title="Checkbox">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            </button>
          </div>
        </div>

        <div className="edit-pdf-topbar-right">
          <button className="edit-pdf-export-btn" onClick={handleExport} disabled={working}>
            {working ? 'Exporting...' : 'Export Form PDF'}
          </button>
        </div>
      </div>

      <div className="edit-pdf-workspace">
        {/* Left Sidebar - Pages */}
        <div className="edit-pdf-sidebar" style={{ width: 220 }}>
          <div className="edit-pdf-sidebar-header">
            <h3>Pages</h3>
          </div>
          <div className="edit-pdf-sidebar-content">
            {pages.map((p, i) => (
              <div 
                key={p.id} 
                className={`edit-pdf-page-thumb ${activePageId === p.id ? 'active' : ''}`}
                onClick={() => setActivePageId(p.id)}
              >
                <div style={{ pointerEvents: 'none' }}>
                  <PdfCanvas file={sourceFile} pageNumber={p.originalIndex + 1} width={120} />
                </div>
                <div className="edit-pdf-page-num">{i + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Canvas Workspace */}
        <div className="edit-pdf-canvas-container" style={{ cursor: tool !== 'select' ? 'crosshair' : 'default' }}>
          {activePage && (
            <div 
              className="edit-pdf-canvas-wrapper" 
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              ref={containerRef}
              onPointerMove={onPointerMoveContainer}
              onPointerUp={onPointerUpContainer}
              onPointerLeave={onPointerUpContainer}
            >
              <PdfCanvas 
                file={sourceFile} 
                pageNumber={activePage.originalIndex + 1} 
                width={800} 
              />
              
              <div 
                className="edit-pdf-overlay"
                onPointerDown={onPointerDownCanvas}
                style={{ touchAction: 'none' }}
              >
                {/* DOM Layer for Draggable Fields */}
                <div className="edit-pdf-interactive-layer">
                  {formFields.filter(f => f.pageId === activePageId).map(field => {
                    const isSelected = selectedFieldId === field.id;
                    return (
                      <div
                        key={field.id}
                        className={`edit-pdf-draggable-wrapper ${isSelected ? 'selected' : ''}`}
                        style={{ left: field.x, top: field.y, width: field.width, height: field.height }}
                        onPointerDown={(e) => onPointerDownField(e, field.id)}
                      >
                        {/* Delete Badge */}
                        <div 
                          className="edit-pdf-delete-badge" 
                          onPointerDown={(e) => e.stopPropagation()} 
                          onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                        >✕</div>

                        {/* Resize handle (bottom right) */}
                        <div 
                          style={{
                            position: 'absolute', right: -5, bottom: -5, width: 10, height: 10,
                            background: 'var(--primary)', borderRadius: '50%', cursor: 'nwse-resize',
                            display: isSelected && tool === 'select' ? 'block' : 'none'
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            // Simple resize logic could go here, but omitted for brevity in MVP
                            // We can just rely on the default sizes for now or implement full resize
                          }}
                        />

                        {/* Rendering by Type */}
                        {field.type === 'textField' && (
                          <div style={{ width: '100%', height: '100%', border: '2px dashed var(--primary)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 'bold' }}>Text Field</span>
                          </div>
                        )}

                        {field.type === 'checkbox' && (
                          <div style={{ width: '100%', height: '100%', border: '2px solid var(--primary)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✓
                          </div>
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

        {/* Right Sidebar - Properties */}
        <div className="edit-pdf-sidebar" style={{ width: 260, borderLeft: '1px solid var(--border)' }}>
          <div className="edit-pdf-sidebar-header">
            <h3>Field Properties</h3>
          </div>
          <div className="edit-pdf-sidebar-content" style={{ padding: 16 }}>
            {selectedFieldId ? (
              formFields.filter(f => f.id === selectedFieldId).map(field => (
                <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="ux-field">
                    <label className="ux-label">Field Name</label>
                    <input className="ux-input" type="text" value={field.name} onChange={e => updateField(field.id, 'name', e.target.value)} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Must be unique for independent fields.</span>
                  </div>

                  {field.type === 'textField' && (
                    <div className="ux-field">
                      <label className="ux-label">Default Text (Optional)</label>
                      <input className="ux-input" type="text" value={field.value} onChange={e => updateField(field.id, 'value', e.target.value)} />
                    </div>
                  )}

                  {field.type === 'checkbox' && (
                    <div className="ux-field">
                      <label className="ux-label">Default State</label>
                      <select className="ux-input" value={field.value} onChange={e => updateField(field.id, 'value', e.target.value)}>
                        <option value="">Unchecked</option>
                        <option value="checked">Checked</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <div className="ux-field">
                      <label className="ux-label">Width</label>
                      <input className="ux-input" type="number" value={field.width} onChange={e => updateField(field.id, 'width', Number(e.target.value))} />
                    </div>
                    <div className="ux-field">
                      <label className="ux-label">Height</label>
                      <input className="ux-input" type="number" value={field.height} onChange={e => updateField(field.id, 'height', Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Select a field to edit its properties.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
