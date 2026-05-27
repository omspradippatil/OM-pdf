import React, { useState, useRef, useCallback } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import RecentFilesPanel from '../components/RecentFilesPanel';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import { useAuth } from '../context/AuthContext';

function downloadBytes(bytes, name, mimeType) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

export default function ExcelPdf() {
  const { user } = useAuth();
  const [mode, setMode] = useState('excel2pdf'); // 'excel2pdf' or 'pdf2excel'
  const [file, setFile] = useState(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Excel to PDF state
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  
  // PDF to Excel state
  const [pdfPages, setPdfPages] = useState(0);
  const [exportType, setExportType] = useState('xlsx'); // 'xlsx' or 'csv'

  const [lastBytes, setLastBytes] = useState(null);
  const [lastName, setLastName] = useState('');
  
  const fileInputRef = useRef(null);
  const iframeRef = useRef(null);

  const resetAll = () => {
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setPreviewHtml('');
    setPdfPages(0);
    setError('');
    setSuccess('');
    setLastBytes(null);
    setLastName('');
  };

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f) return;

    resetAll();
    setFile(f);

    if (mode === 'excel2pdf') {
      const allowed = ['.xlsx', '.xls', '.csv', '.ods'];
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      if (!allowed.includes(ext)) {
        setError('Please select a valid spreadsheet file (.xlsx, .xls, .csv, or .ods).');
        setFile(null);
        return;
      }
      
      try {
        setWorking(true);
        setProgress(20);
        // Lazy load xlsx package
        const XLSX = await import('xlsx');
        setProgress(50);
        const data = await f.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          setSelectedSheet(wb.SheetNames[0]);
          loadExcelPreview(wb, wb.SheetNames[0], XLSX);
        }
        setProgress(100);
      } catch (err) {
        setError('Failed to parse spreadsheet: ' + err.message);
        setFile(null);
      } finally {
        setWorking(false);
        setProgress(0);
      }
    } else {
      if (f.type !== 'application/pdf') {
        setError('Please select a valid PDF file.');
        setFile(null);
        return;
      }
      try {
        const buf = await f.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        setPdfPages(doc.numPages);
      } catch (err) {
        setError('Failed to load PDF: ' + err.message);
        setFile(null);
      }
    }
  };

  const loadExcelPreview = (wb, sheetName, XLSX) => {
    try {
      const ws = wb.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(ws, { id: 'sheetjs-table' });
      // Inline styles to style SheetJS HTML table beautifully
      const styledHtml = `
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #1f2937; margin: 0; background: #ffffff; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
            tr:nth-child(even) td { background-color: #f9fafb; }
            th { background-color: #3949ab; color: #ffffff; font-weight: 600; }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;
      setPreviewHtml(styledHtml);
    } catch (err) {
      setError('Preview error: ' + err.message);
    }
  };

  const handleSheetChange = async (sheetName) => {
    setSelectedSheet(sheetName);
    const XLSX = await import('xlsx');
    loadExcelPreview(workbook, sheetName, XLSX);
  };

  const convertExcelToPdf = async () => {
    if (!file || !previewHtml) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const html2canvas = (await import('html2canvas')).default;
      setProgress(30);

      const iframe = iframeRef.current;
      if (!iframe) throw new Error('Preview iframe not found.');
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iDoc) throw new Error('Cannot access preview document.');

      const body = iDoc.body;
      const totalW = body.scrollWidth || 800;
      const totalH = body.scrollHeight || 1100;

      // standard A4 at 96 DPI is 794x1123
      const pageW = 794;
      const pageH = 1123;
      
      const numPages = Math.ceil(totalH / pageH);
      const pdfDoc = await PDFDocument.create();
      setProgress(50);

      for (let i = 0; i < numPages; i++) {
        setProgress(50 + Math.round((i / numPages) * 40));
        const clipY = i * pageH;

        const canvas = await html2canvas(body, {
          x: 0,
          y: clipY,
          width: pageW,
          height: Math.min(pageH, totalH - clipY),
          windowWidth: pageW,
          windowHeight: pageH,
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
        const img = await pdfDoc.embedJpg(imgBytes);

        const page = pdfDoc.addPage([pageW, pageH]);
        const actualH = Math.min(pageH, totalH - clipY);
        page.drawImage(img, { x: 0, y: pageH - actualH, width: pageW, height: actualH });
      }

      setProgress(95);
      const bytes = await pdfDoc.save();
      const name = file.name.substring(0, file.name.lastIndexOf('.')) + '_sheet.pdf';
      downloadBytes(bytes, name, 'application/pdf');

      setLastBytes(bytes);
      setLastName(name);
      setSuccess(`Successfully converted "${selectedSheet}" to PDF!`);
      addRecentFile({ tool: 'excel_pdf', name, size: bytes.byteLength });
      bumpLocalJob();
      await logUserAction(user, 'excel_pdf', { action: 'excel2pdf', status: 'success', pages: numPages });
    } catch (err) {
      console.error(err);
      setError('Conversion failed: ' + err.message);
      await logUserAction(user, 'excel_pdf', { action: 'excel2pdf', status: 'error', error: err.message });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const convertPdfToExcel = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setWorking(true); setProgress(10);
    try {
      const XLSX = await import('xlsx');
      setProgress(20);

      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const numPages = pdf.numPages;

      let allSheetRows = [];

      for (let i = 1; i <= numPages; i++) {
        setProgress(20 + Math.round((i / numPages) * 60));
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Tabular parsing heuristic:
        // 1. Group text items by Y coordinate (rows)
        // 2. Sort items within row by X coordinate (cols)
        const items = textContent.items;
        if (items.length === 0) continue;

        // Group rows with Y difference <= 6px
        const rowThreshold = 6;
        let rows = [];

        items.forEach(item => {
          const x = item.transform[4];
          const y = item.transform[5];
          const text = item.str.trim();
          if (!text) return;

          let foundRow = rows.find(r => Math.abs(r.y - y) <= rowThreshold);
          if (foundRow) {
            foundRow.cells.push({ x, text });
          } else {
            rows.push({ y, cells: [{ x, text }] });
          }
        });

        // Sort rows descending by Y (top of page down to bottom)
        rows.sort((a, b) => b.y - a.y);

        // Sort cells in each row by X (left to right) and format
        rows.forEach(row => {
          row.cells.sort((a, b) => a.x - b.x);
          
          // Form columns by identifying gaps or simple array ordering
          let finalRowCells = [];
          let lastX = -9999;
          row.cells.forEach(cell => {
            // If X gap is larger than 12px, append as a separate cell, otherwise join
            if (lastX !== -9999 && cell.x - lastX < 12) {
              if (finalRowCells.length > 0) {
                finalRowCells[finalRowCells.length - 1] += " " + cell.text;
              } else {
                finalRowCells.push(cell.text);
              }
            } else {
              finalRowCells.push(cell.text);
            }
            lastX = cell.x + (cell.text.length * 6); // estimate cell width
          });
          allSheetRows.push(finalRowCells);
        });

        // Add empty separator row between pages
        if (i < numPages) {
          allSheetRows.push([]);
        }
      }

      setProgress(85);
      const ws = XLSX.utils.aoa_to_sheet(allSheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");

      setProgress(95);
      const fileExt = exportType === 'xlsx' ? '.xlsx' : '.csv';
      const name = file.name.replace(/\.pdf$/i, '') + '_extracted' + fileExt;
      const mime = exportType === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv';
      
      const outBytes = XLSX.write(wb, {
        bookType: exportType,
        type: 'array'
      });

      downloadBytes(outBytes, name, mime);
      
      setLastBytes(outBytes);
      setLastName(name);
      setSuccess(`Extracted tables into "${name}"!`);
      addRecentFile({ tool: 'excel_pdf', name, size: outBytes.byteLength });
      bumpLocalJob();
      await logUserAction(user, 'excel_pdf', { action: 'pdf2excel', status: 'success', pages: numPages });
    } catch (err) {
      console.error(err);
      setError('Extraction failed: ' + err.message);
      await logUserAction(user, 'excel_pdf', { action: 'pdf2excel', status: 'error', error: err.message });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const handleAction = () => {
    if (mode === 'excel2pdf') {
      convertExcelToPdf();
    } else {
      convertPdfToExcel();
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Conversion Mode</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`ux-btn-secondary ${mode === 'excel2pdf' ? 'active' : ''}`}
          style={{ flex: 1, background: mode === 'excel2pdf' ? 'var(--primary-50)' : '', border: mode === 'excel2pdf' ? '1px solid var(--primary)' : '' }}
          onClick={() => { setMode('excel2pdf'); resetAll(); }}
        >
          📊 Excel to PDF
        </button>
        <button
          className={`ux-btn-secondary ${mode === 'pdf2excel' ? 'active' : ''}`}
          style={{ flex: 1, background: mode === 'pdf2excel' ? 'var(--primary-50)' : '', border: mode === 'pdf2excel' ? '1px solid var(--primary)' : '' }}
          onClick={() => { setMode('pdf2excel'); resetAll(); }}
        >
          📄 PDF to Excel
        </button>
      </div>

      {mode === 'excel2pdf' && sheetNames.length > 0 && (
        <div className="ux-field">
          <label className="ux-label">Select Sheet</label>
          <select className="ux-input" value={selectedSheet} onChange={e => handleSheetChange(e.target.value)}>
            {sheetNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      )}

      {mode === 'pdf2excel' && file && (
        <div className="ux-field">
          <label className="ux-label">Output Format</label>
          <select className="ux-input" value={exportType} onChange={e => setExportType(e.target.value)}>
            <option value="xlsx">Excel Workbook (.xlsx)</option>
            <option value="csv">CSV Spreadsheet (.csv)</option>
          </select>
        </div>
      )}

      {file && (
        <div className="ux-summary" style={{ marginTop: 16 }}>
          <div className="ux-summary-row"><span>Filename</span><strong style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 150 }}>{file.name}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
          {pdfPages > 0 && <div className="ux-summary-row"><span>Total Pages</span><strong>{pdfPages}</strong></div>}
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Converting spreadsheet…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Success!</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop: 0 }} onClick={() => downloadBytes(lastBytes, lastName, mode === 'excel2pdf' ? 'application/pdf' : (exportType === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'))}>↓ Download Again</button>
              {mode === 'excel2pdf' && <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Excel" />}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Excel & PDF Converter"
      subtitle={mode === 'excel2pdf' ? "Convert Excel sheets into beautifully formatted PDF documents." : "Extract tabular text structures from PDFs to .xlsx or .csv spreadsheets."}
      icon="📊"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Converting…' : (mode === 'excel2pdf' ? '🖨️ Convert to PDF' : '📊 Extract Excel')}
      onAction={handleAction}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="excelPdf" />

      <input
        ref={fileInputRef}
        type="file"
        accept={mode === 'excel2pdf' ? ".xlsx,.xls,.csv,.ods" : ".pdf"}
        style={{ display: 'none' }}
        onChange={e => loadFile(e.target.files)}
      />

      {!file ? (
        <DropZone
          onFiles={loadFile}
          label={mode === 'excel2pdf' ? "Drop your spreadsheet here (.xlsx, .csv, .ods)" : "Drop your PDF file here"}
          hint="All calculations are processed locally inside your browser."
        />
      ) : (
        <div className="ux-workspace-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Workspace Preview</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {mode === 'excel2pdf' ? "Previewing selected spreadsheet content." : "PDF document loaded. Ready to extract table data."}
              </p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius: 10 }} onClick={resetAll}>Remove File</button>
          </div>

          <div style={{ flex: 1, minHeight: 400, marginTop: 12, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
            {mode === 'excel2pdf' && previewHtml ? (
              <iframe
                ref={iframeRef}
                title="Excel sheet preview"
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '3rem', marginBottom: 12 }}>📄</span>
                <strong>{file.name}</strong>
                <span style={{ fontSize: '0.8rem', marginTop: 4 }}>{formatBytes(file.size)} • {pdfPages} pages</span>
              </div>
            )}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="excelPdf" />
      <RecentFilesPanel tool="excel_pdf" title="Recent spreadsheet conversions" />
    </ToolPageLayout>
  );
}
