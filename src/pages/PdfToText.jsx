import React, { useState, useRef } from 'react';
import SEO from '../components/SEO';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ProgressBar from '../components/ProgressBar';
import SuccessBanner from '../components/SuccessBanner';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { pdfjsLib } from '../utils/pdfjs';
import { formatBytes } from '../fileManager';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { addRecentFile } from '../services/recentFiles';
import { bumpLocalJob } from '../services/privacyStats';
import QueuePanel from '../components/QueuePanel';
import RecentFilesPanel from '../components/RecentFilesPanel';

async function extractText(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer, verbosity: 0 }).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    onProgress?.(Math.round((i / numPages) * 100));
  }

  return fullText;
}

export default function PdfToText() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastBlobRef = useRef(null);
  const lastNameRef = useRef('');

  const queueItems = file ? [{
    id: file.name,
    name: file.name,
    status: working ? 'processing' : error ? 'error' : success ? 'done' : 'ready',
    progress: working ? progress : success ? 100 : 0,
    etaMs: file.size ? Math.max(1000, Math.round((file.size / (1024 * 1024)) * 600)) : null,
    message: error || '',
  }] : [];

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    
    setFile(f);
    setError('');
    setSuccess('');
    setProgress(0);
    setExtractedText('');

    try {
      const buffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer, verbosity: 0 }).promise;
      setPages(pdf.numPages);
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
      const text = await extractText(file, setProgress);
      setExtractedText(text);
      
      const name = file.name.replace(/\.pdf$/i, '.txt');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      lastBlobRef.current = blob;
      lastNameRef.current = name;
      setSuccess(`Text extracted from ${pages} pages!`);

      addRecentFile({ tool: 'text_extract', name, size: blob.size || 0, pages });
      bumpLocalJob();
      await logUserAction(user, 'text_extract', {
        tool: 'text_extract',
        status: 'success',
        meta: { outputName: name, pages }
      });
    } catch (err) {
      setError('Extraction failed: ' + (err.message || 'Unexpected error.'));
      await logUserAction(user, 'text_extract', {
        tool: 'text_extract',
        status: 'error',
        meta: { error: err?.message || 'Extraction failed' }
      });
    } finally {
      setWorking(false);
      setProgress(0);
    }
  };

  return (
    <ToolPageLayout
      title="PDF to Text"
      subtitle="Extract and download all text content from your PDF files instantly in your browser."
      icon="🔍"
    >
      <SEO
        keywords="pdf to text, extract text from pdf, pdf text converter, pdf to txt"
        title="PDF to Text Online Free — Extract Content Instantly | OM PDF"
        description="Convert your PDF files to plain text locally. Fast, free and 100% private — your documents are processed entirely in your browser."
        url="https://om-pdf.netlify.app/pdf-to-text"
      />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to extract text" hint="Single PDF - Max 200 MB" />
      ) : (
        <div className="split-file-info">
          <div className="split-file-card">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta">
                <span className="file-size">{formatBytes(file.size)}</span>
                <span className="file-pages">{pages ? `${pages} pages` : 'counting…'}</span>
              </div>
            </div>
            <button className="btn-remove" onClick={() => { setFile(null); setSuccess(''); setError(''); setExtractedText(''); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          {extractedText && (
            <div className="split-option-panel" style={{ maxHeight: '300px', overflowY: 'auto', background: '#f9fafb', borderRadius: '8px', padding: '16px', fontSize: '14px', whiteSpace: 'pre-wrap', border: '1px solid #e5e7eb' }}>
              <label className="split-label" style={{ marginBottom: '8px', display: 'block' }}>Preview</label>
              {extractedText.slice(0, 2000)}{extractedText.length > 2000 ? '...' : ''}
            </div>
          )}

          {error && <div className="alert alert-error"><span>! {error}</span></div>}
          <QueuePanel title="File queue" items={queueItems} />
          {working && <ProgressBar pct={progress} label="Extracting Text..." />}

          {success && (
            <SuccessBanner message="Extraction complete!" details={success} onDismiss={() => setSuccess('')}>
              <button
                className="btn-action-sm btn-action-download"
                onClick={() => {
                  const url = URL.createObjectURL(lastBlobRef.current);
                  const a = document.createElement('a');
                  a.href = url; a.download = lastNameRef.current;
                  document.body.appendChild(a); a.click();
                  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
                }}
              >
                Download .txt
              </button>
            </SuccessBanner>
          )}

          <div className="merge-section">
            <button
              className="btn-merge"
              style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}
              onClick={handleExtract}
              disabled={working}
            >
              <span className="btn-merge-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Extract Text
              </span>
            </button>
            <p className="merge-hint">Processed locally - no upload</p>
          </div>
        </div>
      )}

      <RecentFilesPanel tool="text_extract" title="Recent extractions" />
    </ToolPageLayout>
  );
}
