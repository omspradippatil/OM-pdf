import React, { useEffect, useMemo, useState } from 'react';
import SEO from '../components/SEO';
import { PDFDocument } from 'pdf-lib';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';
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
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={`image-card${isDragging ? ' dragging' : ''}`} {...attributes} {...listeners}>
      <img src={item.url} alt={item.name} className="image-thumb" loading="lazy" />
      <div className="image-card-footer">
        <div className="image-name" title={item.name}>{item.name}</div>
        <span className="image-size">{formatBytes(item.size)}</span>
      </div>
      <button className="image-remove" type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}>?</button>
    </div>
  );
}

async function readImageBytes(file) {
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    const bytes = await file.arrayBuffer();
    return { bytes, type: 'jpg' };
  }
  if (file.type === 'image/png') {
    const bytes = await file.arrayBuffer();
    return { bytes, type: 'png' };
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.92));
  if (!blob) {
    throw new Error('Failed to process image data.');
  }
  const bytes = await blob.arrayBuffer();
  return { bytes, type: 'png' };
}

import { runPdfWorkerTask } from '../workers/workerClient';

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
  const [images, setImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filename, setFilename] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, [images]);

  const addImages = (files) => {
    const incoming = Array.from(files).filter(f => f.type.startsWith('image/'));
    const mapped = incoming.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...mapped]);
    if (!filename && incoming.length) {
      setFilename(incoming[0].name.replace(/\.(jpg|jpeg|png|webp)$/i, ''));
    }
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
  const queueItems = images.length ? [{
    id: 'images',
    name: `${images.length} images`,
    status: converting ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: converting ? progress : success ? 100 : 0,
    etaMs: totalSize ? Math.max(1500, Math.round((totalSize / (1024 * 1024)) * 900)) : null,
    message: error || '',
  }] : [];

  const handleConvert = async () => {
    if (!images.length) return;
    setError(''); setSuccess(''); setConverting(true); setProgress(0);
    try {
      const bytes = await imagesToPdf(images, setProgress);
      const name = `${(filename.trim() || 'images')}_${new Date().toISOString().slice(0,10)}.pdf`;
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`Created ${images.length} page PDF`);
      addRecentFile({ tool: 'image_to_pdf', name, size: bytes.byteLength || 0, pages: images.length });
      bumpLocalJob();
      await logUserAction(user, 'image_to_pdf', {
        tool: 'image_to_pdf',
        status: 'success',
        meta: { pages: images.length, outputName: name }
      });
    } catch (err) {
      setError('Conversion failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'image_to_pdf', {
        tool: 'image_to_pdf',
        status: 'error',
        meta: { error: err?.message || 'Conversion failed' }
      });
    } finally {
      setConverting(false); setProgress(0);
    }
  };

  return (
    <ToolPageLayout title="Image to PDF" subtitle="Convert JPG, PNG, or WebP images into a single PDF." icon="📄">
      <SEO keywords="jpg to pdf, png to pdf, convert images to pdf, image to pdf converter, create pdf from images" title="JPG to PDF Online Free — OM PDF | Convert Images to PDF" description="Convert JPG, PNG, or WebP images into a single PDF. Fast, private, and fully offline." url="https://om-pdf.netlify.app/image-to-pdf" />
      {!images.length ? (
        <DropZone
          onFiles={addImages}
          multiple
          accept="image/*"
          label="Drop images to convert"
          hint="JPG, PNG, WebP - Max 20 files"
          filter={(f) => f.type.startsWith('image/')}
        />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">🖼️</div>
            <div className="file-info">
              <div className="file-name">{images.length} images selected</div>
              <div className="file-meta">
                <span className="file-size">{formatBytes(totalSize)}</span>
              </div>
            </div>
            <button className="btn-remove" onClick={() => setImages([])}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-option-panel">
            <label className="split-label">Reorder images</label>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                const { active, over } = event;
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
                  {images.map(img => (
                    <SortableImage key={img.id} id={img.id} item={img} onRemove={removeImage} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="filename-row">
            <label className="filename-label" htmlFor="imgFilename">Output filename</label>
            <div className="filename-input-wrap">
              <input
                id="imgFilename"
                className="filename-input"
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="images"
                spellCheck={false}
              />
              <span className="filename-ext">.pdf</span>
            </div>
          </div>

          {error && <div className="alert alert-error"><span>❌ {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {converting && <ProgressBar pct={progress} label="Converting images..." />}
          {success && (
            <SuccessBanner message="PDF created!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Images" />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button className="btn-merge" style={{ background: 'linear-gradient(135deg,#0EA5E9,#2563EB)' }}
              onClick={handleConvert} disabled={converting}>
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Convert to PDF
              </span>
            </button>
            <p className="merge-hint">🔒 Processed locally - no upload</p>
          </div>
        </div>
      )}
      <RecentFilesPanel tool="image_to_pdf" title="Recent image to PDF" />
    </ToolPageLayout>
  );
}









