import React, { useState, useEffect } from 'react';
import { useExport } from '../context/ExportContext';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import PdfCanvas from '../components/PdfCanvas';
import { pdfjsLib } from '../utils/pdfjs';
import { DiffMatchPatch } from 'diff-match-patch';

async function extractTextFromPdf(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf, verbosity: 0 }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    text += strings.join(' ') + '\n';
  }
  return text;
}

export default function ComparePdf() {
  const { triggerExport } = useExport();
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  
  const [mode, setMode] = useState('visual'); // 'visual' | 'text'
  const [pageIndex, setPageIndex] = useState(0);
  
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [diffNodes, setDiffNodes] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const loadFile1 = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (f?.type === 'application/pdf') setFile1(f);
  };
  const loadFile2 = (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (f?.type === 'application/pdf') setFile2(f);
  };

  useEffect(() => {
    if (mode === 'text' && file1 && file2 && (!text1 || !text2)) {
      setIsExtracting(true);
      Promise.all([extractTextFromPdf(file1), extractTextFromPdf(file2)])
        .then(([t1, t2]) => {
          setText1(t1);
          setText2(t2);
          const dmp = new DiffMatchPatch();
          const diffs = dmp.diff_main(t1, t2);
          dmp.diff_cleanupSemantic(diffs);
          
          // Generate React nodes
          const nodes = diffs.map(([op, data], i) => {
            const lines = data.split('\n');
            const content = lines.map((line, j) => (
              <React.Fragment key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </React.Fragment>
            ));
            
            if (op === 1) return <ins key={i} style={{ background: '#e6ffed', color: '#22863a', textDecoration: 'none' }}>{content}</ins>;
            if (op === -1) return <del key={i} style={{ background: '#ffeef0', color: '#b31d28', textDecoration: 'line-through' }}>{content}</del>;
            return <span key={i}>{content}</span>;
          });
          setDiffNodes(nodes);
        })
        .finally(() => setIsExtracting(false));
    }
  }, [mode, file1, file2, text1, text2]);

  const sidebarContent = (
    <>
      <p className="ux-section-label">Comparison Mode</p>
      
      <div className="ux-field">
        <div className="ux-mode-tabs">
          <button className={`ux-mode-tab${mode==='visual'?' active':''}`} onClick={() => setMode('visual')}>Visual</button>
          <button className={`ux-mode-tab${mode==='text'?' active':''}`} onClick={() => setMode('text')}>Text Diff</button>
        </div>
      </div>

      {mode === 'visual' && (
        <div className="ux-field">
          <label className="ux-label">Page Sync</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ux-btn-secondary" onClick={() => setPageIndex(p => Math.max(0, p - 1))}>← Prev</button>
            <input className="ux-input" type="number" min={1} value={pageIndex + 1} onChange={(e) => setPageIndex(Math.max(0, parseInt(e.target.value) - 1 || 0))} style={{ textAlign: 'center' }} />
            <button className="ux-btn-secondary" onClick={() => setPageIndex(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {mode === 'text' && isExtracting && (
        <div className="alert alert-info" style={{ marginTop:12 }}>
          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            Extracting text...
          </span>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Compare PDF"
      subtitle="Compare two documents side-by-side visually or textually. 100% offline."
      icon="⚖️"
      sidebarContent={sidebarContent}
      actionButton={null}
    >
      <ToolSeoHead toolKey="compare" />

      {(!file1 || !file2) ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, height:'100%' }}>
          <DropZone onFiles={loadFile1} label={file1 ? file1.name : "Drop First PDF"} hint="Original Document" />
          <DropZone onFiles={loadFile2} label={file2 ? file2.name : "Drop Second PDF"} hint="Modified Document" />
        </div>
      ) : (
        <div className="ux-workspace-content" style={{ height:'100%', display:'flex', flexDirection:'column' }}>
          <div className="ux-toolbar-inline" style={{ flexShrink:0 }}>
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Comparison Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>
                {mode === 'visual' ? 'Side-by-side visual comparison.' : 'Inline text differences (green = added, red = removed).'}
              </p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile1(null); setFile2(null); setText1(''); setText2(''); }}>Start Over</button>
          </div>

          <div style={{ flex:1, display:'flex', gap:20, padding:20, background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'auto' }}>
            {mode === 'visual' && (
              <>
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                  <p style={{ margin:0, fontWeight:600, color:'var(--text-muted)' }}>{file1.name}</p>
                  <div style={{ position:'relative', boxShadow:'0 10px 30px rgba(0,0,0,0.1)' }}>
                    <PdfCanvas file={file1} pageNumber={pageIndex + 1} width={400} />
                  </div>
                </div>
                <div style={{ width:1, background:'var(--border)', flexShrink:0 }} />
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                  <p style={{ margin:0, fontWeight:600, color:'var(--text-muted)' }}>{file2.name}</p>
                  <div style={{ position:'relative', boxShadow:'0 10px 30px rgba(0,0,0,0.1)' }}>
                    <PdfCanvas file={file2} pageNumber={pageIndex + 1} width={400} />
                  </div>
                </div>
              </>
            )}

            {mode === 'text' && (
              <div style={{ flex:1, padding: 20, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflowY: 'auto', fontFamily: 'monospace', fontSize: '14px', lineHeight: 1.5 }}>
                {isExtracting ? (
                  <p style={{ color: 'var(--text-muted)' }}>Running OCR / Text extraction...</p>
                ) : (
                  <div>{diffNodes}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="compare" />
    </ToolPageLayout>
  );
}
