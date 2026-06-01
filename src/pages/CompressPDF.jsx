import React, { useState } from 'react';
import JSZip from 'jszip';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import FileList from '../components/FileList';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { runPdfWorkerTask } from '../workers/workerClient';

const LEVELS = [
  { id: 'screen',  label: 'Maximum',  desc: 'Smallest size (72 dpi images)', badge: '85%+ reduction' },
  { id: 'ebook',   label: 'Balanced', desc: 'Good quality (150 dpi images)', badge: 'Recommended' },
  { id: 'printer', label: 'Minimal',  desc: 'High quality (300 dpi images)', badge: 'Best quality' },
];

export default function CompressPDF() {
  const { user } = useAuth();
  const [files, setFiles]         = useState([]);
  const [level, setLevel]         = useState('ebook');
  const [progress, setProgress]   = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState(null);

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
    setError(''); setResult(null);
  };
  const fileInputRef = React.useRef(null);

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleCompress = async () => {
    if (!files.length) return;
    setError(''); setResult(null); setCompressing(true); setProgress(0);
    try {
      if (files.length === 1) {
        // Single file processing
        const fileObj = files[0].file;
        const buffer = await fileObj.arrayBuffer();
        const { bytes: out } = await runPdfWorkerTask('compress_lossless', { buffer, level }, [buffer], setProgress);
        setProgress(100);
        const name = fileObj.name.replace(/\.pdf$/i, '_compressed.pdf');
        const blob = new Blob([out], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        
        const saved = Math.max(0, fileObj.size - out.byteLength);
        const pct   = fileObj.size ? Math.round((saved / fileObj.size) * 100) : 0;
        setResult({ bytes: out, name, originalSize: fileObj.size, compressedSize: out.byteLength, saved, pct, isZip: false });
        
        addRecentFile({ tool: 'compress', name, size: out.byteLength || 0 });
        bumpLocalJob();
        await logUserAction(user, 'compress', { tool: 'compress', status: 'success', meta: { outputName: name, level, pct, batch: false } });
      } else {
        // Batch processing
        const zip = new JSZip();
        const folder = zip.folder('Compressed_PDFs');
        let totalOriginal = 0;
        let totalCompressed = 0;

        for (let i = 0; i < files.length; i++) {
          const fileObj = files[i].file;
          const buffer = await fileObj.arrayBuffer();
          
          const progressCallback = (p) => {
            const base = (i / files.length) * 100;
            const current = (p / 100) * (100 / files.length);
            setProgress(Math.round(base + current));
          };
          
          const { bytes: out } = await runPdfWorkerTask('compress_lossless', { buffer, level }, [buffer], progressCallback);
          
          totalOriginal += fileObj.size;
          totalCompressed += out.byteLength;
          folder.file(fileObj.name.replace(/\.pdf$/i, '_compressed.pdf'), out);
        }

        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        setProgress(100);
        
        const zipName = `compressed_batch_${Date.now()}.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a'); a.href = url; a.download = zipName;
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        const saved = Math.max(0, totalOriginal - totalCompressed);
        const pct = totalOriginal ? Math.round((saved / totalOriginal) * 100) : 0;
        
        setResult({ bytes: zipBlob, name: zipName, originalSize: totalOriginal, compressedSize: totalCompressed, saved, pct, isZip: true, count: files.length });
        
        addRecentFile({ tool: 'compress_batch', name: zipName, size: zipBlob.size });
        bumpLocalJob();
        await logUserAction(user, 'compress', { tool: 'compress', status: 'success', meta: { outputName: zipName, level, pct, batch: true, count: files.length } });
      }
    } catch (err) {
      setError('Compression failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'compress', { tool: 'compress', status: 'error', meta: { error: err?.message } });
    } finally { setCompressing(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Compression Level</p>
      {LEVELS.map(lv => (
        <div key={lv.id} className={`ux-option-card${level===lv.id?' selected':''}`} onClick={() => setLevel(lv.id)}>
          {lv.badge==='Recommended' && <div className="ux-recommended-badge">BEST</div>}
          <div>
            <div className="ux-option-title">{lv.label}</div>
            <div className="ux-option-desc">{lv.desc}</div>
            {lv.id !== 'ebook' && <div className="ux-option-desc" style={{ color:'var(--primary)', fontWeight:700, marginTop:3 }}>{lv.badge}</div>}
          </div>
        </div>
      ))}

      {error     && <div className="alert alert-error" style={{ marginTop:10 }}><span>❌ {error}</span></div>}
      {compressing && <ProgressBar pct={progress} label="Compressing…" />}

      {/* Result */}
      {result && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Compressed!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-size-comparison">
              <div className="ux-size-before"><p>Before</p><strong>{formatBytes(result.originalSize)}</strong></div>
              <span className="ux-size-arrow">→</span>
              <div className="ux-size-after"><p>After</p><strong>{formatBytes(result.compressedSize)}</strong></div>
            </div>
            <div className="ux-savings-row">
              <span>Space saved</span>
              <span className="ux-savings-badge">−{result.pct}% ({formatBytes(result.saved)})</span>
            </div>
            <div className="ux-result-actions">
              <SaveToDriveButton bytes={result.bytes} filename={result.name} toolFolder="Compressed" mimeType={result.isZip ? "application/zip" : "application/pdf"} />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Compress PDF"
      subtitle="Reduce file size while keeping quality. 100% local."
      icon="📦"
      sidebarContent={sidebarContent}
      actionLabel={compressing ? 'Compressing…' : 'Compress PDF'}
      onAction={handleCompress}
      actionDisabled={compressing || !files.length}
    >
      <ToolSeoHead toolKey="compress" />
      {!files.length ? (
        <DropZone onFiles={loadFiles} label="Drop PDF(s) to compress" hint="Multiple PDFs supported · 200 MB Recommended" multiple />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{files.length} file{files.length > 1 ? 's' : ''} ready to compress.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px', cursor: 'pointer' }}>
                Add More
                <input type="file" multiple accept=".pdf" style={{ display: 'none' }} onChange={(e) => loadFiles(e.target.files)} />
              </label>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFiles([]); setResult(null); setError(''); }}>
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
      <ToolSeoContent toolKey="compress" />
      <RecentFilesPanel tool="compress" title="Recent compressions" />
    </ToolPageLayout>
  );
}
