import { useEffect, useMemo, useState, useRef } from 'react';
import { runPdfWorkerTask } from '../workers/workerClient';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import ToolChaining from '../components/ToolChaining';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/ImageToPDF.css';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { formatBytes } from '../fileManager';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';

function SortableImage({ id, item, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? `translate3d(${Math.round(transform.x)}px,${Math.round(transform.y)}px,0)` : undefined,
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className={`image-card${isDragging?' dragging':''}`} {...attributes} {...listeners}>
      <img src={item.url} alt={item.name} className="image-thumb" loading="lazy" />
      <div className="image-card-footer">
        <div className="image-name" title={item.name}>{item.name}</div>
        <span className="image-size">{formatBytes(item.size)}</span>
      </div>
      <button className="image-remove" type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}>×</button>
    </div>
  );
}

async function readImageBytes(file) {
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return { bytes: await file.arrayBuffer(), type: 'jpg' };
  if (file.type === 'image/png') return { bytes: await file.arrayBuffer(), type: 'png' };
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.92));
  if (!blob) throw new Error('Failed to process image data.');
  return { bytes: await blob.arrayBuffer(), type: 'png' };
}

async function imagesToPdf(images, onProgress) {
  const imagesPayload = [];
  const transferables = [];
  for (let i = 0; i < images.length; i++) {
    const { bytes, type } = await readImageBytes(images[i].file);
    imagesPayload.push({ buffer: bytes, type });
    transferables.push(bytes);
  }
  const { bytes: out } = await runPdfWorkerTask('images_to_pdf', { images: imagesPayload }, transferables, onProgress);
  return out;
}

export default function ImageToPDF() {
  const { user } = useAuth();
  const [images, setImages]     = useState([]);
  const [progress, setProgress] = useState(0);
  const [converting, setConverting] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [filename, setFilename] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName]   = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  useEffect(() => () => { images.forEach(img => URL.revokeObjectURL(img.url)); }, [images]);

  const addImages = (files) => {
    const incoming = Array.from(files).filter(f => f.type.startsWith('image/'));
    const mapped = incoming.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      file, name: file.name, size: file.size, url: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...mapped]);
    if (!filename && incoming.length) setFilename(incoming[0].name.replace(/\.(jpg|jpeg|png|webp)$/i, ''));
  };
  const removeImage = (id) => {
    setImages(prev => {
      const next = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return next;
    });
  };
  const totalSize = useMemo(() => images.reduce((sum, img) => sum + img.size, 0), [images]);

  const handleConvert = async () => {
    if (!images.length) return;
    setError(''); setSuccess(''); setConverting(true); setProgress(0);
    try {
      const bytes = await imagesToPdf(images, setProgress);
      const name = `${(filename.trim()||'images')}_${new Date().toISOString().slice(0,10)}.pdf`;
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`Created ${images.length}-page PDF`);
      addRecentFile({ tool:'image_to_pdf', name, size:bytes.byteLength||0, pages:images.length });
      bumpLocalJob();
      await logUserAction(user, 'image_to_pdf', { tool:'image_to_pdf', status:'success', meta:{ pages:images.length, outputName:name } });
    } catch (err) {
      setError('Conversion failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'image_to_pdf', { tool:'image_to_pdf', status:'error', meta:{ error:err?.message } });
    } finally { setConverting(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Conversion Settings</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="imgFilename">Output Filename</label>
        <div className="ux-input-with-ext">
          <input id="imgFilename" className="ux-input-bare" type="text" value={filename} onChange={e => setFilename(e.target.value)} placeholder="images" spellCheck={false} />
          <span className="ux-input-ext">.pdf</span>
        </div>
      </div>

      <div className="ux-option-card selected">
        <div>
          <div className="ux-option-title">📄 One Image = One Page</div>
          <div className="ux-option-desc">Each image becomes a full PDF page. Drag to reorder.</div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Images</span><strong>{images.length}</strong></div>
          <div className="ux-summary-row"><span>Combined Size</span><strong>{formatBytes(totalSize)}</strong></div>
        </div>
      )}

      {error     && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {converting && <ProgressBar pct={progress} label="Converting images…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Created Successfully!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
               <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const blob = new Blob([lastBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = lastName;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>↓ Download</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Images" />
            </div>
            <ToolChaining lastBytes={lastBytes} lastName={lastName} currentTool="image_to_pdf" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleConvert} disabled={converting || !images.length}>
      {converting ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Converting…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Convert to PDF
        </span>
      )}
    </button>
  );

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  return (
    <ToolPageLayout
      title="Image to PDF"
      subtitle="Convert JPG, PNG, or WebP images into a single PDF. 100% local."
      icon="🖼️"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="imageToPdf" />

      <input type="file" ref={fileInputRef} style={{ display:'none' }} accept="image/*" multiple onChange={e => addImages(e.target.files)} />
      <input type="file" ref={cameraInputRef} style={{ display:'none' }} accept="image/*" capture="environment" onChange={e => addImages(e.target.files)} />

      {!images.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DropZone onFiles={addImages} multiple accept="image/*" label="Drop images to convert" hint="JPG, PNG, WebP · Max 20 files" filter={f => f.type.startsWith('image/')} />
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              className="ux-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600 }}
              onClick={() => cameraInputRef.current?.click()}
            >
              📷 Scan with Mobile Camera
            </button>
          </div>
        </div>
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Drag to reorder images. Click × to remove.</p>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap: 'wrap' }}>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 14px', display:'flex', alignItems:'center', gap:6 }} onClick={() => cameraInputRef.current?.click()}>
                📷 Scan Camera
              </button>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 14px', display:'flex', alignItems:'center', gap:6 }} onClick={() => fileInputRef.current?.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                Add Files
              </button>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 14px' }} onClick={() => setImages([])}>
                Clear All
              </button>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return;
              setImages(prev => {
                const oldIndex = prev.findIndex(i => i.id === active.id);
                const newIndex = prev.findIndex(i => i.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return prev;
                const next = [...prev];
                const [moved] = next.splice(oldIndex, 1);
                next.splice(newIndex, 0, moved);
                return next;
              });
            }}
          >
            <SortableContext items={images.map(img => img.id)}>
              <div className="image-grid">
                {images.map(img => <SortableImage key={img.id} id={img.id} item={img} onRemove={removeImage} />)}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <ToolSeoContent toolKey="imageToPdf" />
      <RecentFilesPanel tool="image_to_pdf" title="Recent conversions" />
    </ToolPageLayout>
  );
}
