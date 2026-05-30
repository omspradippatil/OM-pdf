import React, { useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { bumpLocalJob } from '../services/privacyStats';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument } from 'pdf-lib';

async function inspectPdf(file) {
  const buf = await file.arrayBuffer();
  
  const result = {
    fileName: file.name,
    fileSize: file.size,
    info: {},
    metadata: {},
    outline: null,
    pages: 0,
    fonts: [],
    pdfLibDetails: {}
  };

  try {
    // PDF.js for metadata and outline
    const pdfJs = await pdfjsLib.getDocument({ data: buf.slice(0), verbosity: 0 }).promise;
    result.pages = pdfJs.numPages;
    
    const metaData = await pdfJs.getMetadata();
    result.info = metaData.info || {};
    result.metadata = metaData.metadata ? metaData.metadata.getAll() : {};
    
    const outline = await pdfJs.getOutline();
    result.outline = outline;

    // Extract fonts from the first few pages (max 5 to save time)
    const fontsSet = new Set();
    const maxPagesToScan = Math.min(result.pages, 5);
    for (let i = 1; i <= maxPagesToScan; i++) {
      const page = await pdfJs.getPage(i);
      const textContent = await page.getTextContent();
      textContent.items.forEach(item => {
        if (item.fontName) fontsSet.add(item.fontName);
      });
    }
    result.fonts = Array.from(fontsSet);

  } catch (e) {
    result.pdfJsError = e.message;
  }

  try {
    // pdf-lib for additional structure info
    const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    result.pdfLibDetails = {
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor(),
      subject: pdfDoc.getSubject(),
      creator: pdfDoc.getCreator(),
      producer: pdfDoc.getProducer(),
      pageCount: pdfDoc.getPageCount(),
      formFields: pdfDoc.getForm().getFields().map(f => ({ name: f.getName(), type: f.constructor.name }))
    };
  } catch (e) {
    result.pdfLibError = e.message;
  }

  return result;
}

function downloadJson(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

export default function InspectPdf() {
  const { triggerExport } = useExport();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    
    setFile(f); setError(''); setData(null); setWorking(true);
    
    try {
      const analysis = await inspectPdf(f);
      setData(analysis);
      bumpLocalJob();
      await logUserAction(user, 'inspect', { tool: 'inspect', status: 'success' });
    } catch (err) {
      setError('Analysis failed: ' + err.message);
      await logUserAction(user, 'inspect', { tool: 'inspect', status: 'error' });
    } finally {
      setWorking(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    const name = file.name.replace(/\.pdf$/i, '_structure.json');
    downloadJson(data, name);
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Inspection Results</p>
      
      {!file ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Load a document to see the structural analysis.</p>
      ) : working ? (
        <div className="alert alert-info" style={{ marginTop:12 }}>Analyzing document structure...</div>
      ) : error ? (
        <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="ux-field">
            <label className="ux-label">File Size</label>
            <div className="ux-input" style={{ background: 'var(--bg-wash)', color: 'var(--text-muted)' }}>{data?.fileSize} bytes</div>
          </div>
          <div className="ux-field">
            <label className="ux-label">Pages</label>
            <div className="ux-input" style={{ background: 'var(--bg-wash)', color: 'var(--text-muted)' }}>{data?.pages}</div>
          </div>
          <div className="ux-field">
            <label className="ux-label">Form Fields</label>
            <div className="ux-input" style={{ background: 'var(--bg-wash)', color: 'var(--text-muted)' }}>{data?.pdfLibDetails?.formFields?.length || 0} found</div>
          </div>
          
          <button className="ux-btn-secondary" onClick={handleExport} style={{ width: '100%', marginTop: 12 }}>
            Download JSON Dump
          </button>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="PDF Structure Inspector"
      subtitle="Extract structural elements, metadata, outline, and fonts. 100% offline."
      icon="🩺"
      sidebarContent={sidebarContent}
      actionButton={null}
    >
      <ToolSeoHead toolKey="inspectPdf" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to inspect" hint="Developer & advanced user tool" />
      ) : (
        <div className="ux-workspace-content" style={{ height:'100%', display:'flex', flexDirection:'column' }}>
          <div className="ux-toolbar-inline" style={{ flexShrink:0 }}>
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>JSON Representation</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Raw structural output from PDF.js and PDF-lib engines.</p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile(null); setData(null); }}>Close File</button>
          </div>

          <div style={{ flex:1, padding:20, background:'#1e1e1e', borderRadius:16, border:'1px solid var(--border)', overflow:'auto', fontFamily: 'monospace', fontSize: '13px', color: '#d4d4d4' }}>
            {working ? (
              <p>Extracting data...</p>
            ) : data ? (
              <pre style={{ margin: 0 }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="inspectPdf" />
    </ToolPageLayout>
  );
}
