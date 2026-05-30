import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';

// Page dimensions in PDF points (1/72 inch)
const PAGE_SIZES = {
  A4: { width: 595, height: 842 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 }
};

export default function BookletPdf() {
  const { triggerExport } = useExport();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' or 'portrait'
  const [nUp, setNUp] = useState('2'); // '2', '4', '8'
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    setFile(f);
    setError('');
    setSuccess('');
    setLastBytes(null);
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

  const handleCreateBooklet = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer);
      const destDoc = await PDFDocument.create();
      
      const totalSrcPages = srcDoc.getPageCount();
      const embeddedPages = await destDoc.embedPages(srcDoc.getPages());
      setProgress(30);

      // Define target page dimensions
      const sizeDef = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
      const targetW = orientation === 'landscape' ? sizeDef.height : sizeDef.width;
      const targetH = orientation === 'landscape' ? sizeDef.width : sizeDef.height;

      // Imposition parameters based on N-up selection
      let cols = 2;
      let rows = 1;
      
      if (nUp === '4') {
        cols = 2;
        rows = 2;
      } else if (nUp === '8') {
        cols = 4;
        rows = 2;
      }

      const gridW = targetW / cols;
      const gridH = targetH / rows;
      const pagesPerSheet = cols * rows;
      const totalSheets = Math.ceil(totalSrcPages / pagesPerSheet);

      for (let s = 0; s < totalSheets; s++) {
        setProgress(30 + Math.round((s / totalSheets) * 60));
        const newPage = destDoc.addPage([targetW, targetH]);

        for (let gridIdx = 0; gridIdx < pagesPerSheet; gridIdx++) {
          const srcIdx = s * pagesPerSheet + gridIdx;
          if (srcIdx >= totalSrcPages) break;

          const embedPage = embeddedPages[srcIdx];
          const { width: embedW, height: embedH } = embedPage;

          // Grid coordinates
          const colIdx = gridIdx % cols;
          const rowIdx = Math.floor(gridIdx / cols);

          // PDF coordinates start at bottom-left
          // For rows: we sort from top-down, meaning rowIdx=0 is at the top
          const targetX = colIdx * gridW;
          const targetY = targetH - ((rowIdx + 1) * gridH);

          // Scaling logic (fit page aspect ratio to sub-grid area)
          const scale = Math.min(gridW / embedW, gridH / embedH) * 0.95; // 5% margin
          const drawnW = embedW * scale;
          const drawnH = embedH * scale;

          // Centering within sub-grid cell
          const offsetX = targetX + (gridW - drawnW) / 2;
          const offsetY = targetY + (gridH - drawnH) / 2;

          newPage.drawPage(embedPage, {
            x: offsetX,
            y: offsetY,
            width: drawnW,
            height: drawnH
          });
        }
        await new Promise((r) => setTimeout(r, 0));
      }

      setProgress(95);
      const bytes = await destDoc.save();
      const name = file.name.replace(/\.pdf$/i, `_booklet_${nUp}up.pdf`);
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      setLastBytes(bytes);
      setLastName(name);
      setProgress(100);
      setSuccess(`Booklet generated with ${totalSheets} sheet${totalSheets !== 1 ? 's' : ''}!`);
      
      addRecentFile({ tool: 'booklet_pdf', name, size: bytes.byteLength || 0, pages: totalSheets });
      bumpLocalJob();
      await logUserAction(user, 'booklet_pdf', { tool: 'booklet_pdf', status: 'success', meta: { sheets: totalSheets, layout: `${nUp}-up` } });
    } catch (err) {
      setError('Generation failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'booklet_pdf', { tool: 'booklet_pdf', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Booklet Layout</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="nUp">Pages per Sheet (N-Up)</label>
        <select id="nUp" className="ux-input" value={nUp} onChange={(e) => setNUp(e.target.value)}>
          <option value="2">2 Pages per Sheet (1x2)</option>
          <option value="4">4 Pages per Sheet (2x2)</option>
          <option value="8">8 Pages per Sheet (4x2)</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="pageSize">Sheet Size</label>
        <select id="pageSize" className="ux-input" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
          <option value="A4">A4 Sheet</option>
          <option value="Letter">Letter Sheet</option>
          <option value="Legal">Legal Sheet</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label">Sheet Orientation</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`ux-btn-secondary ${orientation === 'landscape' ? 'active' : ''}`}
            style={{ flex: 1, background: orientation === 'landscape' ? 'var(--primary-50)' : '', border: orientation === 'landscape' ? '1px solid var(--primary)' : '' }}
            onClick={() => setOrientation('landscape')}
          >
            Landscape
          </button>
          <button
            className={`ux-btn-secondary ${orientation === 'portrait' ? 'active' : ''}`}
            style={{ flex: 1, background: orientation === 'portrait' ? 'var(--primary-50)' : '', border: orientation === 'portrait' ? '1px solid var(--primary)' : '' }}
            onClick={() => setOrientation('portrait')}
          >
            Portrait
          </button>
        </div>
      </div>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Original Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>Output Sheets</span><strong>{pages ? Math.ceil(pages / (parseInt(nUp) || 2)) : '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Generating Booklet PDF…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Booklet Ready!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop: 0 }} onClick={() => {
                const blob = new Blob([lastBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = lastName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>↓ Download Again</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Booklets" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Helper render to show mock booklet grid preview
  const renderPreviewGrid = () => {
    let cells = [];
    const count = parseInt(nUp) || 2;
    for (let i = 1; i <= count; i++) {
      cells.push(
        <div key={i} style={{
          border: '2px dashed #cbd5e1',
          background: '#f8fafc',
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#64748b'
        }}>
          Page {i}
        </div>
      );
    }

    const gridStyles = {
      display: 'grid',
      width: orientation === 'landscape' ? 360 : 260,
      height: orientation === 'landscape' ? 260 : 360,
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 12,
      gap: 8,
      boxShadow: 'var(--shadow-card)',
      gridTemplateColumns: nUp === '8' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
      gridTemplateRows: nUp === '2' && orientation === 'portrait' ? 'repeat(2, 1fr)' : (nUp === '2' ? '1fr' : 'repeat(2, 1fr)')
    };

    return (
      <div style={gridStyles}>
        {cells}
      </div>
    );
  };

  return (
    <ToolPageLayout
      title="Booklet Creator"
      subtitle="Arrange multiple PDF pages side-by-side on sheets to create printable booklets."
      icon="📖"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Generating...' : '📖 Create Booklet'}
      onAction={handleCreateBooklet}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="bookletPdf" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to convert to Booklet" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Workspace</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Preview and configure your booklet layout before compiling.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius: '10px', padding: '8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, border: '1px solid var(--border)', borderRadius: 12, marginTop: 12, background: '#f8fafc', padding: 24, gap: 16 }}>
            {renderPreviewGrid()}
            <div style={{ textAlign: 'center' }}>
              <strong>{file.name}</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Selected Layout: {nUp}-Up ({orientation}) on {pageSize} sheet
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="bookletPdf" />
      <RecentFilesPanel tool="booklet_pdf" title="Recent booklet creations" />
    </ToolPageLayout>
  );
}
