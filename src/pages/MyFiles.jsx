import SEO from '../components/SEO';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { listDriveFiles, deleteFromDrive } from '../services/googleDrive';
import { logUserAction } from '../services/activityLog';
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
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ─── File Card ── */
function FileCard({ name, size, date, downloadHref, onDelete, driveLink }) {
  return (
    <div className="mf-card">
      <div className="mf-card-icon">📄</div>
      <div className="mf-card-info">
        <div className="mf-card-name" title={name}>{name}</div>
        <div className="mf-card-meta">
          <span className="mf-tag">🗂️ Drive</span>
          <span>{fmt(size)}</span>
          <span>{date}</span>
        </div>
      </div>
      <div className="mf-card-actions">
        <a className="mf-btn mf-btn-download" href={driveLink} target="_blank" rel="noopener noreferrer">
          Open in Drive ↗
        </a>
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
  const { user, login, ensureDriveToken } = useAuth();

  const [driveFiles, setDriveFiles]       = useState([]);
  const [driveLoading, setDriveLoading]   = useState(false);
  const [driveError, setDriveError]       = useState('');
  const [driveReady, setDriveReady]       = useState(false);

  const loadDrive = useCallback(async () => {
    if (!user) return;
    setDriveLoading(true); setDriveError('');
    try {
      await ensureDriveToken();
      const list = await listDriveFiles(user?.email || null);
      setDriveFiles(list || []);
      setDriveReady(true);
    } catch (err) {
      setDriveError(err.message || 'Could not load Drive files.');
      setDriveReady(false);
    } finally {
      setDriveLoading(false);
    }
  }, [user, ensureDriveToken]);

  useEffect(() => {
    if (user) loadDrive();
  }, [user, loadDrive]);

  const deleteDriveFile = async (fileId) => {
    if (!confirm('Delete this file from Google Drive? This cannot be undone.')) return;
    try {
      await ensureDriveToken();
      await deleteFromDrive(fileId, user?.email || null);
      setDriveFiles(f => f.filter(x => x.id !== fileId));
      await logUserAction(user, 'drive_delete', { status: 'success', meta: { fileId } });
    } catch (err) {
      setDriveError('Delete failed: ' + err.message);
      await logUserAction(user, 'drive_delete', { status: 'error', meta: { fileId, error: err?.message || 'Delete failed' } });
    }
  };

  if (!user) {
    return (
      <ToolPageLayout title="My Files" subtitle="View and manage your saved Drive files." icon="📁">
        <div className="mf-empty">
          <div className="mf-empty-icon">🔐</div>
          <p>Sign in with Google to view your files.</p>
          <button className="btn-auth" style={{ margin: '16px auto 0', display: 'flex' }} onClick={login}>
            <GoogleIcon /> Sign In with Google
          </button>
        </div>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout title="My Files" subtitle="Files saved to your Google Drive 'OM PDF' folder." icon="📁">
      <div className="mf-tab-content">
        <SectionHeader
          title="🗂️ Google Drive Files"
          count={driveFiles.length}
          onRefresh={loadDrive}
          loading={driveLoading}
        />
        {driveError && <div className="alert alert-warning"><span>⚠️ {driveError}</span></div>}

        {driveLoading && (
          <div className="mf-loading">
            <span className="spinner" style={{ borderTopColor: '#2684FC' }} /> Loading Drive files…
          </div>
        )}

        {!driveLoading && driveFiles.length === 0 && (
          <div className="mf-empty">
            <div className="mf-empty-icon">🗂️</div>
            <p>No files in your <strong>OM PDF</strong> Drive folder yet.</p>
            <p className="mf-empty-sub">Merge a PDF and click "Save to Drive" to save here.</p>
          </div>
        )}

        {!driveLoading && driveFiles.length > 0 && (
          <div className="mf-grid">
            {driveFiles.map(f => (
              <FileCard
                key={f.id}
                name={f.name}
                size={parseInt(f.size, 10)}
                date={fmtDate(f.createdTime)}
                driveLink={f.webViewLink}
                onDelete={() => deleteDriveFile(f.id)}
              />
            ))}
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
