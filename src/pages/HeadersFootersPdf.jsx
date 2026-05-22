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
import PdfCanvas from '../components/PdfCanvas';

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return rgb(0.2, 0.2, 0.2);
  return rgb(parseInt(clean.slice(0,2),16)/255, parseInt(clean.slice(2,4),16)/255, parseInt(clean.slice(4,6),16)/255);
}

async function applyHeadersFooters(file, settings, onProgress) {
  const { headerText, footerText, fontSize, color, margin } = settings;
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  const dateStr = new Date().toLocaleDateString();

  pages.forEach((page, idx) => {
    const { width: pw, height: ph } = page.getSize();
    const pageNum = idx + 1;
    
    const resolveText = (t) => t.replace(/\[page\]/g, pageNum)
                              .replace(/\[total\]/g, total)
                              .replace(/\[date\]/g, dateStr);

    const ht = resolveText(headerText);
    const ft = resolveText(footerText);

    if (ht) {
      const w = font.widthOfTextAtSize(ht, fontSize);
      page.drawText(ht, {
        x: (pw - w) / 2,
        y: ph - margin - fontSize,
        size: fontSize,
        font,
        color: hexToRgb(color),
      });
    }

    if (ft) {
      const w = font.widthOfTextAtSize(ft, fontSize);
      page.drawText(ft, {
        x: (pw - w) / 2,
        y: margin,
        size: fontSize,
        font,
        color: hexToRgb(color),
      });
    }

    onProgress?.(Math.round(((idx + 1) / total) * 90));
  });

  onProgress?.(98);
  return pdfDoc.save();
}

export default function HeadersFootersPdf() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  
  const [headerText, setHeaderText] = useState('Document Title - [date]');
  const [footerText, setFooterText] = useState('Page [page] of [total]');
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState('#666666');
  const [margin, setMargin] = useState(24);

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0);
  };

  const handleApply = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const bytes = await applyHeadersFooters(file, { headerText, footerText, fontSize, color, margin }, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_hf.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created!`);
      addRecentFile({ tool: 'headers_footers', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'headers_footers', { tool: 'headers_footers', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Processing failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'headers_footers', { tool: 'headers_footers', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Content</p>
      
      <div className="ux-field">
        <label className="ux-label">Header Text</label>
        <input className="ux-input" type="text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="e.g. Draft - [date]" />
      </div>

      <div className="ux-field">
        <label className="ux-label">Footer Text</label>
        <input className="ux-input" type="text" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="e.g. Page [page] of [total]" />
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Variables available: <code>[page]</code>, <code>[total]</code>, <code>[date]</code>
      </p>

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

      <div className="ux-field">
        <label className="ux-label">Margin (pt)</label>
        <input className="ux-input" type="number" min={0} max={100} value={margin} onChange={(e) => setMargin(Math.max(0, parseInt(e.target.value)||24))} />
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Applying headers/footers…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Applied!</p>
          </div>
          <div className="ux-result-body">
             <button className="ux-btn-primary" onClick={() => downloadBytes(lastBytes, lastName)}>↓ Download</button>
             <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="HeadersFooters" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !file}>
      {working ? 'Processing…' : 'Apply Text'}
    </button>
  );

  return (
    <ToolPageLayout
      title="Custom Headers & Footers"
      subtitle="Add dynamic text, dates, and page numbers to document margins. 100% offline."
      icon="📏"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="headersFooters" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF" hint="Single PDF · 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Preview of the first page with approximate text placement.</p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile(null); setSuccess(''); }}>Remove File</button>
          </div>

          <div style={{ flex:1, display:'flex', justifyContent:'center', padding:20, background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'auto' }}>
            <div style={{ position:'relative', boxShadow:'0 10px 30px rgba(0,0,0,0.1)' }}>
              <PdfCanvas file={file} pageNumber={1} width={400} />
              
              {/* Visual approximations over the canvas */}
              {headerText && (
                <div style={{ position:'absolute', top: margin, width:'100%', textAlign:'center', fontSize: fontSize*0.7, color, fontFamily:'Helvetica, sans-serif' }}>
                  {headerText.replace(/\[page\]/g, '1').replace(/\[total\]/g, 'X').replace(/\[date\]/g, new Date().toLocaleDateString())}
                </div>
              )}
              {footerText && (
                <div style={{ position:'absolute', bottom: margin, width:'100%', textAlign:'center', fontSize: fontSize*0.7, color, fontFamily:'Helvetica, sans-serif' }}>
                  {footerText.replace(/\[page\]/g, '1').replace(/\[total\]/g, 'X').replace(/\[date\]/g, new Date().toLocaleDateString())}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="headersFooters" />
    </ToolPageLayout>
  );
}
