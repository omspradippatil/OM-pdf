import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import ProgressBar from '../components/ProgressBar';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import RecentFilesPanel from '../components/RecentFilesPanel';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { PDFDocument } from 'pdf-lib';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { useAuth } from '../context/AuthContext';

const DEFAULT_MARKDOWN = `# My Markdown Document

Welcome to the offline **Markdown to PDF Editor**!

## Features
- Real-time HTML rendering in your browser.
- Multi-page PDF generation.
- Zero server uploads (100% private).

---

### Code block example

\`\`\`javascript
function greet(user) {
  return \`Hello, \${user}! Ready to export to PDF?\`;
}
console.log(greet("OM PDF User"));
\`\`\`

### Formatted Table

| Feature | Supported | Mode |
| :--- | :---: | ---: |
| Markdown | Yes | Client |
| Offline | Yes | Local |
| Custom Styles | Yes | CSS |

> "Simplicity is the ultimate sophistication." — Leonardo da Vinci

Write your markdown on the left, preview it on the right, and download your styled PDF!
`;

function downloadBytes(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

export default function MarkdownPdf() {
  const { user } = useAuth();
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [filename, setFilename] = useState('document');
  const [pageSize, setPageSize] = useState('A4');
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const [compiledHtml, setCompiledHtml] = useState('');
  
  const iframeRef = useRef(null);

  const PAGE_SIZES = {
    A4:     { w: 794, h: 1123 },
    Letter: { w: 816, h: 1056 },
    Legal:  { w: 816, h: 1344 }
  };

  // Compile markdown to HTML when it changes
  useEffect(() => {
    let active = true;
    const compile = async () => {
      try {
        const { marked } = await import('marked');
        const parsed = await marked.parse(markdown);
        if (active) {
          // GitHub-style beautiful theme
          const iframeTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                  color: #24292f;
                  line-height: 1.6;
                  padding: 40px;
                  margin: 0;
                  background-color: #ffffff;
                }
                h1, h2, h3, h4, h5, h6 {
                  margin-top: 24px;
                  margin-bottom: 16px;
                  font-weight: 600;
                  line-height: 1.25;
                  color: #1f2328;
                }
                h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
                h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
                h3 { font-size: 1.25em; }
                p { margin-top: 0; margin-bottom: 16px; }
                a { color: #0969da; text-decoration: none; }
                ul, ol { padding-left: 2em; margin-top: 0; margin-bottom: 16px; }
                li { margin-top: 0.25em; }
                blockquote {
                  padding: 0 1em;
                  color: #57606a;
                  border-left: 0.25em solid #d0d7de;
                  margin: 0 0 16px 0;
                }
                code {
                  padding: 0.2em 0.4em;
                  margin: 0;
                  font-size: 85%;
                  background-color: rgba(175,184,193,0.2);
                  border-radius: 6px;
                  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
                }
                pre {
                  padding: 16px;
                  overflow: auto;
                  font-size: 85%;
                  line-height: 1.45;
                  background-color: #f6f8fa;
                  border-radius: 6px;
                  margin-bottom: 16px;
                }
                pre code {
                  background: none;
                  padding: 0;
                  font-size: inherit;
                  border-radius: 0;
                }
                table {
                  border-spacing: 0;
                  border-collapse: collapse;
                  width: 100%;
                  margin-top: 0;
                  margin-bottom: 16px;
                }
                tr { background-color: #ffffff; border-top: 1px solid #d0d7de; }
                tr:nth-child(even) { background-color: #f6f8fa; }
                th, td { padding: 6px 13px; border: 1px solid #d0d7de; }
                th { font-weight: 600; background-color: #f6f8fa; }
                hr {
                  height: 0.25em;
                  padding: 0;
                  margin: 24px 0;
                  background-color: #d0d7de;
                  border: 0;
                }
              </style>
            </head>
            <body>
              ${parsed}
            </body>
            </html>
          `;
          setCompiledHtml(iframeTemplate);
        }
      } catch (err) {
        console.error('Markdown compiler error:', err);
      }
    };
    compile();
    return () => { active = false; };
  }, [markdown]);

  const generatePdf = useCallback(async () => {
    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const html2canvas = (await import('html2canvas')).default;
      setProgress(20);

      const iframe = iframeRef.current;
      if (!iframe) throw new Error('Preview iframe not found.');
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iDoc) throw new Error('Cannot access preview document.');

      const { w: pageW, h: pageH } = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
      const body = iDoc.body;
      const totalH = body.scrollHeight || 1100;
      const numPages = Math.ceil(totalH / pageH);

      const pdfDoc = await PDFDocument.create();
      setProgress(30);

      for (let i = 0; i < numPages; i++) {
        setProgress(30 + Math.round((i / numPages) * 60));
        const clipY = i * pageH;

        const canvas = await html2canvas(body, {
          x: 0,
          y: clipY,
          width: pageW,
          height: Math.min(pageH, totalH - clipY),
          windowWidth: pageW,
          windowHeight: pageH,
          scale: 1.8,
          useCORS: true,
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
      const name = `${filename || 'document'}_markdown.pdf`;
      downloadBytes(bytes, name);
      setLastBytes(bytes); setLastName(name);
      setSuccess(`"${name}" created with ${numPages} page${numPages !== 1 ? 's' : ''}!`);
      
      addRecentFile({ tool: 'markdown_pdf', name, size: bytes.byteLength });
      bumpLocalJob();
      await logUserAction(user, 'markdown_pdf', { tool: 'markdown_pdf', status: 'success', meta: { pages: numPages, size: bytes.byteLength } });
    } catch (err) {
      console.error(err);
      setError('Generation failed: ' + err.message);
      await logUserAction(user, 'markdown_pdf', { tool: 'markdown_pdf', status: 'error', meta: { error: err.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  }, [compiledHtml, filename, pageSize]);

  const sidebarContent = (
    <>
      <p className="ux-section-label">Page Layout Settings</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="pageSize">Page Size</label>
        <select id="pageSize" className="ux-input" value={pageSize} onChange={e => setPageSize(e.target.value)}>
          <option>A4</option>
          <option>Letter</option>
          <option>Legal</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="filename">Output Filename</label>
        <input
          id="filename"
          className="ux-input"
          type="text"
          value={filename}
          onChange={e => setFilename(e.target.value)}
          placeholder="document"
        />
      </div>

      <p className="ux-section-label" style={{ marginTop: 20 }}>Formatting Guide</p>
      <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: 16, lineHeight: 1.8 }}>
        <li>Use <strong># Header</strong> for titles</li>
        <li>Use <strong>**bold**</strong> and <em>*italics*</em></li>
        <li>Create code blocks with 3 backticks (\`\`\`)</li>
        <li>Render standard HTML blockquote blocks</li>
        <li>Define standard table row layout cells</li>
      </ul>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Compiling PDF document…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">PDF Generated!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop: 0 }} onClick={() => downloadBytes(lastBytes, lastName)}>↓ Download Again</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Markdown" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={generatePdf} disabled={working}>
      {working ? 'Compiling…' : '🖨️ Generate PDF'}
    </button>
  );

  return (
    <ToolPageLayout
      title="Markdown to PDF"
      subtitle="Write GitHub-styled Markdown documents and convert them to PDFs instantly. 100% offline."
      icon="📝"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="markdownPdf" />

      <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 500 }}>
        {/* Editor pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Markdown Text</span>
            <button
              className="ux-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setMarkdown(DEFAULT_MARKDOWN)}
            >Reset Template</button>
          </div>
          <textarea
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
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
              fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
              fontSize: '0.82rem',
              lineHeight: 1.65,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        {/* Preview pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rendered Preview</span>
          <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <iframe
              ref={iframeRef}
              title="Markdown Preview"
              srcDoc={compiledHtml}
              style={{ width: '100%', height: '100%', minHeight: 460, border: 'none' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      <ToolSeoContent toolKey="markdownPdf" />
      <RecentFilesPanel tool="markdown_pdf" title="Recent Markdown exports" />
    </ToolPageLayout>
  );
}
