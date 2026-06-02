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
import '../styles/FlattenForms.css';

export default function FlattenForms() {
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

  const handleFlatten = async () => {
    if (!files.length) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    // Initialize file states
    setFiles(prev => prev.map(f => ({ ...f, status: 'queued', progress: 0 })));
    
    const updateFileState = (id, updates) => {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    try {
      if (files.length === 1) {
        const { id, file: fileObj } = files[0];
        updateFileState(id, { status: 'processing', progress: 20 });
        setProgress(20);
        
        const buf = await fileObj.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        
        updateFileState(id, { progress: 50 });
        setProgress(50);
        
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        if (fields.length) form.flatten();
        
        const bytes = await pdfDoc.save();
        
        updateFileState(id, { status: 'success', progress: 100 });
        setProgress(90);

        const name = fileObj.name.replace(/\.pdf$/i, '_flattened.pdf');
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
        setSuccess(fields.length ? 'Form fields flattened.' : 'No form fields found. Exported as-is.');
        addRecentFile({ tool: 'flatten_forms', name, size: bytes.byteLength || 0 });
        bumpLocalJob();
        await logUserAction(user, 'flatten_forms', { tool: 'flatten_forms', status: 'success', meta: { fields: fields.length, batch: false } });
      } else {
        const zip = new JSZip();
        const folder = zip.folder('Flattened_PDFs');
        let totalFieldsFlattened = 0;
        let completed = 0;
        
        const tasks = files.map(async (fileData, i) => {
          const { id, file: fileObj } = fileData;
          updateFileState(id, { status: 'processing', progress: 10 });
          try {
            await new Promise(r => setTimeout(r, 50 * i)); // Stagger execution
            const buf = await fileObj.arrayBuffer();
            const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
            
            updateFileState(id, { progress: 50 });
            
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            if (fields.length) {
              form.flatten();
              totalFieldsFlattened += fields.length;
            }
            
            const bytes = await pdfDoc.save();
            
            updateFileState(id, { status: 'success', progress: 100 });
            completed++;
            setProgress(Math.round((completed / files.length) * 90));
            return { out: bytes, fileObj };
          } catch (err) {
            updateFileState(id, { status: 'error', progress: 0 });
            throw err;
          }
        });
        
        const results = await Promise.allSettled(tasks);
        let successCount = 0;
        
        for (const res of results) {
          if (res.status === 'fulfilled') {
            const { out, fileObj } = res.value;
            folder.file(fileObj.name.replace(/\.pdf$/i, '_flattened.pdf'), out);
            successCount++;
          }
        }
        
        if (successCount === 0) throw new Error("All files failed to process.");

        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        setProgress(100);
        
        const zipName = `flattened_batch_${Date.now()}.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a'); a.href = url; a.download = zipName;
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        lastBytesRef.current = zipBlob; lastNameRef.current = zipName; isZipRef.current = true;
        setSuccess(`Successfully flattened ${successCount} files (${totalFieldsFlattened} total fields).`);
        
        addRecentFile({ tool: 'flatten_batch', name: zipName, size: zipBlob.size });
        bumpLocalJob();
        await logUserAction(user, 'flatten_forms', { tool: 'flatten_forms', status: 'success', meta: { batch: true, count: successCount, totalFields: totalFieldsFlattened } });
      }
    } catch (err) {
      setError('Flatten failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'flatten_forms', { tool: 'flatten_forms', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Flatten Settings</p>
      <div className="flatten-card">
        <div className="flatten-title">What this does</div>
        <p>Converts interactive form fields into static content so values cannot be edited.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Flattening form fields..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Flattened</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const blob = isZipRef.current ? lastBytesRef.current : new Blob([lastBytesRef.current], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = lastNameRef.current;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download</button>
              <SaveToDriveButton bytes={lastBytesRef.current} filename={lastNameRef.current} toolFolder="Flattened" mimeType={isZipRef.current ? "application/zip" : "application/pdf"} />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Flatten PDF Forms"
      subtitle="Lock form fields so they cannot be edited."
      icon="F"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Flattening...' : 'Flatten PDF'}
      onAction={handleFlatten}
      actionDisabled={working || !files.length}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="flattenForms" />

      <input ref={fileInputRef} type="file" multiple accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFiles(e.target.files)} />

      {!files.length ? (
        <DropZone onFiles={loadFiles} label="Drop PDF(s) with form fields" hint="Multiple PDFs supported · 200 MB Recommended" multiple />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{files.length} file{files.length > 1 ? 's' : ''} ready to flatten.</p>
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

      <ToolSeoContent toolKey="flattenForms" />
      <RecentFilesPanel tool="flatten_forms" title="Recent form flattening" />
    </ToolPageLayout>
  );
}
