import React, { useState, useRef } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { generateThumbnail } from '../thumbnailGenerator';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/MetadataEditor.css';

const META_FIELDS = [
  { key: 'title',    label: 'Title',                  placeholder: 'Document Title' },
  { key: 'author',   label: 'Author',                  placeholder: 'Author Name' },
  { key: 'subject',  label: 'Subject',                 placeholder: 'Subject or Category' },
  { key: 'keywords', label: 'Keywords (comma-separated)', placeholder: 'tag1, tag2, tag3' },
  { key: 'creator',  label: 'Creator / App',           placeholder: 'Application Creator' },
  { key: 'producer', label: 'Producer',                placeholder: 'PDF Producer' },
];

export default function MetadataEditor() {
  const { user } = useAuth();
  const [file, setFile]       = useState(null);
  const [metadata, setMetadata] = useState({ title: '', author: '', subject: '', keywords: '', creator: '', producer: '' });
  const [progress, setProgress] = useState(0);
  const [working, setWorking]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0); setThumbnail(null);
    generateThumbnail(f).then(url => setThumbnail(url));
    try {
      const buffer = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setMetadata({
        title:    pdfDoc.getTitle()    || '',
        author:   pdfDoc.getAuthor()   || '',
        subject:  pdfDoc.getSubject()  || '',
        keywords: pdfDoc.getKeywords() || '',
        creator:  pdfDoc.getCreator()  || '',
        producer: pdfDoc.getProducer() || '',
      });
    } catch { setError('Could not read PDF metadata. The file might be protected.'); }
  };

  const handleUpdate = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(20);
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setProgress(50);
      pdfDoc.setTitle(metadata.title);
      pdfDoc.setAuthor(metadata.author);
      pdfDoc.setSubject(metadata.subject);
      pdfDoc.setKeywords(metadata.keywords.split(',').map(k => k.trim()));
      pdfDoc.setCreator(metadata.creator);
      pdfDoc.setProducer(metadata.producer);
      const bytes = await pdfDoc.save();
      setProgress(100);
      const name = file.name.replace(/\.pdf$/i, '_updated.pdf');
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      lastBytesRef.current = bytes;
      lastNameRef.current  = name;
      setSuccess(`"${name}" saved with updated metadata!`);
      addRecentFile({ tool: 'metadata', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'metadata', { tool: 'metadata', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Failed to update metadata: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'metadata', { tool: 'metadata', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  /* ── Right Panel ── */
  const sidebarContent = (
    <>
      <p className="ux-section-label">PDF Metadata</p>

      {/* Metadata fields */}
      {META_FIELDS.map(({ key, label, placeholder }) => (
        <div className="ux-field" key={key}>
          <label className="ux-label" htmlFor={`meta-${key}`}>{label}</label>
          <input
            id={`meta-${key}`}
            name={key}
            className="ux-input"
            type="text"
            value={metadata[key]}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={500}
          />
        </div>
      ))}

      {error   && <div className="alert alert-error"   style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Updating Metadata…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Updated Successfully!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const blob = new Blob([lastBytesRef.current], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = lastNameRef.current;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>↓ Download</button>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Metadata" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleUpdate} disabled={working || !file}>
      {working ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Saving…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Save Metadata
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Metadata Editor"
      subtitle="View and edit PDF properties like Title and Author instantly. 100% local."
      icon="📝"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="metadata" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to edit metadata" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Update metadata fields in the right panel.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, minHeight:280, gap:14, background:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)' }}>
            <div className="ux-page-card" style={{ width: '220px', cursor: 'default' }}>
              <div className="ux-page-thumb-wrap" style={{ height: '300px' }}>
                {thumbnail ? <img className="ux-page-thumb-img" src={thumbnail} alt="PDF Preview" /> : <div className="ux-page-thumb-placeholder" />}
              </div>
            </div>
            <p style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)', margin:0 }}>{file.name}</p>
            <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', margin:0 }}>{formatBytes(file.size)} · Document Properties</p>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="metadata" />
      <RecentFilesPanel tool="metadata" title="Recent edits" />
    </ToolPageLayout>
  );
}
