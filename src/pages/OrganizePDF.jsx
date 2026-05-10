import React, { useEffect, useMemo, useState, useRef } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { formatBytes } from '../fileManager';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { PDFDocument } from 'pdf-lib';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import '../styles/OrganizePDF.css';

async function getPageCount(file) {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch { return null; }
}

function SortablePageItem({ id, thumb, pageNumber, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`ux-page-card ${isDragging ? 'dragging' : ''}`} {...attributes} {...listeners}>
      <div className="ux-page-thumb-wrap">
        {thumb ? <img className="ux-page-thumb-img" src={thumb} alt={`Page ${pageNumber}`} /> : <div className="ux-page-thumb-placeholder" />}
        <button className="ux-page-remove-badge" onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove page">×</button>
      </div>
      <div className="ux-page-num">Page {pageNumber}</div>
    </div>
  );
}

export default function OrganizePDF() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]); // Support multiple files
  const [pageThumbs, setPageThumbs] = useState([]); // Flattened thumbnails
  const [pageOrder, setPageOrder] = useState([]); // Flattened order: { fileIndex, originalPageIndex, id }
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const fileInputRef = useRef(null);

  const loadFiles = async (raw) => {
    const newFilesList = Array.from(raw).filter(f => f.type === 'application/pdf');
    if (!newFilesList.length) { setError('Please select valid PDF files.'); return; }
    
    setWorking(true);
    setError('');
    setSuccess('');
    
    try {
      const currentFilesCount = files.length;
      const updatedFiles = [...files, ...newFilesList];
      setFiles(updatedFiles);

      let allNewThumbs = [...pageThumbs];
      let allNewOrder  = [...pageOrder];

      for (let i = 0; i < newFilesList.length; i++) {
        const f = newFilesList[i];
        const count = await getPageCount(f);
        if (!count) continue;

        const fileIdx = currentFilesCount + i;
        const newPages = Array.from({ length: count }, (_, pIdx) => ({
          fileIndex: fileIdx,
          originalPageIndex: pIdx,
          id: `p-${Date.now()}-${fileIdx}-${pIdx}`
        }));
        
        allNewOrder = [...allNewOrder, ...newPages];
        
        const thumbs = await generatePageThumbnails(f, () => {});
        const fileThumbs = thumbs || Array.from({ length: count }, () => null);
        allNewThumbs = [...allNewThumbs, fileThumbs]; // Nested or flattened? Let's keep nested for easy lookup
      }

      setPageOrder(allNewOrder);
      setPageThumbs(allNewThumbs);
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleOrganize = async () => {
    if (!files.length || !pageOrder.length) return;
    setWorking(true);
    setError('');
    setSuccess('');
    setProgress(10);

    try {
      const outDoc = await PDFDocument.create();
      
      // Cache loaded docs to avoid redundant parsing
      const loadedDocs = [];
      for (const f of files) {
        const buf = await f.arrayBuffer();
        loadedDocs.push(await PDFDocument.load(buf, { ignoreEncryption: true }));
      }

      setProgress(40);
      
      // Group by file index to use copyPages efficiently
      const groupedByFile = pageOrder.reduce((acc, p) => {
        if (!acc[p.fileIndex]) acc[p.fileIndex] = [];
        acc[p.fileIndex].push(p.originalPageIndex);
        return acc;
      }, {});

      // Actually we need to preserve the exact order, so groupedByFile isn't enough
      // unless we copy all and then reorder in the output doc.
      // Simpler: iterate order and copy one by one (or in chunks if contiguous)
      for (let i = 0; i < pageOrder.length; i++) {
        const p = pageOrder[i];
        const [copiedPage] = await outDoc.copyPages(loadedDocs[p.fileIndex], [p.originalPageIndex]);
        outDoc.addPage(copiedPage);
        setProgress(40 + Math.round((i / pageOrder.length) * 40));
      }
      
      const bytes = await outDoc.save();
      const name = (files[0]?.name || 'organized').replace(/\.pdf$/i, '') + '_organized.pdf';
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      setLastBytes(bytes);
      setLastName(name);
      setSuccess(`Exported ${pageOrder.length} pages.`);
      setProgress(100);

      addRecentFile({ tool: 'organize', name, size: bytes.byteLength, pages: pageOrder.length });
      bumpLocalJob();
      await logUserAction(user, 'organize', { tool: 'organize', status: 'success', meta: { pages: pageOrder.length } });
    } catch (err) {
      setError('Failed to organize: ' + err.message);
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Organization Info</p>
      
      <div className="ux-field">
        <label className="ux-label">Files Loaded</label>
        <div className="ux-input" style={{ background:'var(--bg-card)', fontWeight:700 }}>
          {files.length}
        </div>
      </div>

      <div className="ux-field">
        <label className="ux-label">Total Pages</label>
        <div className="ux-input" style={{ background:'var(--bg-card)', fontWeight:800, fontSize:'1.2rem', color:'var(--primary)' }}>
          {pageOrder.length}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:16 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Processing PDFs..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:20 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Success!</p>
            <p className="ux-result-success-sub">{success}</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Organized" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Organize PDF"
      subtitle="Reorder, delete or merge multiple PDFs instantly."
      icon="🧩"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Organizing...' : 'Organize PDF'}
      onAction={handleOrganize}
      actionDisabled={working || !files.length || !pageOrder.length}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <SEO title="Organize PDF Online — Reorder & Delete Pages | OM PDF" description="Rearrange or delete PDF pages instantly. 100% private and local." url="https://om-pdf.netlify.app/organize-pdf" />
      
      <input type="file" ref={fileInputRef} style={{ display:'none' }} accept=".pdf" multiple onChange={e => loadFiles(e.target.files)} />

      {!files.length ? (
        <DropZone onFiles={loadFiles} label="Drop PDFs to Organize" hint="Multiple PDFs supported · Max 200MB each" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Drag to reorder. Click × to delete. Use + to add more files.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFiles([]); setPageOrder([]); setPageThumbs([]); setSuccess(''); }}>
              Clear All
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (active.id !== over.id) {
                setPageOrder((items) => {
                  const oldIndex = items.findIndex(item => item.id === active.id);
                  const newIndex = items.findIndex(item => item.id === over.id);
                  const newOrder = [...items];
                  const [movedItem] = newOrder.splice(oldIndex, 1);
                  newOrder.splice(newIndex, 0, movedItem);
                  return newOrder;
                });
              }
            }}
          >
            <SortableContext items={pageOrder.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="ux-page-grid">
                {pageOrder.map((page) => (
                  <SortablePageItem
                    key={page.id}
                    id={page.id}
                    pageNumber={page.originalPageIndex + 1}
                    thumb={pageThumbs[page.fileIndex]?.[page.originalPageIndex]}
                    onRemove={() => setPageOrder(prev => prev.filter(p => p.id !== page.id))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {!pageOrder.length && (
            <div style={{ textAlign:'center', padding:'100px 20px', color:'var(--text-muted)' }}>
              <div style={{ fontSize:'4rem', marginBottom:'16px' }}>🗑️</div>
              <p style={{ fontSize:'1.1rem', fontWeight:600 }}>No pages remaining.</p>
              <button className="ux-btn-primary" style={{ width:'auto', padding:'12px 24px', marginTop:'16px' }} onClick={() => { setFiles([]); setPageOrder([]); setPageThumbs([]); }}>Reset Workspace</button>
            </div>
          )}
        </div>
      )}

      <RecentFilesPanel tool="organize" title="Recent Organizes" />
    </ToolPageLayout>
  );
}
