import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { parsePageRanges } from '../splitPdf';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/PdfToJpg.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

async function pdfToImagesAdvanced(file, options, onProgress) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = pdf.numPages;
  const pageDigits = String(totalPages).length;

  const indices = parsePageRanges(options.range, totalPages);
  if (!indices.length) throw new Error('No pages selected for conversion.');

  const images = [];
  for (let i = 0; i < indices.length; i++) {
    const pageIndex = indices[i];
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: options.scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = options.format === 'png' ? 1 : options.quality;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
    if (!blob) throw new Error('Failed to render a page image.');

    const name = `page_${String(pageIndex + 1).padStart(pageDigits, '0')}.${options.format}`;
    images.push({ blob, name });
    onProgress?.(Math.round(((i + 1) / indices.length) * 90));
    await new Promise((r) => setTimeout(r, 0));
  }

  return { images, indices };
}

export default function PdfToJpg() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [format, setFormat] = useState('jpg');
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(2);
  const [range, setRange] = useState('');
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBlob, setLastBlob] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setLastBlob(null);
    setLastName('');
    setThumbnail(null);

    generateThumbnail(f).then((url) => setThumbnail(url));
    try {
      const buf = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      const total = doc.numPages;
      setPages(total);
      const defaultRange = total > 1 ? `1-${total}` : '1';
      setRange(defaultRange);
    } catch {
      setPages(null);
    }
  };

  const handleConvert = async () => {
    if (!file || !pages) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const safeScale = clamp(parseFloat(scale) || 2, 1, 4);
      const safeQuality = clamp(parseFloat(quality) || 0.9, 0.6, 0.98);

      const { images, indices } = await pdfToImagesAdvanced(
        file,
        { format, quality: safeQuality, scale: safeScale, range },
        setProgress
      );

      let outputName = '';
      let outputBlob = null;

      if (images.length === 1) {
        outputName = images[0].name;
        outputBlob = images[0].blob;
        const url = URL.createObjectURL(images[0].blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        images.forEach((img) => zip.file(img.name, img.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        outputName = file.name.replace(/\.pdf$/i, '') + `_images.${format}.zip`;
        outputBlob = zipBlob;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      }

      setLastBlob(outputBlob);
      setLastName(outputName);
      setProgress(100);
      setSuccess(`Converted ${indices.length} page${indices.length === 1 ? '' : 's'} to ${format.toUpperCase()}.`);
      addRecentFile({ tool: 'pdf_to_jpg', name: outputName, size: outputBlob?.size || 0, pages: indices.length });
      bumpLocalJob();
      await logUserAction(user, 'pdf_to_jpg', { tool: 'pdf_to_jpg', status: 'success', meta: { pages: indices.length, format, scale: safeScale, quality: safeQuality } });
    } catch (err) {
      setError('Conversion failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'pdf_to_jpg', { tool: 'pdf_to_jpg', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Conversion Settings</p>

      <div className="ux-field">
        <label className="ux-label">Output Format</label>
        <div className="pdf-to-jpg-toggle">
          <button type="button" className={format === 'jpg' ? 'active' : ''} onClick={() => setFormat('jpg')}>JPG</button>
          <button type="button" className={format === 'png' ? 'active' : ''} onClick={() => setFormat('png')}>PNG</button>
        </div>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="range">Page Range</label>
        <input
          id="range"
          className="ux-input"
          type="text"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          placeholder="e.g. 1-3, 5"
        />
        <p className="pdf-to-jpg-hint">Leave blank to export all pages.</p>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="scale">Quality Scale (1x to 4x)</label>
        <input
          id="scale"
          className="ux-input"
          type="number"
          min={1}
          max={4}
          step={0.5}
          value={scale}
          onChange={(e) => setScale(e.target.value)}
        />
      </div>

      {format === 'jpg' && (
        <div className="ux-field">
          <label className="ux-label" htmlFor="quality">JPG Quality</label>
          <input
            id="quality"
            className="pdf-to-jpg-range"
            type="range"
            min={0.6}
            max={0.98}
            step={0.02}
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
          />
          <div className="pdf-to-jpg-range-value">{Math.round(quality * 100)}%</div>
        </div>
      )}

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Converting pages..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Conversion done!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const url = URL.createObjectURL(lastBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = lastName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download</button>
              <SaveToDriveButton
                bytes={lastBlob}
                filename={lastName}
                toolFolder="PDF to JPG"
                mimeType={lastName?.endsWith('.zip') ? 'application/zip' : (format === 'png' ? 'image/png' : 'image/jpeg')}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="PDF to JPG (Advanced)"
      subtitle="Control resolution, quality, and page ranges."
      icon="🖼️"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Converting...' : 'Convert to Images'}
      onAction={handleConvert}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="pdfToJpg" />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display:'none' }}
        onChange={(e) => loadFile(e.target.files)}
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to convert" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Preview the first page and fine-tune output settings.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div className="pdf-to-jpg-preview">
            <div className="pdf-to-jpg-card">
              <div className="pdf-to-jpg-thumb">
                {thumbnail ? <img src={thumbnail} alt="PDF Preview" /> : <div className="pdf-to-jpg-thumb-placeholder" />}
              </div>
              <div className="pdf-to-jpg-meta">
                <div className="pdf-to-jpg-name">{file.name}</div>
                <div className="pdf-to-jpg-sub">{formatBytes(file.size)} - {pages || '-'} pages</div>
              </div>
            </div>
            <div className="pdf-to-jpg-info">
              <div className="pdf-to-jpg-stat">
                <span>Output Format</span>
                <strong>{format.toUpperCase()}</strong>
              </div>
              <div className="pdf-to-jpg-stat">
                <span>Scale</span>
                <strong>{scale}x</strong>
              </div>
              {format === 'jpg' && (
                <div className="pdf-to-jpg-stat">
                  <span>Quality</span>
                  <strong>{Math.round(quality * 100)}%</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="pdfToJpg" />
      <RecentFilesPanel tool="pdf_to_jpg" title="Recent JPG exports" />
    </ToolPageLayout>
  );
}
