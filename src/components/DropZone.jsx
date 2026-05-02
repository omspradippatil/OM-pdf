import React, { useRef, useState } from 'react';

export default function DropZone({ onFiles, multiple = false, label, hint }) {
  const inputRef   = useRef(null);
  const [active, setActive] = useState(false);

  /* Filter to only PDF files and pass valid ones */
  const dispatch = (fileList) => {
    const arr = Array.from(fileList).filter(
      f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (arr.length) onFiles(arr);
  };

  /* Drag events */
  const onDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); setActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setActive(false); };
  const onDrop      = (e) => {
    e.preventDefault(); e.stopPropagation();
    setActive(false);
    if (e.dataTransfer.files?.length) dispatch(e.dataTransfer.files);
  };

  const openPicker = (e) => {
    e.stopPropagation();
    // Reset so the same file can be re-selected after removal
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const onInputChange = (e) => {
    if (e.target.files?.length) dispatch(e.target.files);
    // Reset value so re-selecting same file works
    e.target.value = '';
  };

  return (
    <div
      className={`dropzone${active ? ' drag-active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label || 'Upload PDF files'}
      onClick={openPicker}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(e); }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnter={onDragOver}
      onDrop={onDrop}
    >
      <div className="dropzone-content">
        <div className="dropzone-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 8 12 3 7 8"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="dropzone-primary">{label || 'Drag & drop PDF files here'}</p>
        <p className="dropzone-secondary">or</p>
        <button
          className="btn-upload"
          type="button"
          onClick={openPicker}
        >
          Choose {multiple ? 'PDF Files' : 'PDF File'}
        </button>
        <p className="dropzone-hint">
          {hint || `PDF files only · Max 200 MB${multiple ? ' per file' : ''}`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple={multiple}
          hidden
          onChange={onInputChange}
        />
      </div>
    </div>
  );
}
