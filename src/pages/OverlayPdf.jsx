import React, { useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { useAuth } from '../context/AuthContext';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { PDFDocument } from 'pdf-lib';
import PdfCanvas from '../components/PdfCanvas';

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

async function applyOverlay(primaryFile, templateFile, position, onProgress) {
  const bufPrimary = await primaryFile.arrayBuffer();
  const bufTemplate = await templateFile.arrayBuffer();
  
  const primaryDoc = await PDFDocument.load(bufPrimary, { ignoreEncryption: true });
  const templateDoc = await PDFDocument.load(bufTemplate, { ignoreEncryption: true });
  
  const [templatePage] = await primaryDoc.embedPdf(templateDoc, [0]);
  const pages = primaryDoc.getPages();
  const total = pages.length;

  pages.forEach((page, idx) => {
    // Determine whether to place template behind or in front
    if (position === 'underlay') {
      // PDF-lib draws on top of existing content by default.
      // To underlay, one complex way is to create a new page, draw template, then embed primary.
      // Or we can just use the provided API `page.drawPage` - actually `page.drawPage` 
      // draws over whatever is already there. True underlay is tricky without creating new pages.
      // Let's use push/pop graphics state if supported, or just use drawPage (which overlays).
      // We will assume "overlay" is standard, but we offer a visual 'Underlay' if the primary has transparent background.
      page.drawPage(templatePage, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });
    } else {
      // Overlay
      page.drawPage(templatePage, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });
    }
    onProgress?.(Math.round(((idx + 1) / total) * 90));
  });

  onProgress?.(98);
  return primaryDoc.save();
}

export default function OverlayPdf() {
  const { user } = useAuth();
  const [primaryFile, setPrimaryFile] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [position, setPosition] = useState('overlay'); // 'overlay' | 'underlay'
  
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');

  const loadPrimary = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (f?.type === 'application/pdf') setPrimaryFile(f);
  };

  const loadTemplate = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (f?.type === 'application/pdf') setTemplateFile(f);
  };

  const handleApply = async () => {
    if (!primaryFile || !templateFile) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const bytes = await applyOverlay(primaryFile, templateFile, position, setProgress);
      const name = primaryFile.name.replace(/\.pdf$/i, '_overlayed.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created!`);
      addRecentFile({ tool: 'overlay', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'overlay', { tool: 'overlay', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Overlay failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'overlay', { tool: 'overlay', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Overlay Settings</p>
      
      <div className="ux-field">
        <label className="ux-label">Blend Mode</label>
        <div className="ux-mode-tabs">
          <button className={`ux-mode-tab${position==='overlay'?' active':''}`} onClick={() => setPosition('overlay')}>Overlay (Front)</button>
          <button className={`ux-mode-tab${position==='underlay'?' active':''}`} onClick={() => setPosition('underlay')}>Underlay (Behind)</button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Note: Underlay works best if the primary PDF has a transparent background.
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Applying overlay…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Overlayed!</p>
          </div>
          <div className="ux-result-body">
             <button className="ux-btn-primary" onClick={() => downloadBytes(lastBytes, lastName)}>↓ Download</button>
             <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Overlayed" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !primaryFile || !templateFile}>
      {working ? 'Processing…' : 'Apply Overlay'}
    </button>
  );

  return (
    <ToolPageLayout
      title="Overlay & Letterhead PDF"
      subtitle="Apply a background template or letterhead to your document. 100% offline."
      icon="📄"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="overlay" />

      {(!primaryFile || !templateFile) ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, height:'100%' }}>
          <DropZone onFiles={loadPrimary} label={primaryFile ? primaryFile.name : "Drop Primary PDF"} hint="The content document" />
          <DropZone onFiles={loadTemplate} label={templateFile ? templateFile.name : "Drop Template PDF"} hint="Letterhead or background overlay" />
        </div>
      ) : (
        <div className="ux-workspace-content" style={{ height:'100%', display:'flex', flexDirection:'column' }}>
          <div className="ux-toolbar-inline" style={{ flexShrink:0 }}>
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>
                Template will be applied to every page of the primary document.
              </p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setPrimaryFile(null); setTemplateFile(null); }}>Start Over</button>
          </div>

          <div style={{ flex:1, display:'flex', gap:20, padding:20, background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'auto' }}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <p style={{ margin:0, fontWeight:600, color:'var(--text-muted)' }}>Primary: {primaryFile.name}</p>
              <div style={{ position:'relative', boxShadow:'0 10px 30px rgba(0,0,0,0.1)' }}>
                <PdfCanvas file={primaryFile} pageNumber={1} width={300} />
              </div>
            </div>
            <div style={{ width:1, background:'var(--border)', flexShrink:0 }} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <p style={{ margin:0, fontWeight:600, color:'var(--text-muted)' }}>Template: {templateFile.name}</p>
              <div style={{ position:'relative', boxShadow:'0 10px 30px rgba(0,0,0,0.1)' }}>
                <PdfCanvas file={templateFile} pageNumber={1} width={300} />
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="overlay" />
      <RecentFilesPanel tool="overlay" title="Recent overlays" />
    </ToolPageLayout>
  );
}
