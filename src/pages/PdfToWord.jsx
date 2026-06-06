import React, { useState, useRef } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { generateThumbnail } from '../thumbnailGenerator';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { Document, Packer, Paragraph, TextRun, PageBreak } from 'docx';
import '../styles/PdfToText.css'; // Reuse PdfToText styles

async function extractTextToWord(file, onProgress) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const total = pdf.numPages;
  
  const children = [];

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Group text items by y-coordinate to form lines roughly
    const items = content.items;
    let currentY = null;
    let currentLineRuns = [];

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      if (!item.str || !item.str.trim() && item.str !== ' ') continue;

      const y = Math.round(item.transform[5]);
      // The scale vector is [0] and [3]. Approximating font size:
      const fontSize = Math.max(10, Math.round(Math.sqrt(item.transform[0]*item.transform[0] + item.transform[1]*item.transform[1])));
      const isBold = item.fontName ? item.fontName.toLowerCase().includes('bold') : false;
      const isItalic = item.fontName ? item.fontName.toLowerCase().includes('italic') : false;
      
      const run = new TextRun({
        text: item.str,
        size: fontSize * 2, // docx uses half-points
        bold: isBold,
        italics: isItalic
      });

      if (currentY === null) {
        currentY = y;
        currentLineRuns.push(run);
      } else if (Math.abs(y - currentY) < 6) { // Same line
        currentLineRuns.push(run);
      } else { // New line
        if (currentLineRuns.length > 0) {
          children.push(new Paragraph({ children: currentLineRuns, spacing: { after: 120 } }));
        }
        currentY = y;
        currentLineRuns = [run];
      }
    }
    if (currentLineRuns.length > 0) {
      children.push(new Paragraph({ children: currentLineRuns, spacing: { after: 120 } }));
    }

    if (i < total) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    onProgress?.(Math.round((i / total) * 90));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  onProgress?.(95);
  const blob = await Packer.toBlob(doc);
  onProgress?.(100);
  
  return blob;
}

export default function PdfToWord() {
  const { user } = useAuth();
  const [file, setFile]         = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const lastNameRef = useRef('');

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0); setThumbnail(null); setLastResult(null);
    generateThumbnail(f).then(url => setThumbnail(url));
  };

  const handleConvert = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setConverting(true); setProgress(0);
    try {
      const blob = await extractTextToWord(file, setProgress);
      const name = file.name.replace(/\.pdf$/i, '.docx');
      lastNameRef.current = name;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name;
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      setLastResult({ blob, name });
      setSuccess(`Converted to Word document → ${name}`);
      addRecentFile({ tool: 'pdf_to_word', name, size: blob.size });
      bumpLocalJob();
      await logUserAction(user, 'pdf_to_word', { tool: 'pdf_to_word', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('Conversion failed: ' + (err.message || 'Unexpected error.'));
    } finally { setConverting(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Conversion Settings</p>

      <div className="ux-option-card selected">
        <div className="ux-option-title">📝 Convert to Word (.docx)</div>
        <div className="ux-option-desc">Extracts text and basic layout. Scanned images require OCR.</div>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {converting && <ProgressBar pct={progress} label="Converting to Word…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Conversion Complete!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                if (!lastResult) return;
                const url = URL.createObjectURL(lastResult.blob);
                const a = document.createElement('a'); a.href = url; a.download = lastResult.name;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>
                ↓ Download Again
              </button>
              {lastResult && (
                <SaveToDriveButton bytes={lastResult.blob} filename={lastResult.name} toolFolder="PDF to Word" mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleConvert} disabled={converting || !file}>
      {converting ? (
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Converting…
        </span>
      ) : (
        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Convert to Word
        </span>
      )}
    </button>
  );

  return (
    <ToolPageLayout
      title="PDF to Word"
      subtitle="Convert PDF documents to editable Microsoft Word files locally."
      icon="📝"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="pdf_to_word" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to convert" hint="Single PDF · Fast Text Extraction" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{success ? 'Conversion complete.' : 'Ready to convert to Word.'}</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setSuccess(''); setError(''); setLastResult(null); setThumbnail(null); }}>
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
            <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', margin:0 }}>{formatBytes(file.size)} · Ready to convert</p>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="pdf_to_word" />
      <RecentFilesPanel tool="pdf_to_word" title="Recent conversions" />
    </ToolPageLayout>
  );
}
