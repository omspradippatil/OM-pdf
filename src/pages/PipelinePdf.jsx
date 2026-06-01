import React, { useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import FileList from '../components/FileList';
import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';

const AVAILABLE_ACTIONS = [
  { id: 'flatten', label: 'Flatten Forms', icon: '📌', desc: 'Convert interactive fields to static' },
  { id: 'rotate90', label: 'Rotate 90° Clockwise', icon: '↻', desc: 'Rotate all pages right' },
  { id: 'removeMetadata', label: 'Remove Metadata', icon: '🧼', desc: 'Strip title, author, etc.' },
  { id: 'compress', label: 'Optimize (Fast Web View)', icon: '⚡', desc: 'Rebuild with object streams' }
];

export default function PipelinePdf() {
  const { user } = useAuth();
  
  // Files: Array of { id, file, name, size }
  const [files, setFiles] = useState([]);
  
  // Pipeline: Array of action IDs
  const [pipeline, setPipeline] = useState([]);
  
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const loadFiles = (raw) => {
    const valid = Array.from(raw).filter(f => f.type === 'application/pdf');
    if (!valid.length) { setError('Select at least one valid PDF.'); return; }
    
    const newFiles = valid.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name,
      size: f.size
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setError(''); setSuccess(''); setLastResult(null);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const addAction = (id) => {
    setPipeline(prev => [...prev, id]);
  };

  const removeAction = (index) => {
    setPipeline(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleProcess = async () => {
    if (!files.length) return;
    if (!pipeline.length) { setError('Add at least one action to the pipeline.'); return; }
    
    setError(''); setSuccess(''); setProcessing(true); setProgress(0); setLastResult(null);
    
    try {
      const zip = new JSZip();
      const folder = zip.folder('Pipeline_Results');
      
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        
        // Load PDF
        const buf = await fileObj.file.arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        
        // Apply Pipeline
        for (const actionId of pipeline) {
          if (actionId === 'flatten') {
            doc.getForm().flatten();
          } else if (actionId === 'rotate90') {
            const pages = doc.getPages();
            pages.forEach(p => p.setRotation(degrees((p.getRotation().angle + 90) % 360)));
          } else if (actionId === 'removeMetadata') {
            doc.setTitle('');
            doc.setAuthor('');
            doc.setSubject('');
            doc.setKeywords([]);
            doc.setCreator('');
            doc.setProducer('');
          } else if (actionId === 'compress') {
            // Nothing to do directly here, handled during save
          }
        }
        
        // Save PDF
        const useObjectStreams = pipeline.includes('compress');
        const bytes = await doc.save({ useObjectStreams });
        folder.file(`processed_${fileObj.name}`, bytes);
        
        setProgress(Math.round(((i + 1) / files.length) * 90));
      }
      
      setProgress(95);
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      setProgress(100);
      
      const zipName = `batch_pipeline_result.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a'); a.href = url; a.download = zipName;
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      setLastResult({ blob: zipBlob, name: zipName });
      setSuccess(`Processed ${files.length} files successfully!`);
      
      addRecentFile({ tool: 'batch_pipeline', name: zipName, size: zipBlob.size });
      bumpLocalJob();
      await logUserAction(user, 'batch_pipeline', { status: 'success' });
      
    } catch (err) {
      setError('Pipeline failed: ' + (err.message || 'Unexpected error.'));
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Pipeline Actions</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {AVAILABLE_ACTIONS.map(action => (
          <button 
            key={action.id} 
            className="ux-btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', padding: '10px 12px', background: 'var(--bg-card)' }}
            onClick={() => addAction(action.id)}
          >
            <span style={{ fontSize: '1.2rem', marginRight: 10 }}>{action.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{action.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.desc}</div>
            </div>
            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>+</span>
          </button>
        ))}
      </div>

      <p className="ux-section-label">Current Pipeline Sequence</p>
      
      {pipeline.length === 0 ? (
        <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Add actions from above to build your pipeline.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pipeline.map((step, idx) => {
            const action = AVAILABLE_ACTIONS.find(a => a.id === step);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: '1rem', marginRight: 8 }}>{action?.icon}</span>
                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>{idx + 1}. {action?.label}</span>
                <button 
                  onClick={() => removeAction(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '1rem', padding: 4 }}
                >✕</button>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {processing && <ProgressBar pct={progress} label="Running Pipeline…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Success!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                if (!lastResult) return;
                const url = URL.createObjectURL(lastResult.blob);
                const a = document.createElement('a'); a.href = url; a.download = lastResult.name;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>
                ↓ Download ZIP
              </button>
              {lastResult && (
                <SaveToDriveButton bytes={lastResult.blob} filename={lastResult.name} toolFolder="Pipelines" mimeType="application/zip" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleProcess} disabled={processing || files.length === 0 || pipeline.length === 0}>
      {processing ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Processing…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Run Pipeline
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Batch Pipeline"
      subtitle="Apply a sequence of actions to multiple PDFs at once."
      icon="⚡"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="batch_pipeline" />

      {files.length === 0 ? (
        <DropZone onFiles={loadFiles} label="Drop PDFs here" hint="Select multiple files" multiple />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{files.length} files selected.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px', cursor: 'pointer' }}>
                Add More
                <input type="file" multiple accept=".pdf" style={{ display: 'none' }} onChange={(e) => loadFiles(e.target.files)} />
              </label>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFiles([]); setSuccess(''); setError(''); setLastResult(null); }}>
                Clear All
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <FileList 
              files={files} 
              onRemove={removeFile}
              onClear={() => setFiles([])}
              onReorder={() => {}} // simplified for this component
            />
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="batch_pipeline" />
      <RecentFilesPanel tool="batch_pipeline" title="Recent pipelines" />
    </ToolPageLayout>
  );
}
