import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserFiles, deleteUserFile } from '../myFiles';
import {
  listDriveFiles, deleteFromDrive,
  authorize, hasDriveAccess
} from '../services/googleDrive';
import ToolPageLayout from '../components/ToolPageLayout';

/* ── Helpers ── */
function fmt(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TOOL_LABELS = {
  merge: '🔗 Merge', split: '✂️ Split',
  rotate: '🔄 Rotate', page_numbers: '🔢 Page Nos',
};

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ─── File Card ── */
function FileCard({ name, size, date, tag, downloadHref, downloadName, onDelete, driveLink }) {
  return (
    <div className="mf-card">
      <div className="mf-card-icon">📄</div>
      <div className="mf-card-info">
        <div className="mf-card-name" title={name}>{name}</div>
        <div className="mf-card-meta">
          {tag && <span className="mf-tag">{tag}</span>}
          <span>{fmt(size)}</span>
          <span>{date}</span>
        </div>
      </div>
      <div className="mf-card-actions">
        {driveLink ? (
          <a className="mf-btn mf-btn-download" href={driveLink} target="_blank" rel="noopener noreferrer">
            Open in Drive ↗
          </a>
        ) : (
          <a className="mf-btn mf-btn-download" href={downloadHref} download={downloadName} target="_blank" rel="noopener noreferrer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
        )}
        <button className="mf-btn mf-btn-delete" onClick={onDelete}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          Delete
        </button>
      </div>
    </div>
  );
}

/* ─── Section header ── */
function SectionHeader({ title, count, onRefresh, loading }) {
  return (
    <div className="mf-header">
      <div className="mf-header-left">
        <h2 className="mf-title">{title}</h2>
        <span className="mf-subtitle">{count} file{count !== 1 ? 's' : ''}</span>
      </div>
      <button className="mf-refresh-btn" onClick={onRefresh} disabled={loading}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Refresh
      </button>
    </div>
  );
}

/* ─── Main Component ── */
export default function MyFiles() {
  const { user, login } = useAuth();

  // Firebase files
  const [fbFiles, setFbFiles]     = useState([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError]     = useState('');

  // Drive files
  const [driveFiles, setDriveFiles]       = useState([]);
  const [driveLoading, setDriveLoading]   = useState(false);
  const [driveError, setDriveError]       = useState('');
  const [driveConnected, setDriveConnected] = useState(false);

  // Active tab
  const [tab, setTab] = useState('firebase'); // 'firebase' | 'drive'

  /* ── Load Firebase files ── */
  const loadFirebase = useCallback(async () => {
    if (!user) return;
    setFbLoading(true); setFbError('');
    const list = await fetchUserFiles(user.uid);
    setFbFiles(list);
    setFbLoading(false);
  }, [user]);

  /* ── Load Drive files ── */
  const loadDrive = useCallback(async (forceAuth = false) => {
    setDriveLoading(true); setDriveError('');
    try {
      if (forceAuth) await authorize(user?.email || null);
      const list = await listDriveFiles(user?.email || null);
      setDriveFiles(list);
      setDriveConnected(true);
    } catch (err) {
      setDriveError(err.message || 'Could not load Drive files.');
      setDriveConnected(false);
    } finally {
      setDriveLoading(false);
    }
  }, [user]);

  useEffect(() => { loadFirebase(); }, [user, loadFirebase]);

  /* ── Delete Firebase file ── */
  const deleteFirebase = async (docId, path) => {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    const res = await deleteUserFile(docId, path);
    if (res.ok) setFbFiles(f => f.filter(x => x.id !== docId));
    else setFbError('Delete failed: ' + res.error);
  };

  /* ── Delete Drive file ── */
  const deleteDriveFile = async (fileId) => {
    if (!confirm('Delete this file from Google Drive? This cannot be undone.')) return;
    try {
      await deleteFromDrive(fileId, user?.email || null);
      setDriveFiles(f => f.filter(x => x.id !== fileId));
    } catch (err) {
      setDriveError('Delete failed: ' + err.message);
    }
  };

  /* ── Not logged in ── */
  if (!user) {
    return (
      <ToolPageLayout title="My Files" subtitle="View and manage your saved cloud files." icon="📁">
        <div className="mf-empty">
          <div className="mf-empty-icon">🔐</div>
          <p>Sign in to view your saved files.</p>
          <button className="btn-auth" style={{ margin: '16px auto 0', display: 'flex' }} onClick={login}>
            <GoogleIcon /> Sign In with Google
          </button>
        </div>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout title="My Files" subtitle="Files saved to Firebase Cloud or Google Drive." icon="📁">

      {/* ── Storage tabs ── */}
      <div className="mf-tabs">
        <button className={`mf-tab${tab === 'firebase' ? ' active' : ''}`} onClick={() => setTab('firebase')}>
          ☁️ Firebase Cloud
          {fbFiles.length > 0 && <span className="mf-tab-badge">{fbFiles.length}</span>}
        </button>
        <button className={`mf-tab${tab === 'drive' ? ' active' : ''}`} onClick={() => { setTab('drive'); if (!driveConnected) loadDrive(false); }}>
          <svg width="13" height="13" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', marginRight: 5 }}><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/><path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.55A8.994 8.994 0 0 0 0 53.05h27.5l16.15-28.05z" fill="#00AC47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.2 7.9 12.6z" fill="#EA4335"/><path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.1.45-4.5 1.2L43.65 25z" fill="#00832D"/><path d="M59.8 53.05H27.5L13.75 76.8c1.4.8 2.95 1.2 4.5 1.2h50.8c1.6 0 3.1-.45 4.5-1.2L59.8 53.05z" fill="#2684FC"/><path d="M73.4 26.5l-13.1-22.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28.05H87.3c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/></svg>
          Google Drive
          {driveFiles.length > 0 && <span className="mf-tab-badge">{driveFiles.length}</span>}
        </button>
      </div>

      {/* ══ FIREBASE TAB ══ */}
      {tab === 'firebase' && (
        <div className="mf-tab-content">
          <SectionHeader
            title="☁️ Firebase Cloud"
            count={fbFiles.length}
            onRefresh={loadFirebase}
            loading={fbLoading}
          />
          {fbError && <div className="alert alert-error"><span>❌ {fbError}</span></div>}
          {fbLoading ? (
            <div className="mf-loading">
              <span className="spinner" style={{ borderTopColor: 'var(--primary)' }} /> Loading…
            </div>
          ) : fbFiles.length === 0 ? (
            <div className="mf-empty">
              <div className="mf-empty-icon">☁️</div>
              <p>No files saved yet.</p>
              <p className="mf-empty-sub">Merge a PDF and click "Save to Cloud" to store it here.</p>
            </div>
          ) : (
            <div className="mf-grid">
              {fbFiles.map(f => (
                <FileCard
                  key={f.id}
                  name={f.name}
                  size={f.size}
                  date={fmtDate(f.createdAt)}
                  tag={TOOL_LABELS[f.tool] || '📁 File'}
                  downloadHref={f.url}
                  downloadName={f.name}
                  onDelete={() => deleteFirebase(f.id, f.storagePath)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ DRIVE TAB ══ */}
      {tab === 'drive' && (
        <div className="mf-tab-content">
          <SectionHeader
            title="🗂️ Google Drive — OM PDF folder"
            count={driveFiles.length}
            onRefresh={() => loadDrive(false)}
            loading={driveLoading}
          />
          {driveError && <div className="alert alert-warning"><span>⚠️ {driveError}</span></div>}

          {!driveConnected && !driveLoading && (
            <div className="mf-empty">
              <div className="mf-empty-icon" style={{ fontSize: '2.5rem' }}>
                <svg width="56" height="56" viewBox="0 0 87.3 78" fill="none"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/><path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.55A8.994 8.994 0 0 0 0 53.05h27.5l16.15-28.05z" fill="#00AC47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.2 7.9 12.6z" fill="#EA4335"/><path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.1.45-4.5 1.2L43.65 25z" fill="#00832D"/><path d="M59.8 53.05H27.5L13.75 76.8c1.4.8 2.95 1.2 4.5 1.2h50.8c1.6 0 3.1-.45 4.5-1.2L59.8 53.05z" fill="#2684FC"/><path d="M73.4 26.5l-13.1-22.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28.05H87.3c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/></svg>
              </div>
              <p>Connect Google Drive to view your <strong>OM PDF</strong> folder.</p>
              <p className="mf-empty-sub">Only files inside the "OM PDF" folder are shown — we never access anything else.</p>
              <button className="btn-connect-drive" onClick={() => loadDrive(true)}>
                <GoogleIcon /> Connect Google Drive
              </button>
            </div>
          )}

          {driveLoading && (
            <div className="mf-loading">
              <span className="spinner" style={{ borderTopColor: '#2684FC' }} /> Loading Drive files…
            </div>
          )}

          {driveConnected && !driveLoading && driveFiles.length === 0 && (
            <div className="mf-empty">
              <div className="mf-empty-icon">🗂️</div>
              <p>No files in your <strong>OM PDF</strong> Drive folder yet.</p>
              <p className="mf-empty-sub">Merge a PDF and click "Save to Drive" to save here.</p>
            </div>
          )}

          {driveConnected && !driveLoading && driveFiles.length > 0 && (
            <div className="mf-grid">
              {driveFiles.map(f => (
                <FileCard
                  key={f.id}
                  name={f.name}
                  size={parseInt(f.size, 10)}
                  date={fmtDate(f.createdTime)}
                  tag="🗂️ Drive"
                  driveLink={f.webViewLink}
                  onDelete={() => deleteDriveFile(f.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </ToolPageLayout>
  );
}
