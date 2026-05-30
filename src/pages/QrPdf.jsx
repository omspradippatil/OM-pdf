import React, { useState, useRef, useCallback } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import ProgressBar from '../components/ProgressBar';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import RecentFilesPanel from '../components/RecentFilesPanel';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';

const DEFAULT_ITEMS = `https://om-pdf.netlify.app/merge-pdf
https://om-pdf.netlify.app/split-pdf
https://om-pdf.netlify.app/compress-pdf
OM-PDF Label 1
OM-PDF Label 2
OM-PDF Label 3`;

export default function QrPdf() {
  const { triggerExport } = useExport();
  const { user } = useAuth();
  const [inputText, setInputText] = useState(DEFAULT_ITEMS);
  const [filename, setFilename] = useState('qr_codes');
  const [pageSize, setPageSize] = useState('A4');
  const [columns, setColumns] = useState('3');
  const [showLabels, setShowLabels] = useState(true);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');

  const PAGE_SIZES = {
    A4: { width: 595, height: 842 },     // 1/72 inch points
    Letter: { width: 612, height: 792 }
  };

  const generateQrs = useCallback(async () => {
    setError(''); setSuccess(''); setWorking(true); setProgress(5);
    try {
      const QRCode = (await import('qrcode')).default;
      setProgress(15);

      const items = inputText.split('\n').map(x => x.trim()).filter(Boolean);
      if (items.length === 0) {
        throw new Error('Please enter at least one URL or text item.');
      }

      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      setProgress(25);

      const sizeDef = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
      const pageW = sizeDef.width;
      const pageH = sizeDef.height;

      // Layout layout calculations
      const margin = 36; // 0.5 inch margins
      const colsCount = parseInt(columns) || 3;
      const spacing = 18; // 0.25 inch cell gap
      
      const innerW = pageW - (margin * 2);
      const cellW = (innerW - (colsCount - 1) * spacing) / colsCount;
      const cellH = showLabels ? cellW + 15 : cellW; // Extra height for text labels
      
      const innerH = pageH - (margin * 2);
      const rowsPerPage = Math.floor((innerH + spacing) / (cellH + spacing));
      const cellsPerPage = colsCount * rowsPerPage;

      let currentPage = null;
      
      for (let i = 0; i < items.length; i++) {
        setProgress(25 + Math.round((i / items.length) * 65));
        const itemText = items[i];

        // Generate QR code data URL (PNG format)
        const qrDataUrl = await QRCode.toDataURL(itemText, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        const qrBytes = await fetch(qrDataUrl).then(r => r.arrayBuffer());
        const qrImage = await pdfDoc.embedPng(qrBytes);

        // Grid indexing calculations
        const itemIndexOnPage = i % cellsPerPage;
        if (itemIndexOnPage === 0) {
          currentPage = pdfDoc.addPage([pageW, pageH]);
        }

        const colIdx = itemIndexOnPage % colsCount;
        const rowIdx = Math.floor(itemIndexOnPage / colsCount);

        const x = margin + colIdx * (cellW + spacing);
        const y = pageH - margin - (rowIdx + 1) * (cellH + spacing) + spacing;

        // Draw the QR Code image
        const imageSize = cellW - 4; // slight inner padding
        const imageX = x + 2;
        const imageY = showLabels ? y + 15 + 2 : y + 2;

        currentPage.drawImage(qrImage, {
          x: imageX,
          y: imageY,
          width: imageSize,
          height: imageSize
        });

        // Draw the text label underneath
        if (showLabels) {
          const truncatedLabel = itemText.length > 20 ? itemText.substring(0, 18) + '...' : itemText;
          const textWidth = helveticaFont.widthOfTextAtSize(truncatedLabel, 7);
          const textX = x + (cellW - textWidth) / 2;
          const textY = y + 4;

          currentPage.drawText(truncatedLabel, {
            x: textX,
            y: textY,
            size: 7,
            font: helveticaFont,
            color: pdfDoc.context.obj(0.2) // dark gray
          });
        }
      }

      setProgress(95);
      const bytes = await pdfDoc.save();
      const name = `${filename || 'qr_codes'}.pdf`;
      
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      setLastBytes(bytes); setLastName(name);
      setSuccess(`Generated ${items.length} QR Code${items.length !== 1 ? 's' : ''} in PDF!`);

      addRecentFile({ tool: 'qr_pdf', name, size: bytes.byteLength });
      bumpLocalJob();
      await logUserAction(user, 'qr_pdf', { tool: 'qr_pdf', status: 'success', meta: { count: items.length } });
    } catch (err) {
      console.error(err);
      setError('Generation failed: ' + err.message);
      await logUserAction(user, 'qr_pdf', { tool: 'qr_pdf', status: 'error', meta: { error: err.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  }, [inputText, filename, pageSize, columns, showLabels]);

  const sidebarContent = (
    <>
      <p className="ux-section-label">Grid Layout Settings</p>

      <div className="ux-field">
        <label className="ux-label" htmlFor="columns">Grid Columns</label>
        <select id="columns" className="ux-input" value={columns} onChange={e => setColumns(e.target.value)}>
          <option value="2">2 Columns (Large Codes)</option>
          <option value="3">3 Columns (Recommended)</option>
          <option value="4">4 Columns (Label Size)</option>
          <option value="5">5 Columns (Small Codes)</option>
        </select>
      </div>

      <div className="ux-field">
        <label className="ux-label" htmlFor="pageSize">Page Size</label>
        <select id="pageSize" className="ux-input" value={pageSize} onChange={e => setPageSize(e.target.value)}>
          <option>A4</option>
          <option>Letter</option>
        </select>
      </div>

      <div className="ux-field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input
          id="showLabels"
          type="checkbox"
          checked={showLabels}
          onChange={e => setShowLabels(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        <label htmlFor="showLabels" className="ux-label" style={{ margin: 0, cursor: 'pointer' }}>Show text label below QR</label>
      </div>

      <div className="ux-field" style={{ marginTop: 16 }}>
        <label className="ux-label" htmlFor="filename">Output Filename</label>
        <input
          id="filename"
          className="ux-input"
          type="text"
          value={filename}
          onChange={e => setFilename(e.target.value)}
          placeholder="qr_codes"
        />
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Generating QR grid…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">PDF Generated!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop: 0 }} onClick={() => triggerExport(lastBytes, lastName, 'application/pdf', "QRCodes")}>↓ Download Again</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="QRCodes" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const actionButton = (
    <button className="ux-action-btn" onClick={generateQrs} disabled={working}>
      {working ? 'Generating…' : '📸 Generate QR PDF'}
    </button>
  );

  return (
    <ToolPageLayout
      title="QR Code Generator"
      subtitle="Generate multiple QR codes from URLs or texts and print them onto a PDF grid."
      icon="📸"
      sidebarContent={sidebarContent}
      actionButton={actionButton}
    >
      <ToolSeoHead toolKey="qrPdf" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 460 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Enter Text / Links</h2>
          <p style={{ margin: '4px 0 12px 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Enter one text item or URL per line. A unique QR code will be generated for each line.
          </p>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            spellCheck={false}
            placeholder="https://example.com/item1&#10;https://example.com/item2"
            style={{
              width: '100%',
              minHeight: 180,
              background: '#f8fafc',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
              fontFamily: 'inherit',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        {/* Dynamic visual preview of grid items */}
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.0rem', fontWeight: 700 }}>Live Preview Layout</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(80px, 1fr))`,
            gap: 12,
            border: '1px dashed var(--border)',
            borderRadius: 12,
            padding: 16,
            background: '#fff',
            minHeight: 160
          }}>
            {inputText.split('\n').map(x => x.trim()).filter(Boolean).map((item, idx) => (
              <div key={idx} style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f9fafb',
                aspectRatio: showLabels ? '1/1.25' : '1/1'
              }}>
                {/* Mock QR image */}
                <div style={{ width: '80%', aspectRatio: '1/1', border: '1px solid #d1d5db', borderRadius: 4, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  📱
                </div>
                {showLabels && (
                  <span style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                    {item}
                  </span>
                )}
              </div>
            ))}
            {inputText.split('\n').map(x => x.trim()).filter(Boolean).length === 0 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Enter text above to preview QR code cards.
              </div>
            )}
          </div>
        </div>
      </div>

      <ToolSeoContent toolKey="qrPdf" />
      <RecentFilesPanel tool="qr_pdf" title="Recent QR code exports" />
    </ToolPageLayout>
  );
}
