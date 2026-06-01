import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import FileList from '../components/FileList';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/SanitizeMetadata.css';

export default function SanitizeMetadata() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastBytesRef = useRef(null);
  const lastNameRef  = useRef('');
  const isZipRef     = useRef(false);
  const fileInputRef = useRef(null);

  const loadFiles = async (raw) => {
    const valid = Array.from(raw).filter(f => f.type === 'application/pdf');
    if (!valid.length) { setError('Select at least one valid PDF.'); return; }
    
    const newFiles = valid.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name,
      size: f.size
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setError(''); setSuccess(''); setProgress(0);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSanitize = async () => {
    if (!files.length) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      if (files.length === 1) {
        setProgress(20);
        const fileObj = files[0].file;
        const buf = await fileObj.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        setProgress(50);
        
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setCreator('');
        pdfDoc.setProducer('');
        pdfDoc.setCreationDate(new Date());
        pdfDoc.setModificationDate(new Date());
        
        const bytes = await pdfDoc.save();
        setProgress(90);

        const name = fileObj.name.replace(/\.pdf$/i, '_sanitized.pdf');
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

        lastBytesRef.current = bytes; lastNameRef.current = name; isZipRef.current = false;
        setProgress(100);
        setSuccess('Metadata removed.');
        addRecentFile({ tool: 'sanitize_meta', name, size: bytes.byteLength || 0 });
        bumpLocalJob();
        await logUserAction(user, 'sanitize_meta', { tool: 'sanitize_meta', status: 'success', meta: { outputName: name, batch: false } });
      } else {
        const zip = new JSZip();
        const folder = zip.folder('Sanitized_PDFs');
        
        for (let i = 0; i < files.length; i++) {
          const fileObj = files[i].file;
          
          setProgress(Math.round(((i + 0.2) / files.length) * 90));
          const buf = await fileObj.arrayBuffer();
          const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
          
          setProgress(Math.round(((i + 0.5) / files.length) * 90));
          pdfDoc.setTitle('');
          pdfDoc.setAuthor('');
          pdfDoc.setSubject('');
          pdfDoc.setKeywords([]);
          pdfDoc.setCreator('');
          pdfDoc.setProducer('');
          pdfDoc.setCreationDate(new Date());
          pdfDoc.setModificationDate(new Date());
          
          const bytes = await pdfDoc.save();
          
          folder.file(fileObj.name.replace(/\.pdf$/i, '_sanitized.pdf'), bytes);
          setProgress(Math.round(((i + 1) / files.length) * 90));
        }
        
        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        setProgress(100);
        
        const zipName = `sanitized_batch_${Date.now()}.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a'); a.href = url; a.download = zipName;
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        lastBytesRef.current = zipBlob; lastNameRef.current = zipName; isZipRef.current = true;
        setSuccess(`Successfully sanitized metadata for ${files.length} files.`);
        
        addRecentFile({ tool: 'sanitize_batch', name: zipName, size: zipBlob.size });
        bumpLocalJob();
        await logUserAction(user, 'sanitize_meta', { tool: 'sanitize_meta', status: 'success', meta: { batch: true, count: files.length } });
      }
    } catch (err) {
      setError('Sanitizing failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'sanitize_meta', { tool: 'sanitize_meta', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Sanitize Settings</p>
      <div className="sanitize-card">
        <div className="sanitize-title">Fields Removed</div>
        <ul>
          <li>Title, Author, Subject</li>
          <li>Keywords</li>
          <li>Creator and Producer</li>
        </ul>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Sanitizing metadata..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Sanitized</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const blob = isZipRef.current ? lastBytesRef.current : new Blob([lastBytesRef.current], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = lastNameRef.current;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download</button>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Sanitized" mimeType={isZipRef.current ? "application/zip" : "application/pdf"} />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Sanitize Metadata"
      subtitle="Remove identifying metadata before sharing."
      icon="S"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Sanitizing...' : 'Sanitize PDF'}
      onAction={handleSanitize}
      actionDisabled={working || !files.length}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="sanitizeMeta" />

      <input ref={fileInputRef} type="file" multiple accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFiles(e.target.files)} />

      {!files.length ? (
        <DropZone onFiles={loadFiles} label="Drop PDF(s) to sanitize" hint="Multiple PDFs supported · 200 MB Recommended" multiple />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{files.length} file{files.length > 1 ? 's' : ''} ready to sanitize.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => fileInputRef.current?.click()}>
                Add More
              </button>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFiles([]); setSuccess(''); setError(''); }}>
                Clear All
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <FileList 
              files={files} 
              onRemove={removeFile}
              onClear={() => setFiles([])}
            />
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="sanitizeMeta" />
      <RecentFilesPanel tool="sanitize_meta" title="Recent sanitizations" />
    </ToolPageLayout>
  );
}
