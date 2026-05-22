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
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: name.endsWith('.zip') ? 'application/zip' : 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return rgb(0.2, 0.2, 0.2);
  return rgb(parseInt(clean.slice(0,2),16)/255, parseInt(clean.slice(2,4),16)/255, parseInt(clean.slice(4,6),16)/255);
}

async function applyBatesNumbering(files, settings, onProgress) {
  const { prefix, suffix, startIndex, padding, fontSize, color, margin } = settings;
  
  let currentIndex = startIndex;
  const processedFiles = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buf = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      const { width: pw } = page.getSize();
      
      const numStr = String(currentIndex).padStart(padding, '0');
      const batesStr = `${prefix}${numStr}${suffix}`;
      
      const w = font.widthOfTextAtSize(batesStr, fontSize);
      page.drawText(batesStr, {
        x: pw - w - margin, // Bottom right corner usually
        y: margin,
        size: fontSize,
        font,
        color: hexToRgb(color),
      });

      currentIndex++;
    });

    const outBytes = await pdfDoc.save();
    processedFiles.push({ name: file.name.replace(/\.pdf$/i, '_bates.pdf'), bytes: outBytes });
    onProgress?.(Math.round(((i + 1) / files.length) * 90));
  }

  onProgress?.(95);

  if (processedFiles.length === 1) {
    return { bytes: processedFiles[0].bytes, name: processedFiles[0].name };
  } else {
    const zip = new JSZip();
    processedFiles.forEach(pf => zip.file(pf.name, pf.bytes));
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    return { bytes: zipBytes, name: 'bates_numbered_files.zip' };
  }
}

export default function BatesNumberingPdf() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  
  const [prefix, setPrefix] = useState('CASE-');
  const [suffix, setSuffix] = useState('');
  const [startIndex, setStartIndex] = useState(1);
  const [padding, setPadding] = useState(6);
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState('#000000');
  const [margin, setMargin] = useState(24);

  const loadFiles = (raw) => {
    const valid = Array.from(raw).filter(f => f.type === 'application/pdf');
    if (valid.length === 0) { setError('Select valid PDF files.'); return; }
    setFiles(valid); setError(''); setSuccess(''); setProgress(0);
  };

  const handleApply = async () => {
    if (files.length === 0) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const { bytes, name } = await applyBatesNumbering(files, { prefix, suffix, startIndex, padding, fontSize, color, margin }, setProgress);
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created!`);
      addRecentFile({ tool: 'bates_numbering', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'bates_numbering', { tool: 'bates_numbering', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Processing failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'bates_numbering', { tool: 'bates_numbering', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Bates Format</p>
      
      <div className="ux-field">
        <label className="ux-label">Prefix</label>
        <input className="ux-input" type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. CASE-" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div className="ux-field">
          <label className="ux-label">Start Index</label>
          <input className="ux-input" type="number" min={1} value={startIndex} onChange={(e) => setStartIndex(Math.max(1, parseInt(e.target.value)||1))} />
        </div>
        <div className="ux-field">
          <label className="ux-label">Zero Padding</label>
          <input className="ux-input" type="number" min={1} max={10} value={padding} onChange={(e) => setPadding(Math.max(1, parseInt(e.target.value)||6))} />
        </div>
      </div>

      <div className="ux-field">
        <label className="ux-label">Suffix</label>
        <input className="ux-input" type="text" value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="e.g. -CONF" />
      </div>

      <p className="ux-section-label" style={{ marginTop:20 }}>Styling</p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div className="ux-field">
          <label className="ux-label">Size (pt)</label>
          <input className="ux-input" type="number" min={8} max={72} value={fontSize} onChange={(e) => setFontSize(Math.max(8, parseInt(e.target.value)||12))} />
        </div>
        <div className="ux-field">
          <label className="ux-label">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width:'100%', height:36, borderRadius:8 }} />
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Stamping pages…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Stamped!</p>
          </div>
          <div className="ux-result-body">
             <button className="ux-btn-primary" onClick={() => downloadBytes(lastBytes, lastName)}>↓ Download</button>
             <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="BatesNumbered" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || files.length === 0}>
      {working ? 'Processing…' : 'Apply Bates Numbers'}
    </button>
  );

  return (
    <ToolPageLayout
      title="Bates Numbering"
      subtitle="Assign sequential bates numbers to pages across multiple documents. 100% offline."
      icon="🔢"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="batesNumbering" />

      {files.length === 0 ? (
        <DropZone onFiles={loadFiles} label="Drop PDFs to number" hint="Multiple PDFs supported · Will process sequentially" multiple={true} />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{files.length} file(s) loaded.</p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFiles([]); setSuccess(''); }}>Remove Files</button>
          </div>

          <div style={{ flex:1, padding:20, background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'auto' }}>
            <div style={{ textAlign:'center', marginTop: 40 }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Example Output:</p>
              <p style={{ fontSize: '2rem', fontFamily: 'monospace', background: '#f1f5f9', padding: 20, borderRadius: 8, display: 'inline-block' }}>
                {prefix}{String(startIndex).padStart(padding, '0')}{suffix}
              </p>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="batesNumbering" />
    </ToolPageLayout>
  );
}
