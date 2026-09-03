import { useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import ToolChaining from '../components/ToolChaining';
import { addPageNumbers, getPdfPageCount } from '../pageNumbers';
import PdfCanvas from '../components/PdfCanvas';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/PageNumbers.css';

const POSITIONS = [
  { value:'bottom-center', label:'Bottom Center' },
  { value:'bottom-right',  label:'Bottom Right'  },
  { value:'bottom-left',   label:'Bottom Left'   },
  { value:'top-center',    label:'Top Center'    },
  { value:'top-right',     label:'Top Right'     },
  { value:'top-left',      label:'Top Left'      },
];

const downloadFile = (bytes, name) => {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function PageNumbers() {
  const { user } = useAuth();
  const [file, setFile]     = useState(null);
  const [pages, setPages]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [working, setWorking]   = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [previewDims, setPreviewDims] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [opts, setOpts] = useState({ startFrom:1, startPage:1, position:'bottom-center', prefix:'', showTotal:false, fontSize:11 });
  const [filename, setFilename] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setFilename(f.name.replace(/\.pdf$/i, ''));
    setPages(null); setPreviewDims(null); setPreviewError('');
    const n = await getPdfPageCount(f);
    setPages(n);
  };

  const buildLabel = () => opts.showTotal && pages
    ? `${opts.prefix||''}${opts.startFrom||1} of ${pages}`
    : `${opts.prefix||''}${opts.startFrom||1}`;

  const handleProcess = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(0);
    try {
      const bytes = await addPageNumbers(file, opts, setProgress);
      const name  = `${(filename.trim()||'numbered')}_${new Date().toISOString().slice(0,10)}.pdf`;
      downloadFile(bytes, name);
      setLastResult({ bytes, name });
      setSuccess(`"${name}" — page numbers added`);
      addRecentFile({ tool:'page_numbers', name, size:bytes.byteLength||0, pages });
      bumpLocalJob();
      await logUserAction(user, 'page_numbers', { tool:'page_numbers', status:'success', meta:{ outputName:name, ...opts } });
    } catch (err) {
      setError('Failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'page_numbers', { tool:'page_numbers', status:'error', meta:{ error:err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const sidebarContent = (
    <>
      <p className="ux-section-label">Options</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="pnPos">Position</label>
        <select id="pnPos" className="ux-input" value={opts.position} onChange={e => set('position', e.target.value)}>
          {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div className="ux-field">
          <label className="ux-label" htmlFor="pnFrom">Start From</label>
          <input id="pnFrom" className="ux-input" type="number" min={1} value={opts.startFrom} onChange={e => set('startFrom', parseInt(e.target.value)||1)} />
        </div>
        <div className="ux-field">
          <label className="ux-label" htmlFor="pnPage">On Page</label>
          <input id="pnPage" className="ux-input" type="number" min={1} value={opts.startPage} onChange={e => set('startPage', parseInt(e.target.value)||1)} />
        </div>
        <div className="ux-field">
          <label className="ux-label" htmlFor="pnPre">Prefix</label>
          <input id="pnPre" className="ux-input" type="text" value={opts.prefix} onChange={e => set('prefix', e.target.value)} placeholder="e.g. Page " />
        </div>
        <div className="ux-field">
          <label className="ux-label" htmlFor="pnFs">Font Size</label>
          <input id="pnFs" className="ux-input" type="number" min={6} max={24} value={opts.fontSize} onChange={e => set('fontSize', parseInt(e.target.value)||11)} />
        </div>
      </div>

      <div className="ux-toggle-row">
        <div className="ux-toggle-info">
          <p>Show Total Pages</p>
          <span>e.g. &ldquo;1 of 10&rdquo;</span>
        </div>
        <label className="ux-toggle">
          <input type="checkbox" checked={opts.showTotal} onChange={e => set('showTotal', e.target.checked)} />
          <span className="ux-toggle-slider" />
        </label>
      </div>

      <div className="ux-field" style={{ marginTop:16 }}>
        <label className="ux-label" htmlFor="pnFilename">Output Filename</label>
        <div className="ux-input-with-ext">
          <input id="pnFilename" className="ux-input-bare" type="text" value={filename} onChange={e => setFilename(e.target.value)} placeholder="numbered" spellCheck={false} />
          <span className="ux-input-ext">.pdf</span>
        </div>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Adding numbers…" />}

      {success && lastResult && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Numbered!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
               <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => downloadFile(lastResult.bytes, lastResult.name)}>
                ↓ Download
              </button>
              <SaveToDriveButton bytes={lastResult.bytes} filename={lastResult.name} toolFolder="Page Numbers" />
            </div>
            <ToolChaining lastBytes={lastResult.bytes} lastName={lastResult.name} currentTool="page_numbers" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleProcess} disabled={working || !file}>
      {working ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Adding…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Add Page Numbers
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="Add Page Numbers"
      subtitle="Stamp customizable page numbers onto your PDF. 100% local."
      icon="🔢"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="pageNumbers" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to add page numbers" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Live preview of the first page with numbers.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); }}>
              Remove File
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, minHeight:280, padding:'20px', background:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)' }}>
            <div className="pn-preview-frame" style={{ position:'relative', maxWidth:'100%', boxShadow:'0 10px 30px rgba(0,0,0,0.1)', borderRadius:'8px', overflow:'hidden' }}>
              <PdfCanvas file={file} pageNumber={1} width={420}
                onRender={({ width, height, scale }) => { setPreviewDims({ width, height, scale }); setPreviewError(''); }}
                onError={(err) => setPreviewError(err?.message || 'Preview failed to load.')}
              />
              {previewDims && (
                <div className={`pn-preview-text pn-${opts.position}`} style={{ fontSize: Math.round((opts.fontSize||11) * (previewDims.scale||1)) }}>
                  {buildLabel()}
                </div>
              )}
              {previewError && <div className="pn-preview-error">{previewError}</div>}
            </div>
            <p style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)', marginTop:16, marginBottom:4 }}>{file.name}</p>
            <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', margin:0 }}>{formatBytes(file.size)} · Previewing Page 1</p>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="pageNumbers" />
      <RecentFilesPanel tool="page_numbers" title="Recent numbering" />
    </ToolPageLayout>
  );
}
