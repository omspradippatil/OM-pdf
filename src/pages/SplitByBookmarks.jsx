import React, { useMemo, useRef, useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SaveToDriveButton from '../components/SaveToDriveButton';
import RecentFilesPanel from '../components/RecentFilesPanel';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import '../styles/SplitByBookmarks.css';

async function resolvePageIndex(pdf, dest) {
  let destination = dest;
  if (typeof destination === 'string') {
    destination = await pdf.getDestination(destination);
  }
  if (!destination || !destination[0]) return null;
  try {
    return await pdf.getPageIndex(destination[0]);
  } catch {
    return null;
  }
}

async function collectOutlineItems(pdf) {
  const outline = await pdf.getOutline();
  if (!outline) return [];
  const items = [];

  async function walk(nodes, depth) {
    for (const node of nodes) {
      const pageIndex = await resolvePageIndex(pdf, node.dest);
      if (pageIndex !== null && pageIndex !== undefined) {
        items.push({
          id: `${pageIndex}-${items.length}`,
          title: node.title || 'Untitled',
          pageIndex,
          depth,
        });
      }
      if (node.items?.length) {
        await walk(node.items, depth + 1);
      }
    }
  }

  await walk(outline, 0);
  return items.sort((a, b) => a.pageIndex - b.pageIndex);
}

async function buildSections(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = pdf.numPages;
  const items = await collectOutlineItems(pdf);
  if (!items.length) return { sections: [], totalPages };

  const sections = items.map((item, index) => {
    const next = items[index + 1];
    const end = next ? next.pageIndex - 1 : totalPages - 1;
    return {
      id: `${item.id}-${index}`,
      title: item.title,
      start: item.pageIndex,
      end,
      depth: item.depth,
    };
  }).filter((section) => section.end >= section.start);

  return { sections, totalPages };
}

export default function SplitByBookmarks() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [sections, setSections] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [pages, setPages] = useState(null);
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
    setSections([]);
    setSelected(new Set());

    try {
      const result = await buildSections(f);
      setPages(result.totalPages);
      setSections(result.sections);
      setSelected(new Set(result.sections.map((section) => section.id)));
      if (!result.sections.length) {
        setError('No bookmarks found in this PDF.');
      }
    } catch (err) {
      setError('Failed to read bookmarks: ' + (err?.message || 'Unexpected error.'));
    }
  };

  const toggleSection = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSplit = async () => {
    if (!file || !sections.length) return;
    const selectedSections = sections.filter((section) => selected.has(section.id));
    if (!selectedSections.length) {
      setError('Select at least one bookmark section.');
      return;
    }

    setWorking(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const srcBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcBuffer, { ignoreEncryption: true });
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const baseName = file.name.replace(/\.pdf$/i, '');

      for (let i = 0; i < selectedSections.length; i++) {
        const section = selectedSections[i];
        const indices = Array.from({ length: section.end - section.start + 1 }, (_, idx) => section.start + idx);
        const outDoc = await PDFDocument.create();
        const pagesToCopy = await outDoc.copyPages(srcDoc, indices);
        pagesToCopy.forEach((page) => outDoc.addPage(page));
        const bytes = await outDoc.save();
        const safeTitle = section.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || `section_${i + 1}`;
        const name = `${baseName}_${safeTitle}.pdf`;
        zip.file(name, bytes);
        setProgress(Math.round(((i + 1) / selectedSections.length) * 90));
      }

      if (selectedSections.length === 1) {
        const only = selectedSections[0];
        const indices = Array.from({ length: only.end - only.start + 1 }, (_, idx) => only.start + idx);
        const outDoc = await PDFDocument.create();
        const pagesToCopy = await outDoc.copyPages(srcDoc, indices);
        pagesToCopy.forEach((page) => outDoc.addPage(page));
        const bytes = await outDoc.save();
        const name = `${baseName}_bookmark.pdf`;
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
      } else {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipName = `${baseName}_bookmarks.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        setLastBytes(zipBlob);
        setLastName(zipName);
      }

      setProgress(100);
      setSuccess('Bookmark split complete.');
      addRecentFile({ tool: 'split_bookmarks', name: lastName || `${baseName}_bookmarks.zip`, size: lastBytes?.size || 0, pages: selectedSections.length });
      bumpLocalJob();
      await logUserAction(user, 'split_bookmarks', { tool: 'split_bookmarks', status: 'success', meta: { sections: selectedSections.length } });
    } catch (err) {
      setError('Split failed: ' + (err?.message || 'Unexpected error.'));
      await logUserAction(user, 'split_bookmarks', { tool: 'split_bookmarks', status: 'error', meta: { error: err?.message } });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  const selectedCount = useMemo(() => sections.filter((section) => selected.has(section.id)).length, [sections, selected]);

  const sidebarContent = (
    <>
      <p className="ux-section-label">Bookmark Sections</p>

      {file && (
        <div className="ux-summary">
          <div className="ux-summary-row"><span>Sections</span><strong>{sections.length}</strong></div>
          <div className="ux-summary-row"><span>Selected</span><strong>{selectedCount}</strong></div>
          <div className="ux-summary-row"><span>Total Pages</span><strong>{pages || '-'}</strong></div>
          <div className="ux-summary-row"><span>File Size</span><strong>{formatBytes(file.size)}</strong></div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>Error: {error}</span></div>}
      {working && <ProgressBar pct={progress} label="Splitting by bookmarks..." />}

      {success && (
        <div className="ux-result-card" style={{ marginTop:12 }}>
          <div className="ux-result-success-bar">
            <div className="ux-result-check">OK</div>
            <p className="ux-result-success-title">Split ready</p>
          </div>
          <div className="ux-result-body">
            <div className="ux-result-actions">
              <button className="ux-btn-primary" style={{ marginTop:0 }} onClick={() => {
                const blob = lastBytes instanceof Blob ? lastBytes : new Blob([lastBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = lastName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download</button>
              <SaveToDriveButton bytes={lastBytes} filename={lastName} toolFolder="Split by Bookmarks" mimeType={lastName?.endsWith('.zip') ? 'application/zip' : 'application/pdf'} />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ToolPageLayout
      title="Split by Bookmarks"
      subtitle="Split PDF using bookmarks and outline sections."
      icon="B"
      sidebarContent={sidebarContent}
      actionLabel={working ? 'Splitting...' : 'Split by Bookmarks'}
      onAction={handleSplit}
      actionDisabled={working || !file || !sections.length || !selectedCount}
      onAddMore={() => fileInputRef.current?.click()}
    >
      <ToolSeoHead toolKey="splitBookmarks" />

      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={(e) => loadFile(e.target.files)} />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF with bookmarks" hint="Single PDF - 200 MB Recommended" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Workspace</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Select bookmark sections to export.</p>
            </div>
            <div className="split-bookmarks-actions">
              <button className="ux-btn-secondary" type="button" onClick={() => setSelected(new Set(sections.map((section) => section.id)))}>Select All</button>
              <button className="ux-btn-secondary" type="button" onClick={() => setSelected(new Set())}>Clear</button>
              <button className="ux-btn-secondary" type="button" onClick={() => { setFile(null); setSections([]); setSuccess(''); setError(''); }}>
                Remove File
              </button>
            </div>
          </div>

          {sections.length === 0 ? (
            <div className="split-bookmarks-empty">No bookmarks detected.</div>
          ) : (
            <div className="split-bookmarks-list">
              {sections.map((section) => (
                <label key={section.id} className={`split-bookmark-row${selected.has(section.id) ? ' active' : ''}`}>
                  <input type="checkbox" checked={selected.has(section.id)} onChange={() => toggleSection(section.id)} />
                  <div className="split-bookmark-info">
                    <div className="split-bookmark-title" style={{ paddingLeft: section.depth * 12 }}>{section.title}</div>
                    <div className="split-bookmark-meta">Pages {section.start + 1} to {section.end + 1}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <ToolSeoContent toolKey="splitBookmarks" />
      <RecentFilesPanel tool="split_bookmarks" title="Recent bookmark splits" />
    </ToolPageLayout>
  );
}
