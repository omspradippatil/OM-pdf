import React, { useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { runPdfWorkerTask } from '../workers/workerClient';
import { generateThumbnail } from '../thumbnailGenerator';

const LEVELS = [
  { id: 'screen',  label: 'Maximum',  desc: 'Smallest size (72 dpi images)', badge: '85%+ reduction' },
  { id: 'ebook',   label: 'Balanced', desc: 'Good quality (150 dpi images)', badge: 'Recommended' },
  { id: 'printer', label: 'Minimal',  desc: 'High quality (300 dpi images)', badge: 'Best quality' },
];

export default function CompressPDF() {
  const { user } = useAuth();
  const [file, setFile]           = useState(null);
  const [level, setLevel]         = useState('ebook');
  const [progress, setProgress]   = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState(null);
  const [thumbnail, setThumbnail] = useState(null);

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setResult(null); setThumbnail(null);
    generateThumbnail(f).then(url => {
      if (url) setThumbnail(url);
    });
  };
  const fileInputRef = React.useRef(null);

  const handleCompress = async () => {
    if (!file) return;
    setError(''); setResult(null); setCompressing(true); setProgress(0);
    try {
      const buffer = await file.arrayBuffer();
      const { bytes: out } = await runPdfWorkerTask('compress_lossless', { buffer, level }, [buffer], setProgress);
      setProgress(100);
      const name = file.name.replace(/\.pdf$/i, '_compressed.pdf');
      const blob = new Blob([out], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      const saved = Math.max(0, file.size - out.byteLength);
      const pct   = file.size ? Math.round((saved / file.size) * 100) : 0;
      setResult({ bytes: out, name, originalSize: file.size, compressedSize: out.byteLength, saved, pct });
      addRecentFile({ tool: 'compress', name, size: out.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'compress', { tool: 'compress', status: 'success', meta: { outputName: name, level, pct } });
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
              <SaveToDriveButton bytes={result.bytes} filename={result.name} toolFolder="Compressed" />
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
      actionDisabled={compressing || !file}
    >
      <ToolSeoHead toolKey="compress" />
      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to compress" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Configure compression settings in the right panel.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setResult(null); setError(''); }}>
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
            <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', margin:0 }}>{formatBytes(file.size)} · Ready to compress</p>
          </div>
        </div>
      )}
      <ToolSeoContent toolKey="compress" />
      <RecentFilesPanel tool="compress" title="Recent compressions" />
    </ToolPageLayout>
  );
}
