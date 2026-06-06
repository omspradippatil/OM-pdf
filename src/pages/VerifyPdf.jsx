import React, { useState } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';

export default function VerifyPdf() {
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Please select a valid PDF.'); return; }
    
    setFile(f);
    setError('');
    setHash('');
    setCalculating(true);
    
    try {
      const buf = await f.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setHash(hashHex);
    } catch (err) {
      setError('Failed to calculate hash: ' + err.message);
    } finally {
      setCalculating(false);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Verification Details</p>
      
      <div className="ux-option-card selected">
        <div className="ux-option-title">🔒 SHA-256 Checksum</div>
        <div className="ux-option-desc">Calculates the cryptographic hash of the document locally in your browser.</div>
      </div>

      <div style={{ padding: 12, background: 'var(--bg-muted)', borderRadius: 8, marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        If a single bit of the file has been altered since it was signed, the resulting hash will be completely different.
      </div>
    </>
  );

  return (
    <ToolPageLayout
      title="Verify PDF Integrity"
      subtitle="Calculate the SHA-256 cryptographic hash of a PDF to verify it hasn't been tampered with."
      icon="🛡️"
      sidebarContent={sidebarContent}
      actionButton={<div />} // No action needed, calculation is automatic on drop
    >
      <ToolSeoHead toolKey="verifyPdf" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a signed PDF to verify" hint="100% Offline Hash Calculation" />
      ) : (
        <div className="ux-workspace-content">
          <div className="ux-toolbar-inline">
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Integrity Check</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{file.name} ({formatBytes(file.size)})</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => setFile(null)}>
              Check Another File
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 20, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
            {calculating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Calculating SHA-256 Hash...</div>
              </div>
            ) : error ? (
              <div className="alert alert-error"><span>❌ {error}</span></div>
            ) : (
              <div style={{ width: '100%', maxWidth: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#10b98115', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Calculation Complete</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Compare this hash with the original author's receipt.</p>
                  </div>
                </div>
                
                <div style={{ padding: 16, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SHA-256 Hash</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--text-primary)', wordBreak: 'break-all', userSelect: 'all', padding: '12px', background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    {hash}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="verifyPdf" />
    </ToolPageLayout>
  );
}
