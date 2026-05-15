import React, { useState, useRef } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { generateThumbnail } from '../thumbnailGenerator';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import '../styles/PdfToText.css';

async function extractText(file, onProgress) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const total = pdf.numPages;
  let fullText = '';
  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n\n';
    onProgress?.(Math.round((i / total) * 95));
  }
  return fullText;
}

export default function PdfToText() {
  const { user } = useAuth();
  const [file, setFile]         = useState(null);
  const [text, setText]         = useState('');
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const lastNameRef = useRef('');

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0); setThumbnail(null); setText('');
    generateThumbnail(f).then(url => setThumbnail(url));
  };

  const handleExtract = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setExtracting(true); setProgress(0);
    try {
      const result = await extractText(file, setProgress);
      setText(result);
      setProgress(100);
      const name = file.name.replace(/\.pdf$/i, '.txt');
      lastNameRef.current = name;
      setSuccess(`Extracted text from ${file.name}`);
      addRecentFile({ tool: 'pdf_to_text', name, size: result.length });
      bumpLocalJob();
      await logUserAction(user, 'pdf_to_text', { tool: 'pdf_to_text', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Extraction failed: ' + (err.message || 'Unexpected error.'));
    } finally { setExtracting(false); setProgress(0); }
  };

  const handleDownload = () => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = lastNameRef.current || 'extracted.txt';
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Extraction Settings</p>

      <div className="ux-option-card selected">
        <div className="ux-option-title">📄 Standard Text Extraction</div>
        <div className="ux-option-desc">Extracts selectable text layers from the PDF. Scanned images are not supported.</div>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {extracting && <ProgressBar pct={progress} label="Extracting text…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Text Extracted!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={handleDownload}>
                ↓ Download .txt
              </button>
              <SaveToDriveButton bytes={new TextEncoder().encode(text)} filename={lastNameRef.current} toolFolder="Extracted" mimeType="text/plain" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleExtract} disabled={extracting || !file}>
      {extracting ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Extracting…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Extract Text
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="PDF to Text"
      subtitle="Extract editable text from your PDF files instantly. 100% local."
      icon="📄"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="pdfToText" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to extract text" hint="Single PDF · Max 200 MB" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{text ? 'Text extraction complete.' : 'Ready to extract text.'}</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); setText(''); setThumbnail(null); }}>
              Remove File
            </button>
          </div>

          {!text ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, minHeight:280, gap:14, background:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)' }}>
              <div className="ux-page-card" style={{ width: '220px', cursor: 'default' }}>
                <div className="ux-page-thumb-wrap" style={{ height: '300px' }}>
                  {thumbnail ? <img className="ux-page-thumb-img" src={thumbnail} alt="PDF Preview" /> : <div className="ux-page-thumb-placeholder" />}
                </div>
              </div>
              <p style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)', margin:0 }}>{file.name}</p>
              <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', margin:0 }}>{formatBytes(file.size)} · Ready to extract</p>
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,0.02)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--text-muted)' }}>EXTRACTED CONTENT</span>
                <button className="ux-btn-secondary" style={{ fontSize:'0.75rem', padding:'4px 10px' }} onClick={() => { navigator.clipboard.writeText(text); alert('Copied to clipboard!'); }}>Copy All</button>
              </div>
              <textarea
                readOnly
                value={text}
                style={{ flex:1, width:'100%', border:'none', background:'none', padding:'20px', fontSize:'0.95rem', lineHeight:'1.6', color:'var(--text-primary)', resize:'none', outline:'none', fontFamily:'var(--font-mono)' }}
              />
            </div>
          )}
        </div>
      )}

      <ToolSeoContent toolKey="pdfToText" />
      <RecentFilesPanel tool="pdf_to_text" title="Recent extractions" />
    </ToolPageLayout>
  );
}
