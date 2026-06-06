import React, { useRef, useState } from 'react';

export default function DropZone({
  onFiles,
  multiple = false,
  label,
  hint,
  accept = '.pdf,application/pdf',
  filter = null,
}) {
  const inputRef   = useRef(null);
  const [active, setActive] = useState(false);

  /* Filter to only PDF files and pass valid ones */
  const dispatch = (fileList) => {
    const defaultFilter = (f) =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    const useFilter = filter || defaultFilter;
    const arr = Array.from(fileList).filter(useFilter);
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
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const onInputChange = (e) => {
    if (e.target.files?.length) dispatch(e.target.files);
    e.target.value = '';
  };

  return (
    <div
      className={`dropzone${active ? ' drag-over' : ''}`}
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
        {/* uxpilot-style circular icon */}
        <div className="dropzone-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 8 12 3 7 8"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="dropzone-primary">{label || 'Drag & drop PDF files here'}</p>
        <p className="dropzone-secondary">or click to browse from your device. Files are processed locally.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center' }}>
          <button
            className="btn-upload"
            type="button"
            onClick={openPicker}
          >
            Choose {multiple ? 'Files' : 'File'}
          </button>
          
          <button
            className="ux-btn-secondary"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
              const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
              if (!clientId || !apiKey) {
                alert('Google Drive import requires VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY to be set in your environment variables.');
                return;
              }
              
              // Load both scripts and wait for them
              let gapiReady = false;
              let gsiReady = false;

              const checkReady = () => {
                if (gapiReady && gsiReady) {
                  window.gapi.load('picker', { callback: onPickerApiLoad });
                }
              };

              const script = document.createElement('script');
              script.src = 'https://apis.google.com/js/api.js';
              script.onload = () => {
                gapiReady = true;
                checkReady();
              };
              document.body.appendChild(script);

              const gsi = document.createElement('script');
              gsi.src = 'https://accounts.google.com/gsi/client';
              gsi.onload = () => {
                gsiReady = true;
                checkReady();
              };
              document.body.appendChild(gsi);

              let oauthToken;
              function onPickerApiLoad() {
                const tokenClient = window.google.accounts.oauth2.initTokenClient({
                  client_id: clientId,
                  scope: 'https://www.googleapis.com/auth/drive.readonly',
                  callback: (response) => {
                    if (response.error !== undefined) { throw (response); }
                    oauthToken = response.access_token;
                    createPicker();
                  },
                });
                tokenClient.requestAccessToken();
              }

              function createPicker() {
                const view = new window.google.picker.DocsView(window.google.picker.ViewId.PDFS);
                view.setMimeTypes('application/pdf');
                const picker = new window.google.picker.PickerBuilder()
                    .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
                    .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
                    .setDeveloperKey(apiKey)
                    .setAppId(clientId.split('-')[0])
                    .setOAuthToken(oauthToken)
                    .addView(view)
                    .setCallback(pickerCallback)
                    .build();
                picker.setVisible(true);
              }

              async function pickerCallback(data) {
                if (data.action === window.google.picker.Action.PICKED) {
                  const files = [];
                  for (const doc of data.docs) {
                    try {
                      // Fetch the file bytes from Drive API
                      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
                        headers: { Authorization: `Bearer ${oauthToken}` }
                      });
                      const blob = await response.blob();
                      const file = new File([blob], doc.name, { type: 'application/pdf' });
                      files.push(file);
                    } catch (err) {
                      console.error('Failed to download from drive', err);
                    }
                  }
                  if (files.length) dispatch(files);
                }
              }
            }}
            style={{ borderRadius: '100px', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.17 11.23l-3.3-5.71a2 2 0 0 0-1.74-1H7.87a2 2 0 0 0-1.74 1l-3.3 5.71a2 2 0 0 0 0 2l3.3 5.71a2 2 0 0 0 1.74 1h8.26a2 2 0 0 0 1.74-1l3.3-5.71a2 2 0 0 0 0-2z"></path></svg>
            From Drive
          </button>
        </div>
        
        <p className="dropzone-hint" style={{ marginTop: 12 }}>
          {hint || `PDF files only · 200 MB Recommended${multiple ? ' per file' : ''}`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onChange={onInputChange}
        />
      </div>
    </div>
  );
}
