import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadToDrive } from '../services/googleDrive';

const DriveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
    <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.55A8.994 8.994 0 0 0 0 53.05h27.5l16.15-28.05z" fill="#00AC47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.2 7.9 12.6z" fill="#EA4335"/>
    <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.1.45-4.5 1.2L43.65 25z" fill="#00832D"/>
    <path d="M59.8 53.05H27.5L13.75 76.8c1.4.8 2.95 1.2 4.5 1.2h50.8c1.6 0 3.1-.45 4.5-1.2L59.8 53.05z" fill="#2684FC"/>
    <path d="M73.4 26.5l-13.1-22.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28.05H87.3c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/>
  </svg>
);

/**
 * Reusable "Save to Drive" button for all tool pages.
 *
 * @prop {Uint8Array|Blob|null} bytes       - file content to upload
 * @prop {string}               filename    - target filename (with extension)
 * @prop {string}               toolFolder  - Drive subfolder name (e.g. 'Merged')
 * @prop {string}               [mimeType]  - defaults to 'application/pdf'
 */
export default function SaveToDriveButton({ bytes, filename, toolFolder, mimeType = 'application/pdf' }) {
  const { user }    = useAuth();
  const [status, setStatus] = useState('idle');   // idle | loading | success | error
  const [link, setLink]     = useState('');
  const [errMsg, setErrMsg] = useState('');

  const handleSave = async () => {
    if (!bytes || status === 'loading') return;
    setStatus('loading'); setLink(''); setErrMsg('');
    try {
      const result = await uploadToDrive(bytes, filename, user?.email || null, toolFolder, mimeType);
      setLink(result.webViewLink || '');
      setStatus('success');
    } catch (err) {
      console.error('[Drive]', err);
      setErrMsg(err.message || 'Upload failed');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="drive-save-group">
        <span className="btn-action-sm btn-drive success">
          <DriveIcon /> Saved to Drive ✓
        </span>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="drive-open-link">
            Open in Drive ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="drive-save-group">
      <button
        className={`btn-action-sm btn-drive${status === 'error' ? ' error' : ''}`}
        onClick={handleSave}
        disabled={!bytes || status === 'loading'}
        title={`Save to OM PDF / ${toolFolder} in your Google Drive`}
      >
        {status === 'loading' ? (
          <><span className="spinner-xs" /> Uploading to Drive…</>
        ) : (
          <><DriveIcon /> {status === 'error' ? 'Retry Drive upload' : 'Save to Drive'}</>
        )}
      </button>
      {status === 'error' && errMsg && (
        <span className="drive-error-msg" title={errMsg}>⚠️ {errMsg.slice(0, 60)}</span>
      )}
    </div>
  );
}
