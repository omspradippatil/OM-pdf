import React, { useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';
import { splitBySize } from '../splitPdf';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';

const PRESET_SIZES = [
  { id: 2, label: '2 MB', desc: 'Good for strict email servers' },
  { id: 5, label: '5 MB', desc: 'Standard email attachment' },
  { id: 10, label: '10 MB', desc: 'Large email attachment' },
  { id: 25, label: '25 MB', desc: 'Maximum Gmail attachment' },
];

export default function SplitBySizePdf() {
  const { user } = useAuth();
  const [file, setFile]       = useState(null);
  const [pages, setPages]     = useState(null);
  const [maxSizeMB, setMaxSizeMB] = useState(5);
  const [progress, setProgress] = useState(0);
  const [splitting, setSplitting] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const { triggerExport } = useExport();

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setLastResult(null);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPages(doc.getPageCount());
    } catch { setPages(null); }
  };

  const handleSplit = async () => {
    if (!file) return;
    if (file.size <= maxSizeMB * 1024 * 1024) {
      setError(`File is already smaller than ${maxSizeMB} MB.`);
      return;
    }
    
    setError(''); setSuccess(''); setSplitting(true); setProgress(0); setLastResult(null);
    const baseName = file.name.replace(/\.pdf$/i, '');
    try {
      setProgress(10);
      const blob = await splitBySize(file, baseName, maxSizeMB, setProgress);
      const zipName = `${baseName}_split_by_${maxSizeMB}MB.zip`;
      
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = zipName;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      
      addRecentFile({ tool: 'split_by_size', name: zipName, size: blob.size || 0 });
      setSuccess(`Split into chunks ~${maxSizeMB}MB → "${zipName}"`);
      setLastResult({ bytes: blob, name: zipName, mime: 'application/zip' });
      
      bumpLocalJob();
      await logUserAction(user, 'split_by_size', { tool: 'split_by_size', status: 'success', meta: { maxSizeMB } });
    } catch (err) {
      setError('Split failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'split_by_size', { tool: 'split_by_size', status: 'error', meta: { error: err?.message } });
    } finally { setSplitting(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Split Settings</p>
      
      <div className="ux-label" style={{ marginBottom:8 }}>Target Max File Size</div>
      {PRESET_SIZES.map(s => (
        <div key={s.id} className={`ux-option-card${maxSizeMB===s.id?' selected':''}`} onClick={() => setMaxSizeMB(s.id)}>
          <div><div className="ux-option-title">{s.label}</div><div className="ux-option-desc">{s.desc}</div></div>
        </div>
      ))}

      <div className="ux-field" style={{ marginTop: 16 }}>
        <label className="ux-label" htmlFor="customSize">Custom Size (MB)</label>
        <input id="customSize" className="ux-input" type="number" min={1} max={999} value={maxSizeMB}
          onChange={e => setMaxSizeMB(Math.max(1, parseFloat(e.target.value)||5))} />
      </div>

      {file && pages && (
        <div className="ux-summary" style={{ marginTop: 24 }}>
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
          <div className="ux-summary-row"><span>Target Size</span><strong>~{maxSizeMB} MB</strong></div>
        </div>
      )}

      {error    && <div className="alert alert-error" style={{ marginTop:10 }}><span>❌ {error}</span></div>}
      {splitting && <ProgressBar pct={progress} label="Splitting PDF…" />}
      {success  && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Split Complete!</p>
            <p className="ux-result-success-sub">{success}</p>
          </div>
          {lastResult && (
            <div className="ux-result-body">
              <div className="ux-result-actions">
                <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                  const url = URL.createObjectURL(lastResult.bytes);
                  const a = document.createElement('a'); a.href = url; a.download = lastResult.name;
                  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}>
                  ↓ Download Again
                </button>
                <SaveToDriveButton bytes={lastResult.bytes} filename={lastResult.name} mimeType={lastResult.mime} toolFolder="Split By Size" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Split PDF by Size"
      subtitle="Split a large PDF into smaller parts by maximum file size."
      icon="⚖️"
      sidebarContent={sidebarContent}
      actionLabel={splitting ? 'Splitting…' : 'Split by Size'}
      onAction={handleSplit}
      actionDisabled={splitting || !file}
    >
      <ToolSeoHead toolKey="split_by_size" />
      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to split" hint="Single PDF · Best for large files" />
      ) : (
        <div className="ux-workspace-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 20 }}>⚖️</div>
          <h2 style={{ marginBottom: 10 }}>File Loaded Successfully</h2>
          <p style={{ color: 'var(--text-muted)' }}>{file.name} ({formatBytes(file.size)})</p>
          <p style={{ marginTop: 20, maxWidth: 400, color: 'var(--text)' }}>
            Choose a target maximum file size in the right panel and click <strong>Split by Size</strong>.
          </p>
          <button className="ux-btn-secondary" style={{ marginTop: 30, borderRadius: '10px', padding: '8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
            Remove File
          </button>
        </div>
      )}
      <ToolSeoContent toolKey="split_by_size" />
      <RecentFilesPanel tool="split_by_size" title="Recent splits" />
    </ToolPageLayout>
  );
}
