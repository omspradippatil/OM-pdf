import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';
import { parsePageRanges, extractPages, downloadBytes } from '../splitPdf';
import { generatePageThumbnails } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { PDFDocument } from 'pdf-lib';
import '../styles/ExtractPages.css';

export default function ExtractPages() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [pageThumbs, setPageThumbs] = useState([]);
  const [range, setRange] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const updateSelectionFromRange = (value, totalPages) => {
    if (!totalPages) return;
    const indices = parsePageRanges(value, totalPages);
    setSelected(new Set(indices));
    if (value?.trim() && !indices.length) {
      setRangeError('No valid pages found. Use commas and dashes, e.g. 1-3, 7, 9-10');
    } else {
      setRangeError('');
    }
  };

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setLastBytes(null);
    setLastName('');
    setRange('');
    setRangeError('');
    setSelected(new Set());

    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const total = doc.getPageCount();
      setPages(total);
      const defaultRange = total > 1 ? `1-${total}` : '1';
      setRange(defaultRange);
      updateSelectionFromRange(defaultRange, total);

      const thumbs = await generatePageThumbnails(f, () => {});
      if (thumbs) setPageThumbs(thumbs);
    } catch {
      setPages(null);
    }
  };

  const togglePageSelection = (index) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    const list = Array.from(next).sort((a, b) => a - b).map((i) => i + 1).join(', ');
    setRange(list);
    setSelected(next);
    setRangeError('');
  };

  const selectedCount = selected.size;

  const handleExtract = async () => {
    if (!file || !pages) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(0);

    try {
      const indices = Array.from(selected).sort((a, b) => a - b);
      if (!indices.length) throw new Error('Select at least one page.');
      setProgress(30);
      const bytes = await extractPages(file, indices);
      setProgress(85);
      const baseName = file.name.replace(/\.pdf$/i, '');
      const name = `${baseName}_extracted.pdf`;
      triggerExport(bytes, name, 'application/pdf', "Extracted Pages");
      setLastBytes(bytes);
      setLastName(name);
      setSuccess(`Extracted ${indices.length} page${indices.length === 1 ? '' : 's'}.`);
      setProgress(100);
      addRecentFile({ tool: 'extract_pages', name, size: bytes.byteLength || 0, pages: indices.length });
      bumpLocalJob();
      await logUserAction(user, 'extract_pages', { tool: 'extract_pages', status: 'success', meta: { pages: indices.length } });
    } catch (err) {
      setError('Extraction failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'extract_pages', { tool: 'extract_pages', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Selection Settings</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="extractRange">Page Range</label>
        <input
          id="extractRange"
          className="ux-input"
          type="text"
          value={range}
          onChange={(e) => {
            setRange(e.target.value);
            if (pages) updateSelectionFromRange(e.target.value, pages);
          }}
          placeholder="e.g. 1-3, 5, 9"
        />
        <p className="extract-pages-hint">Click thumbnails to toggle selection.</p>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Selected</span><strong>{selectedCount}</strong></div>
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {rangeError && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {rangeError}</span></div>}
      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Extracting pages..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Pages extracted!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => triggerExport(lastBytes, lastName, 'application/pdf', "Extracted Pages")}>
                Download Again
              </button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Extracted Pages" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Extract Pages"
      subtitle="Select the pages you need and export a new PDF."
      icon="📄"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Extracting...' : 'Extract Pages'}
      onAction={handleExtract}
      actionDisabled={working || !file || !selectedCount}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="extractPages" />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display:'none' }}
        accept=".pdf"
        onChange={(e) => loadFile(e.target.files)}
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to extract pages" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Click pages to select. Range input updates automatically.</p>
            </div>
            <div className="extract-pages-actions">
              <button className="ux-btn-secondary" type="button" onClick={() => {
                const all = Array.from({ length: pages || 0 }, (_, i) => i);
                setSelected(new Set(all));
                setRange(pages > 1 ? `1-${pages}` : '1');
                setRangeError('');
              }}>Select All</button>
              <button className="ux-btn-secondary" type="button" onClick={() => { setSelected(new Set()); setRange(''); }}>
                Clear
              </button>
              <button className="ux-btn-secondary" type="button" onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
                Remove File
              </button>
            </div>
          </div>

          <div className="ux-page-grid">
            {Array.from({ length: pages || 0 }).map((_, i) => {
              const isSelected = selected.has(i);
              return (
                <div
                  key={i}
                  className="ux-page-card"
                  onClick={() => togglePageSelection(i)}
                  style={{
                    border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                    opacity: isSelected ? 1 : 0.55,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, opacity 0.2s',
                  }}
                >
                  <div className="ux-page-thumb-wrap">
                    {pageThumbs[i] ? <img className="ux-page-thumb-img" src={pageThumbs[i]} alt={`Page ${i + 1}`} /> : <div className="ux-page-thumb-placeholder" />}
                  </div>
                  <div className="ux-page-num" style={{ color: isSelected ? 'var(--primary)' : 'inherit', fontWeight: isSelected ? 700 : 500 }}>
                    Page {i + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="extractPages" />
      <RecentFilesPanel tool="extract_pages" title="Recent page extracts" />
    </ToolPageLayout>
  );
}
