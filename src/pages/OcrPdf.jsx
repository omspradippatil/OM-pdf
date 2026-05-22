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
import { pdfjsLib } from '../utils/pdfjs';
import Tesseract from 'tesseract.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

async function renderPageToDataURL(page) {
  const scale = 2; // Higher scale for better OCR
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({ canvasContext: ctx, viewport }).promise;
  return { dataUrl: canvas.toDataURL('image/png'), width: viewport.width, height: viewport.height, scale };
}

async function runOcrOnPdf(file, language, onProgress) {
  const buf = await file.arrayBuffer();
  
  // Read with PDF.js for rendering
  const pdfJsDoc = await pdfjsLib.getDocument({ data: buf.slice(0), verbosity: 0 }).promise;
  const numPages = pdfJsDoc.numPages;

  // We will build a new PDF with pdf-lib, or just modify the existing one.
  // Creating a new searchable PDF is complex (putting invisible text over image).
  // A simple approach is to create a new PDF with the images and invisible text, or just 
  // extract the text and save as TXT. The user wants "searchable documents", 
  // so we'll try to add invisible text over the image.
  
  // Actually, Tesseract.js can output PDF natively, but handling it in browser might be tricky.
  // Let's create a new PDF-lib document.
  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);

  const worker = await Tesseract.createWorker({
    logger: m => {
      if (m.status === 'recognizing text') {
        // Tesseract progress is 0-1.
      }
    }
  });
  
  await worker.loadLanguage(language);
  await worker.initialize(language);

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(Math.round(((i - 1) / numPages) * 90));
    const pageJs = await pdfJsDoc.getPage(i);
    const { dataUrl, width, height, scale } = await renderPageToDataURL(pageJs);
    
    const { data } = await worker.recognize(dataUrl);
    
    // Add page to output PDF
    const outPage = outDoc.addPage([width / scale, height / scale]);
    const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
    const img = await outDoc.embedPng(imgBytes);
    
    // Draw the image
    outPage.drawImage(img, { x: 0, y: 0, width: width / scale, height: height / scale });
    
    // Draw invisible text over it
    data.words.forEach(word => {
      const bbox = word.bbox;
      const x = bbox.x0 / scale;
      const y = (height - bbox.y1) / scale; // PDF y is bottom-up
      const w = (bbox.x1 - bbox.x0) / scale;
      const h = (bbox.y1 - bbox.y0) / scale;
      const fontSize = h * 0.9;
      
      // Draw transparent text
      try {
        outPage.drawText(word.text, {
          x, y, size: fontSize, font, color: rgb(0,0,0), opacity: 0
        });
      } catch (e) {
        // Ignore font errors for weird characters
      }
    });
  }

  await worker.terminate();
  onProgress?.(98);
  return outDoc.save();
}

export default function OcrPdf() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  
  const [language, setLanguage] = useState('eng');

  const loadFile = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f); setError(''); setSuccess(''); setProgress(0);
  };

  const handleApply = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(5);
    try {
      const bytes = await runOcrOnPdf(file, language, setProgress);
      const name = file.name.replace(/\.pdf$/i, '_ocr.pdf');
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created!`);
      addRecentFile({ tool: 'ocr', name, size: bytes.byteLength || 0 });
      bumpLocalJob();
      await logUserAction(user, 'ocr', { tool: 'ocr', status: 'success', meta: { outputName: name } });
    } catch (err) {
      setError('OCR failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'ocr', { tool: 'ocr', status: 'error', meta: { error: err?.message } });
    } finally { setWorking(false); setProgress(0); }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">OCR Settings</p>
      
      <div className="ux-field">
        <label className="ux-label">Language</label>
        <select className="ux-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="eng">English</option>
          <option value="spa">Spanish</option>
          <option value="fra">French</option>
          <option value="deu">German</option>
          <option value="ita">Italian</option>
        </select>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Language models will be downloaded automatically by the browser if not cached.
        </p>
      </div>

      <div className="alert alert-info" style={{ marginTop:12 }}>
        <span>ℹ️ OCR processing runs entirely locally in your browser. It may take some time depending on document length and your device's speed.</span>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Running OCR Engine…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Successfully Converted!</p>
          </div>
          <div className="ux-result-body">
             <button className="ux-btn-primary" onClick={() => downloadBytes(lastBytes, lastName)}>↓ Download Searchable PDF</button>
             <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="OCR" />
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={handleApply} disabled={working || !file}>
      {working ? 'Processing…' : 'Start OCR'}
    </button>
  );

  return (
    <ToolPageLayout
      title="Offline OCR PDF"
      subtitle="Convert scanned images to searchable text documents locally. 100% offline."
      icon="🔍"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="ocr" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a scanned PDF" hint="Single PDF · Best under 10 pages for browser OCR" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{file.name}</p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile(null); setSuccess(''); }}>Remove File</button>
          </div>

          <div style={{ flex:1, padding:20, background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>🤖</div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Ready for Text Recognition</h3>
              <p style={{ color: 'var(--text-muted)' }}>Click "Start OCR" to begin. The engine will read the text and embed an invisible searchable layer.</p>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="ocr" />
    </ToolPageLayout>
  );
}
