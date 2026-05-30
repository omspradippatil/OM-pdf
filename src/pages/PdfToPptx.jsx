import React, { useState, useCallback } from 'react';
import { useExport } from '../context/ExportContext';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { pdfjsLib } from '../utils/pdfjs';

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

/** Render a PDF page to a canvas and return a JPEG data URL */
async function renderPageToDataUrl(pdfDoc, pageNum, scale = 2.0) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: viewport.width,
    height: viewport.height,
  };
}

export default function PdfToPptx() {
  const { triggerExport } = useExport();
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState([]);
  const [slideSize, setSlideSize] = useState('widescreen'); // widescreen | standard
  const [quality, setQuality] = useState('high'); // high | medium
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFile = useCallback(async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    setError(''); setSuccess(''); setThumbs([]);
    setFile(f);

    try {
      const ab = await f.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: ab }).promise;
      setPageCount(pdfDoc.numPages);

      // Generate low-res thumbnails for preview (scale 0.3)
      const previews = [];
      const previewCount = Math.min(pdfDoc.numPages, 8);
      for (let i = 1; i <= previewCount; i++) {
        const { dataUrl } = await renderPageToDataUrl(pdfDoc, i, 0.4);
        previews.push(dataUrl);
      }
      setThumbs(previews);
    } catch (err) {
      setError('Could not read PDF: ' + err.message);
      setFile(null);
    }
  }, []);

  const convert = useCallback(async () => {
    if (!file) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(0);
    try {
      // Dynamic import to keep initial bundle lean
      const PptxGenJS = (await import('pptxgenjs')).default;
      setProgress(5); setProgressLabel('Initialising…');

      const ab = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: ab }).promise;
      const numPages = pdfDoc.numPages;
      const scale = quality === 'high' ? 2.0 : 1.2;

      // Slide dimensions (inches)
      const SLIDE_DIMS = {
        widescreen: { w: 13.33, h: 7.5  },
        standard:   { w: 10,    h: 7.5  },
      };
      const dims = SLIDE_DIMS[slideSize];

      const pptx = new PptxGenJS();
      pptx.layout = slideSize === 'widescreen' ? 'LAYOUT_WIDE' : 'LAYOUT_4x3';
      pptx.title = file.name.replace(/\.pdf$/i, '');

      for (let i = 1; i <= numPages; i++) {
        const pct = 5 + Math.round((i / numPages) * 88);
        setProgress(pct);
        setProgressLabel(`Rendering page ${i} of ${numPages}…`);

        const { dataUrl, width, height } = await renderPageToDataUrl(pdfDoc, i, scale);

        // Calculate image dimensions preserving aspect ratio
        const pageAspect = width / height;
        const slideAspect = dims.w / dims.h;
        let imgW = dims.w, imgH = dims.h, imgX = 0, imgY = 0;
        if (pageAspect > slideAspect) {
          imgH = dims.w / pageAspect;
          imgY = (dims.h - imgH) / 2;
        } else {
          imgW = dims.h * pageAspect;
          imgX = (dims.w - imgW) / 2;
        }

        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };
        slide.addImage({
          data: dataUrl,
          x: imgX, y: imgY,
          w: imgW, h: imgH,
        });
      }

      setProgress(96); setProgressLabel('Saving PPTX…');
      const pptxBlob = await pptx.write({ outputType: 'blob' });
      const name = file.name.replace(/\.pdf$/i, '') + '.pptx';
      downloadBlob(pptxBlob, name);

      setSuccess(`"${name}" downloaded — ${numPages} slide${numPages !== 1 ? 's' : ''}!`);
      addRecentFile({ tool: 'pdf_to_pptx', name, size: pptxBlob.size });
      bumpLocalJob();
      setProgress(100);
    } catch (err) {
      console.error('[PdfToPptx]', err);
      setError('Conversion failed: ' + (err.message || 'Unexpected error.'));
    } finally {
      setWorking(false);
    }
  }, [file, slideSize, quality]);

  const sidebarContent = (
    <>
      <p className="ux-section-label">Slide Settings</p>

      <div className="ux-field">
        <label className="ux-label">Slide Format</label>
        <select className="ux-input" value={slideSize} onChange={e => setSlideSize(e.target.value)}>
          <option value="widescreen">Widescreen 16:9</option>
          <option value="standard">Standard 4:3</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label">Image Quality</label>
        <select className="ux-input" value={quality} onChange={e => setQuality(e.target.value)}>
          <option value="high">High (slower, sharper)</option>
          <option value="medium">Medium (faster)</option>
        </select>
      </div>

      {file && (
        <div className="ux-field" style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>📄 {file.name}</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', fontWeight: 700 }}>{pageCount} page{pageCount !== 1 ? 's' : ''} → {pageCount} slide{pageCount !== 1 ? 's' : ''}</p>
        </div>
      )}

      <p className="ux-section-label" style={{ marginTop: 16 }}>Notes</p>
      <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: 16, lineHeight: 1.8 }}>
        <li>Each PDF page becomes a slide image</li>
        <li>Fully editable in PowerPoint &amp; Google Slides</li>
        <li>100% offline — no upload</li>
      </ul>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label={progressLabel} />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">PPTX Downloaded!</p>
          </div>
          <div className="ux-result-body">
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{success}</p>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={convert} disabled={working || !file}>
      {working ? 'Converting…' : '📊 Convert to PPTX'}
    </button>
  );

  return (
    <ToolPageLayout
      title="PDF to PowerPoint"
      subtitle="Convert each PDF page into a slide. Works offline — no upload needed."
      icon="📊"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="pdfToPptx" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to convert" hint="Single PDF · All page counts supported" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Slide Preview</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {pageCount} page{pageCount !== 1 ? 's' : ''} — showing first {Math.min(pageCount, 8)} thumbnail{Math.min(pageCount, 8) !== 1 ? 's' : ''}
              </p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile(null); setThumbs([]); setSuccess(''); setPageCount(0); }}>
              Remove File
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16,
            padding: '8px 0',
          }}>
            {thumbs.map((src, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <img src={src} alt={`Page ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                <p style={{ margin: 0, padding: '6px 10px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
                  Slide {i + 1}
                </p>
              </div>
            ))}
            {pageCount > 8 && (
              <div style={{
                background: 'var(--bg-muted)',
                border: '1px dashed var(--border)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 120,
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                +{pageCount - 8} more
              </div>
            )}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="pdfToPptx" />
    </ToolPageLayout>
  );
}
