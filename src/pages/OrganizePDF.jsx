import React, { useEffect, useMemo, useState } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { formatBytes } from '../fileManager';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { PDFDocument } from 'pdf-lib';
import PdfCanvas from '../components/PdfCanvas';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';

async function getPageCount(file) {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function SortablePageItem({ id, thumb, pageNumber, onRemove, onSelect, selected }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`page-item${isDragging ? ' dragging' : ''}${selected ? ' selected' : ''}`}
      {...attributes}
      {...listeners}
    >
      <button className="page-thumb-wrap" type="button" onClick={onSelect}>
        {thumb
          ? <img className="page-thumb" src={thumb} alt={`Page ${pageNumber} preview`} loading="lazy" />
          : <div className="page-thumb-placeholder" aria-hidden="true" />}
      </button>
      <div className="page-number">{pageNumber}</div>
      <button className="page-delete" type="button" aria-label={`Remove page ${pageNumber}`} onClick={onRemove}>x</button>
    </div>
  );
}

export default function OrganizePDF() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pageThumbs, setPageThumbs] = useState([]);
  const [pageOrder, setPageOrder] = useState([]);
  const [pageCount, setPageCount] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [previewError, setPreviewError] = useState('');
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
    setPageThumbs([]);
    setPageOrder([]);
    setPageCount(null);
    setProgress(0);
    setSelectedPage(1);
    setPreviewError('');
  };

  useEffect(() => {
    if (!file) return;
    let active = true;

    (async () => {
      const count = await getPageCount(file);
      if (!active) return;
      if (!count) {
        setError('Could not read page count.');
        return;
      }
      setPageCount(count);
      setPageOrder(Array.from({ length: count }, (_, i) => i));
      setSelectedPage(1);

      const thumbs = await generatePageThumbnails(file, () => {});
      if (!active) return;
      if (thumbs && thumbs.length) {
        setPageThumbs(thumbs);
      } else {
        setPageThumbs(Array.from({ length: count }, () => null));
      }
    })();

    return () => { active = false; };
  }, [file]);

  const pagesSelected = useMemo(() => pageOrder.length, [pageOrder]);

  const resetOrder = () => {
    if (!pageCount) return;
    setPageOrder(Array.from({ length: pageCount }, (_, i) => i));
  };

  const removePage = (pageIndex) => {
    setPageOrder(prev => prev.filter(i => i !== pageIndex));
  };

  const handleExport = async () => {
    if (!file) return;
    if (!pageOrder.length) {
      setError('No pages selected.');
      return;
    }
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      setProgress(10);
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      setProgress(50);
      const copied = await outDoc.copyPages(srcDoc, pageOrder);
      copied.forEach(p => outDoc.addPage(p));
      setProgress(90);
      const bytes = await outDoc.save();
      setProgress(100);

      const name = file.name.replace(/\.pdf$/i, '_organized.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes);
      setLastName(name);
      setSuccess(`"${name}" saved with ${pagesSelected} page${pagesSelected !== 1 ? 's' : ''}`);

      addRecentFile({ tool: 'organize', name, size: bytes.byteLength || 0, pages: pagesSelected });
      bumpLocalJob();
      await logUserAction(user, 'organize', {
        tool: 'organize',
        status: 'success',
        meta: { outputName: name, pages: pagesSelected }
      });
    } catch (err) {
      setError('Organize failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'organize', {
        tool: 'organize',
        status: 'error',
        meta: { error: err?.message || 'Organize failed' }
      });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  return (
    <ToolPageLayout
      title="Organize PDF"
      subtitle="Reorder and delete pages in a PDF, then export a clean copy."
      icon="🧩"
    >
      <SEO
        keywords="reorder pdf pages, delete pdf pages, organize pdf, rearrange pdf"
        title="Organize PDF Pages Online Free — Reorder and Delete | OM PDF"
        description="Reorder or delete PDF pages instantly in your browser. 100% private, no upload required."
        url="https://om-pdf.netlify.app/organize-pdf"
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to organize" hint="Single PDF - Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta">
                <span className="file-size">{formatBytes(file.size)}</span>
                <span className="file-pages">{pageCount ? `${pagesSelected} / ${pageCount} pages` : 'counting...'}</span>
              </div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="page-panel organize-panel">
            <div className="organize-toolbar">
              <div>
                <div className="organize-title">Pages</div>
                <div className="organize-sub">
                  {pageCount ? `${pagesSelected} of ${pageCount} selected` : 'Loading pages...'}
                </div>
              </div>
              <div className="organize-actions">
                <button
                  className="btn-text btn-compact"
                  type="button"
                  onClick={resetOrder}
                  disabled={!pageCount || pagesSelected === pageCount}
                >
                  Reset order
                </button>
              </div>
            </div>
            <p className="page-panel-hint">Drag to reorder. Click x to delete a page.</p>

            <div className="organize-layout">
              <div className="organize-preview">
                <div className="organize-preview-title">Preview</div>
                <div className="organize-preview-frame">
                  <PdfCanvas
                    file={file}
                    pageNumber={selectedPage}
                    width={520}
                    onRender={() => setPreviewError('')}
                    onError={(err) => setPreviewError(err?.message || 'Preview failed to load.')}
                  />
                </div>
                {previewError ? <div className="organize-preview-error">{previewError}</div> : null}
              </div>

              <div>
                <div className="organize-grid-title">Pages</div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    setPageOrder(prev => {
                      const fromIndex = prev.indexOf(Number(active.id));
                      const toIndex = prev.indexOf(Number(over.id));
                      if (fromIndex < 0 || toIndex < 0) return prev;
                      const next = [...prev];
                      const [moved] = next.splice(fromIndex, 1);
                      next.splice(toIndex, 0, moved);
                      return next;
                    });
                  }}
                >
                  <SortableContext items={pageOrder.map(n => String(n))}>
                    <div className="page-grid organize-grid" role="list">
                      {pageOrder.map((pageIndex) => (
                        <SortablePageItem
                          key={pageIndex}
                          id={String(pageIndex)}
                          thumb={pageThumbs?.[pageIndex]}
                          pageNumber={pageIndex + 1}
                          selected={selectedPage === pageIndex + 1}
                          onSelect={() => setSelectedPage(pageIndex + 1)}
                          onRemove={() => removePage(pageIndex)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>

            {!pageOrder.length && (
              <p className="page-empty">All pages removed.</p>
            )}
          </div>

          {error && <div className="alert alert-error"><span>! {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {working && <ProgressBar pct={progress} label="Organizing pages..." />}

          {success && (
            <SuccessBanner message="Organize complete!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton
                bytes={lastBytes}
                filename={lastName}
                toolFolder="Organized"
              />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button className="btn-merge btn-rotate-action" onClick={handleExport} disabled={working}>
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="8" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/></svg>
                Export PDF
              </span>
            </button>
            <p className="merge-hint">Processed locally - no upload</p>
          </div>
        </div>
      )}

      <RecentFilesPanel tool="organize" title="Recent organizes" />
    </ToolPageLayout>
  );
}
