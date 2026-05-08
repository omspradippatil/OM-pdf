import React, { useState, useRef, useEffect } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';

export default function MetadataEditor() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
  });
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastBytesRef = useRef(null);
  const lastNameRef = useRef('');

  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: working ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: working ? progress : success ? 100 : 0,
    etaMs: file.size ? Math.max(800, Math.round((file.size / (1024 * 1024)) * 400)) : null,
    message: error || '',
  }] : [];

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    
    setFile(f);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const buffer = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      
      setMetadata({
        title: pdfDoc.getTitle() || '',
        author: pdfDoc.getAuthor() || '',
        subject: pdfDoc.getSubject() || '',
        keywords: pdfDoc.getKeywords() || '',
        creator: pdfDoc.getCreator() || '',
        producer: pdfDoc.getProducer() || '',
      });
    } catch (err) {
      setError('Could not read PDF metadata. The file might be protected.');
    }
  };

  const handleUpdate = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(20);

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      lastBytesRef.current = bytes;
      lastNameRef.current = name;
      setSuccess(`"${name}" saved with updated metadata!`);

      addRecentFile({ tool: 'metadata', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'metadata', {
        tool: 'metadata',
        status: 'success',
        meta: { outputName: name }
      });
    } catch (err) {
      setError('Failed to update metadata: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'metadata', {
        tool: 'metadata',
        status: 'error',
        meta: { error: err?.message || 'Update failed' }
      });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  return (
    <ToolPageLayout
      title="Metadata Editor"
      subtitle="View and edit PDF properties like Title, Author, Subject and Keywords instantly."
      icon="📝"
    >
      <SEO
        keywords="edit pdf metadata, change pdf author, update pdf title, pdf properties editor"
        title="PDF Metadata Editor Online Free — Edit Author and Title | OM PDF"
        description="View and modify the metadata of your PDF files locally. Change title, author, subject, and keywords without uploading your files."
        url="https://om-pdf.netlify.app/metadata-editor"
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to edit metadata" hint="Single PDF - Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span></div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="split-option-panel">
            <div className="metadata-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="metaTitle">Title</label>
                <input id="metaTitle" name="title" className="split-range-input" type="text" value={metadata.title} onChange={handleChange} placeholder="Document Title" style={{ padding: '10px' }} />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="metaAuthor">Author</label>
                <input id="metaAuthor" name="author" className="split-range-input" type="text" value={metadata.author} onChange={handleChange} placeholder="Author Name" style={{ padding: '10px' }} />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="metaSubject">Subject</label>
                <input id="metaSubject" name="subject" className="split-range-input" type="text" value={metadata.subject} onChange={handleChange} placeholder="Subject" style={{ padding: '10px' }} />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="metaKeywords">Keywords (comma separated)</label>
                <input id="metaKeywords" name="keywords" className="split-range-input" type="text" value={metadata.keywords} onChange={handleChange} placeholder="tag1, tag2, tag3" style={{ padding: '10px' }} />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="metaCreator">Creator / App</label>
                <input id="metaCreator" name="creator" className="split-range-input" type="text" value={metadata.creator} onChange={handleChange} placeholder="Application Creator" style={{ padding: '10px' }} />
              </div>
              <div className="pn-option-group">
                <label className="split-label" htmlFor="metaProducer">Producer</label>
                <input id="metaProducer" name="producer" className="split-range-input" type="text" value={metadata.producer} onChange={handleChange} placeholder="PDF Producer" style={{ padding: '10px' }} />
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error"><span>! {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {working && <ProgressBar pct={progress} label="Updating Metadata..." />}

          {success && (
            <SuccessBanner message="Metadata updated!" details={success} onDismiss={() => setSuccess('')}>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Metadata" />
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button
              className="btn-merge"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
              onClick={handleUpdate}
              disabled={working}
            >
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Save Metadata
              </span>
            </button>
            <p className="merge-hint">Processed locally - Your file stays private</p>
          </div>
        </div>
      )}

      <RecentFilesPanel tool="metadata" title="Recent edits" />
    </ToolPageLayout>
  );
}
