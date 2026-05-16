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
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/ExtractImages.css';

const IMAGE_OPS = new Set([
  pdfjsLib.OPS?.paintImageXObject,
  pdfjsLib.OPS?.paintJpegXObject,
  pdfjsLib.OPS?.paintImageXObjectRepeat,
].filter(Boolean));

const pad = (value, digits) => String(value).padStart(digits, '0');

async function resolveImageObject(page, name) {
  return new Promise((resolve) => {
    try {
      const direct = page.objs.get(name, (obj) => resolve(obj));
      if (direct) resolve(direct);
    } catch {
      resolve(null);
    }
  });
}

async function imageObjectToBlob(obj) {
  if (!obj) return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (obj instanceof HTMLImageElement || obj instanceof ImageBitmap) {
    canvas.width = obj.width || obj.naturalWidth;
    canvas.height = obj.height || obj.naturalHeight;
    ctx.drawImage(obj, 0, 0);
  } else if (obj?.bitmap instanceof ImageBitmap) {
    canvas.width = obj.bitmap.width;
    canvas.height = obj.bitmap.height;
    ctx.drawImage(obj.bitmap, 0, 0);
  } else if (obj?.data && obj?.width && obj?.height) {
    canvas.width = obj.width;
    canvas.height = obj.height;
    const data = obj.data instanceof Uint8ClampedArray ? obj.data : new Uint8ClampedArray(obj.data);
    const imageData = new ImageData(data, obj.width, obj.height);
    ctx.putImageData(imageData, 0, 0);
  } else {
    return null;
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function extractEmbeddedImages(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer, verbosity: 0 }).promise;
  const totalPages = pdf.numPages;
  const pageDigits = String(totalPages).length;
  const images = [];

  let globalIndex = 0;
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const operatorList = await page.getOperatorList();
    const imageNames = [];

    operatorList.fnArray.forEach((fn, idx) => {
      if (IMAGE_OPS.has(fn)) {
        const name = operatorList.argsArray[idx]?.[0];
        if (name) imageNames.push(name);
      }
    });

    const seen = new Set();
    for (const name of imageNames) {
      if (seen.has(name)) continue;
      seen.add(name);
      const obj = await resolveImageObject(page, name);
      const blob = await imageObjectToBlob(obj);
      if (!blob) continue;
      globalIndex += 1;
      images.push({
        blob,
        name: `image_p${pad(i, pageDigits)}_${pad(globalIndex, 3)}.png`,
      });
    }

    onProgress?.(Math.round((i / totalPages) * 90));
    await new Promise((r) => setTimeout(r, 0));
  }

  return images;
}

export default function ExtractImages() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageCount, setImageCount] = useState(0);
  const [lastBlob, setLastBlob] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') {
      setError('Select a valid PDF.');
      return;
    }
    setFile(f);
    setError('');
    setSuccess('');
    setImageCount(0);
    setLastBlob(null);
    setLastName('');
    setThumbnail(null);

    generateThumbnail(f).then((url) => setThumbnail(url));
    try {
      const buf = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPages(doc.numPages);
    } catch {
      setPages(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const images = await extractEmbeddedImages(file, setProgress);
      if (!images.length) throw new Error('No embedded images found in this PDF.');

      const baseName = file.name.replace(/\.pdf$/i, '');
      let outputName = '';
      let outputBlob = null;

      if (images.length === 1) {
        outputName = `${baseName}_${images[0].name}`;
        const url = URL.createObjectURL(images[0].blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        outputBlob = images[0].blob;
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        images.forEach((img) => zip.file(img.name, img.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        outputName = `${baseName}_images.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        outputBlob = zipBlob;
      }

      setLastBlob(outputBlob);
      setLastName(outputName);
      setImageCount(images.length);
      setProgress(100);
      setSuccess(`Extracted ${images.length} image${images.length === 1 ? '' : 's'} successfully.`);
      addRecentFile({ tool: 'extract_images', name: outputName, size: outputBlob?.size || 0, pages });
      bumpLocalJob();
      await logUserAction(user, 'extract_images', { tool: 'extract_images', status: 'success', meta: { images: images.length } });
    } catch (err) {
      setError('Extraction failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'extract_images', { tool: 'extract_images', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Extraction Settings</p>
      <div className="ux-option-card selected">
        <div>
          <div className="ux-option-title">Embedded Images Only</div>
          <div className="ux-option-desc">Fast extraction of original embedded images. No page rendering.</div>
        </div>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      <div className="extract-images-note">
        Some PDFs store images as vectors or masks. We extract embedded raster images when available.
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Extracting images..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Images ready!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button
                className="ux-btn-primary"
                style={{ marginTop:0 }}
                onClick={() => {
                  const url = URL.createObjectURL(lastBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = lastName;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Download
              </button>
              <SaveToDriveButton
                bytes={lastBlob}
                filename={lastName}
                toolFolder="Extracted Images"
                mimeType={lastName?.endsWith('.zip') ? 'application/zip' : 'image/png'}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Extract Images from PDF"
      subtitle="Get original embedded images instantly. 100% local."
      icon="📸"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Extracting...' : 'Extract Images'}
      onAction={handleExtract}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="extractImages" />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display:'none' }}
        onChange={(e) => loadFile(e.target.files)}
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to extract images" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>We will extract embedded raster images only.</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
                Remove File
              </button>
            </div>
          </div>

          <div className="extract-images-preview">
            <div className="extract-images-card">
              <div className="extract-images-thumb">
                {thumbnail ? <img src={thumbnail} alt="PDF Preview" /> : <div className="extract-images-thumb-placeholder" />}
              </div>
              <div className="extract-images-meta">
                <div className="extract-images-name">{file.name}</div>
                <div className="extract-images-sub">{formatBytes(file.size)} - {pages || '-'} pages</div>
              </div>
            </div>
            <div className="extract-images-info">
              <div className="extract-images-stat">
                <span>Estimated Output</span>
                <strong>{imageCount ? `${imageCount} images` : 'After extraction'}</strong>
              </div>
              <div className="extract-images-stat">
                <span>Output Format</span>
                <strong>PNG</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="extractImages" />
      <RecentFilesPanel tool="extract_images" title="Recent image extracts" />
    </ToolPageLayout>
  );
}
