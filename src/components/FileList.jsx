import React, { useRef, useState } from 'react';
import {
  formatBytes,
  reorderFiles,
  reorderPages,
  removePageFromOrder,
  restorePages,
  setPageThumbnails,
} from '../fileManager';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';

function getSelectedPageCount(entry) {
  if (Array.isArray(entry.pageOrder)) return entry.pageOrder.length;
  return entry.pages || 0;
}

function SortablePageItem({ id, thumb, pageNumber, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`page-item${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="page-thumb-wrap">
        {thumb
          ? <img className="page-thumb" src={thumb} alt={`Page ${pageNumber} preview`} />
          : <div className="page-thumb-placeholder" aria-hidden="true" />}
      </div>
      <div className="page-number">{pageNumber}</div>
      <button className="page-delete" type="button" aria-label={`Remove page ${pageNumber}`} onClick={onRemove}>x</button>
    </div>
  );
}

export default function FileList({ files, onRemove, onClear, onReorder }) {
  const dragIdx = useRef(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [loadingIds, setLoadingIds] = useState(() => new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = (i) => { dragIdx.current = i; };
  const handleDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    reorderFiles(dragIdx.current, i);
    dragIdx.current = i;
    onReorder?.();
  };

  const togglePages = async (entry) => {
    const next = new Set(expandedIds);
    if (next.has(entry.id)) {
      next.delete(entry.id);
      setExpandedIds(next);
      return;
    }
    next.add(entry.id);
    setExpandedIds(next);
    if (!entry.pageThumbsLoaded && !loadingIds.has(entry.id)) {
      const pending = new Set(loadingIds);
      pending.add(entry.id);
      setLoadingIds(pending);
      const thumbs = await generatePageThumbnails(entry.file, () => {});
      if (thumbs) {
        setPageThumbnails(entry.id, thumbs);
      } else if (entry.pages) {
        const fallback = Array.from({ length: entry.pages }, () => null);
        setPageThumbnails(entry.id, fallback);
      }
      const done = new Set(pending);
      done.delete(entry.id);
      setLoadingIds(done);
    }
  };

  return (
    <div className="file-panel">
      <p className="reorder-hint">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>
        Drag to reorder files
      </p>
      <ul className="file-list" aria-label="Uploaded PDF files">
        {files.map((f, i) => (
          <li key={f.id} className="file-item"
            draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)}
          >
            <div className="file-row">
              <div className="file-drag-handle" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>
              </div>
              {f.thumbnail
                ? <img src={f.thumbnail} alt="" className="file-thumb" />
                : <div className="file-icon" aria-hidden="true">📄</div>
              }
              <div className="file-info" style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                <div className="file-name" title={f.file.name}>{f.file.name}</div>
                {f.status === 'processing' && (
                  <div style={{ width: '100%', background: 'var(--border)', height: 4, borderRadius: 2, marginTop: 4, marginBottom: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${f.progress || 0}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.2s' }} />
                  </div>
                )}
                <div className="file-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="file-size">{formatBytes(f.file.size)}</span>
                  {f.status === 'success' && <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg> Done</span>}
                  {f.status === 'error' && <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>❌ Error</span>}
                  {f.status === 'queued' && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⏳ Queued</span>}
                  {f.pages === null
                    ? <span className="file-pages file-pages-loading">Loading…</span>
                    : (
                      <span className={`file-pages${Array.isArray(f.pageOrder) && f.pageOrder.length !== f.pages ? ' file-pages-partial' : ''}`}>
                        {Array.isArray(f.pageOrder) && f.pageOrder.length !== f.pages
                          ? `${getSelectedPageCount(f)} / ${f.pages} pages`
                          : `${f.pages} pages`}
                      </span>
                    )}
                </div>
              </div>
              <div className="file-order">{i + 1}</div>
              <button
                className="btn-pages"
                type="button"
                aria-expanded={expandedIds.has(f.id)}
                onClick={() => togglePages(f)}
                disabled={f.pages === null}
              >
                Pages
              </button>
              <button className="btn-remove" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.file.name}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            {expandedIds.has(f.id) && (
              <div className="page-panel">
                <div className="page-panel-header">
                  <div className="page-panel-title">
                    Pages ({getSelectedPageCount(f)}/{f.pages || 0})
                  </div>
                  <div className="page-panel-actions">
                    <button
                      className="btn-text btn-compact"
                      type="button"
                      onClick={() => restorePages(f.id)}
                      disabled={!Array.isArray(f.pageOrder) || f.pageOrder.length === f.pages}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <p className="page-panel-hint">Drag thumbnails to reorder. Click x to remove a page.</p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    const order = Array.isArray(f.pageOrder) ? f.pageOrder : [];
                    const fromIndex = order.indexOf(Number(active.id));
                    const toIndex = order.indexOf(Number(over.id));
                    if (fromIndex !== -1 && toIndex !== -1) {
                      reorderPages(f.id, fromIndex, toIndex);
                    }
                  }}
                >
                  <SortableContext items={(f.pageOrder || []).map(n => String(n))}>
                    <div className="page-grid" role="list">
                      {(f.pageOrder || []).map((pageIndex) => (
                        <SortablePageItem
                          key={pageIndex}
                          id={String(pageIndex)}
                          thumb={f.pageThumbs?.[pageIndex]}
                          pageNumber={pageIndex + 1}
                          onRemove={() => removePageFromOrder(f.id, pageIndex)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {Array.isArray(f.pageOrder) && f.pageOrder.length === 0 && (
                  <p className="page-empty">All pages removed.</p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
