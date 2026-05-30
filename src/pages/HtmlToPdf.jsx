import React, { useState, useRef, useCallback } from 'react';
import { useExport } from '../context/ExportContext';
import ToolPageLayout from '../components/ToolPageLayout';
import ProgressBar from '../components/ProgressBar';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { PDFDocument } from 'pdf-lib';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
  h1 { color: #3949ab; border-bottom: 2px solid #3949ab; padding-bottom: 8px; }
  p { line-height: 1.7; color: #475569; }
  .highlight { background: #f0f4ff; border-left: 4px solid #3949ab; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #3949ab; color: white; padding: 10px 14px; text-align: left; }
  td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
</style>
</head>
<body>
  <h1>My Document Title</h1>
  <p>Start typing your HTML here. The preview updates live. When ready, click <strong>Generate PDF</strong>.</p>

  <div class="highlight">
    💡 You can use any CSS — fonts, colors, tables, grids, and more.
  </div>

  <h2>Sample Table</h2>
  <table>
    <tr><th>Item</th><th>Description</th><th>Value</th></tr>
    <tr><td>Revenue</td><td>Q1 2025</td><td>$120,000</td></tr>
    <tr><td>Expenses</td><td>Q1 2025</td><td>$80,000</td></tr>
    <tr><td>Net Profit</td><td>Q1 2025</td><td>$40,000</td></tr>
  </table>
</body>
</html>`;


export default function HtmlToPdf() {
  const { triggerExport } = useExport();
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [filename, setFilename] = useState('document');
  const [pageSize, setPageSize] = useState('A4');
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const iframeRef = useRef(null);

  // Page dimensions in pixels at 96 DPI
  const PAGE_SIZES = {
    A4:     { w: 794, h: 1123 },
    Letter: { w: 816, h: 1056 },
    A3:     { w: 1123, h: 1587 },
    Legal:  { w: 816, h: 1344 },
  };

  const generate = useCallback(async () => {
    setError(''); setSuccess(''); setWorking(true); setProgress(5);
    try {
      // Dynamically import html2canvas to keep initial bundle smaller
      const html2canvas = (await import('html2canvas')).default;
      setProgress(10);

      const iframe = iframeRef.current;
      if (!iframe) throw new Error('Preview iframe not found.');
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iDoc) throw new Error('Cannot access preview document.');

      const { w: pageW, h: pageH } = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
      const body = iDoc.body;
      const totalH = body.scrollHeight;
      const numPages = Math.ceil(totalH / pageH);

      const pdfDoc = await PDFDocument.create();
      setProgress(20);

      for (let i = 0; i < numPages; i++) {
        setProgress(20 + Math.round((i / numPages) * 70));

        // Scroll iframe to the right Y position for this "page"
        const clipY = i * pageH;

        const canvas = await html2canvas(body, {
          x: 0,
          y: clipY,
          width: pageW,
          height: Math.min(pageH, totalH - clipY),
          windowWidth: pageW,
          windowHeight: pageH,
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
        const img = await pdfDoc.embedJpg(imgBytes);

        const page = pdfDoc.addPage([pageW, pageH]);
        const actualH = Math.min(pageH, totalH - clipY);
        page.drawImage(img, { x: 0, y: pageH - actualH, width: pageW, height: actualH });
      }

      setProgress(95);
      const bytes = await pdfDoc.save();
      const name = `${filename || 'document'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      triggerExport(bytes, name, 'application/pdf', "Exported");
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created with ${numPages} page${numPages !== 1 ? 's' : ''}!`);
      addRecentFile({ tool: 'html_to_pdf', name, size: bytes.byteLength });
      bumpLocalJob();
    } catch (err) {
      console.error('[HtmlToPdf]', err);
      setError('Generation failed: ' + (err.message || 'Unexpected error.'));
    } finally {
      setWorking(false);
      setProgress(0);
    }
  }, [html, filename, pageSize]);

  const sidebarContent = (
    <>
      <p className="ux-section-label">Page Settings</p>

      <div className="ux-field">
        <label className="ux-label">Page Size</label>
        <select className="ux-input" value={pageSize} onChange={e => setPageSize(e.target.value)}>
          <option>A4</option>
          <option>Letter</option>
          <option>A3</option>
          <option>Legal</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label">Output Filename</label>
        <input
          className="ux-input"
          type="text"
          value={filename}
          onChange={e => setFilename(e.target.value)}
          placeholder="document"
        />
      </div>

      <p className="ux-section-label" style={{ marginTop: 20 }}>Tips</p>
      <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: 16, lineHeight: 1.8 }}>
        <li>Supports any valid HTML + CSS</li>
        <li>Use inline styles or &lt;style&gt; tags</li>
        <li>Images must be base64 or data URIs</li>
        <li>Long content auto-paginates</li>
      </ul>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Generating PDF…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">PDF Generated!</p>
          </div>
          <div className="ux-result-body">
            <button className="ux-btn-primary" onClick={() => triggerExport(lastBytes, lastName, 'application/pdf', "Exported")}>↓ Download Again</button>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={generate} disabled={working}>
      {working ? 'Generating…' : '🖨️ Generate PDF'}
    </button>
  );

  return (
    <ToolPageLayout
      title="HTML to PDF"
      subtitle="Write HTML & CSS and convert it to a PDF instantly. 100% offline."
      icon="🌐"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="htmlToPdf" />

      <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 500 }}>
        {/* Editor pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HTML Editor</span>
            <button
              className="ux-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setHtml(DEFAULT_HTML)}
            >Reset Example</button>
          </div>
          <textarea
            value={html}
            onChange={e => setHtml(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              width: '100%',
              minHeight: 460,
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              fontFamily: '"Courier New", monospace',
              fontSize: '0.82rem',
              lineHeight: 1.65,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        {/* Preview pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Preview</span>
          <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <iframe
              ref={iframeRef}
              title="HTML Preview"
              srcDoc={html}
              style={{ width: '100%', height: '100%', minHeight: 460, border: 'none' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      <ToolSeoContent toolKey="htmlToPdf" />
    </ToolPageLayout>
  );
}
