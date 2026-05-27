import React, { useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument, PDFName, PDFArray, PDFDict } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { generateThumbnail } from '../thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';

export default function RemoveLinksPdf() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linksCount, setLinksCount] = useState(0);
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
    setLinksCount(0);
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

  const handleRemoveLinks = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setWorking(true);
    setProgress(20);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      setProgress(50);

      const pdfPages = pdfDoc.getPages();
      let linksRemoved = 0;

      for (let idx = 0; idx < pdfPages.length; idx++) {
        setProgress(50 + Math.round((idx / pdfPages.length) * 40));
        const page = pdfPages[idx];
        const annots = page.node.get(PDFName.of('Annots'));

        if (annots instanceof PDFArray) {
          const keep = [];
          for (let i = 0; i < annots.size(); i++) {
            const ref = annots.get(i);
            const dict = pdfDoc.context.lookup(ref);
            if (dict instanceof PDFDict) {
              const subtype = dict.get(PDFName.of('Subtype'));
              if (subtype === PDFName.of('Link')) {
                linksRemoved++;
                continue; // Do not add this annotation to the new array
              }
            }
            keep.push(ref);
          }

          if (keep.length === 0) {
            page.node.delete(PDFName.of('Annots'));
          } else {
            const newAnnots = pdfDoc.context.obj(keep);
            page.node.set(PDFName.of('Annots'), newAnnots);
          }
        }
        await new Promise((r) => setTimeout(r, 0));
      }

      setProgress(90);
      const bytes = await pdfDoc.save();
      const name = file.name.replace(/\.pdf$/i, '_nolinks.pdf');
      
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
      setLinksCount(linksRemoved);
      setProgress(100);
      setSuccess(linksRemoved > 0 
        ? `Successfully removed ${linksRemoved} hyperlink${linksRemoved !== 1 ? 's' : ''}!`
        : "No active hyperlink annotations were found in this document."
      );

      addRecentFile({ tool: 'remove_links_pdf', name, size: bytes.byteLength || 0, pages: pdfPages.length });
      bumpLocalJob();
      await logUserAction(user, 'remove_links_pdf', { tool: 'remove_links_pdf', status: 'success', meta: { linksRemoved, pages: pdfPages.length } });
    } catch (err) {
      setError('Processing failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'remove_links_pdf', { tool: 'remove_links_pdf', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">File Details</p>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: 12, borderRadius: 8, lineHeight: 1.5, marginTop: 12 }}>
        🔒 <strong>Privacy Check:</strong> Stretches and removes link annotation tags natively. No text or visual layout elements are affected, protecting your layout's printing formatting.
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Removing links from PDF…" />}

      {success && (
        <div className="ux-result-card" style={{ marginTop: 12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">✓</div>
            <p className="ux-result-success-title">Sanitized!</p>
          </div>
          <div className="ux-result-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
              {linksCount > 0 ? `Removed ${linksCount} hyperlink${linksCount !== 1 ? 's' : ''}.` : 'No links detected to delete.'}
            </p>
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
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Sanitized" />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Remove Links"
      subtitle="Remove all clickable hyperlinks, web references, and URI annotations from a PDF."
      icon="🔗"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Processing...' : '🔗 Remove Links from PDF'}
      onAction={handleRemoveLinks}
      actionDisabled={working || !file}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="removeLinksPdf" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to remove hyperlinks" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Workspace</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scan and sanitize annotation directories from your document.</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius: '10px', padding: '8px 16px' }} onClick={() => { setFile(null); setPages(null); setSuccess(''); setError(''); }}>
              Remove File
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, border: '1px solid var(--border)', borderRadius: 12, marginTop: 12, background: '#f8fafc', padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--border)', padding: 16, borderRadius: 12, maxWidth: 280, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ width: '100%', height: 260, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#eee' }}>
                {thumbnail ? (
                  <img src={thumbnail} alt="PDF preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Preview</div>
                )}
              </div>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{file.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatBytes(file.size)} • {pages || '-'} pages</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="removeLinksPdf" />
      <RecentFilesPanel tool="remove_links_pdf" title="Recent link removals" />
    </ToolPageLayout>
  );
}
