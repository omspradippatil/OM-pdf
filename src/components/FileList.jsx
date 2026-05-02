import React, { useRef, useState } from 'react';
import { formatBytes } from '../fileManager';
import { reorderFiles } from '../fileManager';

export default function FileList({ files, onRemove, onClear, onAddMore, onReorder }) {
  const addRef  = useRef(null);
  const dragIdx = useRef(null);

  const handleDragStart = (i) => { dragIdx.current = i; };
  const handleDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    reorderFiles(dragIdx.current, i);
    dragIdx.current = i;
    onReorder?.();
  };

  return (
    <div className="file-panel">
      <div className="file-panel-header">
        <div className="file-count-badge">{files.length} file{files.length !== 1 ? 's' : ''}</div>
        <div className="file-panel-actions">
          <button className="btn-text" onClick={() => addRef.current?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Add More
          </button>
          <input ref={addRef} type="file" accept=".pdf,application/pdf" multiple hidden
            onChange={e => { if (e.target.files?.length) onAddMore(e.target.files); e.target.value=''; }} />
          <button className="btn-text btn-danger" onClick={onClear}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-.9 13.1A2 2 0 0 1 16.1 21H7.9a2 2 0 0 1-2-1.9L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Clear All
          </button>
        </div>
      </div>
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
                ? <img src={f.thumbnail} alt="" className="file-thumbnail" />
                : <div className="file-icon" aria-hidden="true">📄</div>
              }
              <div className="file-info">
                <div className="file-name" title={f.file.name}>{f.file.name}</div>
                <div className="file-meta">
                  <span className="file-size">{formatBytes(f.file.size)}</span>
                  <span className="file-pages">{f.pages ? `${f.pages} pages` : '…'}</span>
                </div>
              </div>
              <div className="file-order">{i + 1}</div>
              <button className="btn-remove" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.file.name}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
