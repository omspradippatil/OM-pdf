import { Link } from 'react-router-dom';

// Pure SVG Icon components
const GitHubIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedInIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
  </svg>
);

const MailIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ShieldIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ZapIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const LockIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const FileIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const MessageIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-v2">
      <div className="footer-v2-container">
        <div className="footer-v2-main">
          {/* Brand Col */}
          <div className="footer-v2-brand">
            <Link to="/" className="brand-wrap">
              <div className="brand-logo-v2">
                <FileIcon size={16} />
              </div>
              <span className="brand-text-v2">OM PDF</span>
            </Link>
            <p className="brand-tagline">
              100% private, client-side PDF tools. No cloud uploads, zero data storage.
            </p>
            <div className="creator-badge">
              <span>By </span>
              <a href="https://om-patil.com" target="_blank" rel="noopener noreferrer" className="creator-name">OM Patil</a>
            </div>
            
            <div className="footer-social-icons">
              <a href="https://github.com/omspradippatil/OM-pdf" target="_blank" rel="noopener noreferrer" className="footer-icon-btn" title="GitHub Repository" aria-label="GitHub">
                <GitHubIcon size={15} />
              </a>
              <a href="https://in.linkedin.com/in/om-pradip-patil" target="_blank" rel="noopener noreferrer" className="footer-icon-btn" title="LinkedIn Profile" aria-label="LinkedIn">
                <LinkedInIcon size={15} />
              </a>
              <Link to="/feedback" className="footer-icon-btn" title="Send Feedback" aria-label="Feedback">
                <MessageIcon size={15} />
              </Link>
              <a href="mailto:omspradippatil@gmail.com" className="footer-icon-btn" title="Contact Email" aria-label="Email">
                <MailIcon size={15} />
              </a>
            </div>
          </div>

          {/* Col 1: Organize & Pages */}
          <div className="footer-v2-links">
            <h3 className="footer-v2-title">Organize</h3>
            <div className="footer-links-list">
              <Link to="/merge-pdf" className="footer-tool-link">Merge PDF</Link>
              <Link to="/merge-with-ranges" className="footer-tool-link">Merge with Ranges</Link>
              <Link to="/split-pdf" className="footer-tool-link">Split PDF</Link>
              <Link to="/split-by-size" className="footer-tool-link">Split by Size</Link>
              <Link to="/extract-pages" className="footer-tool-link">Extract Pages</Link>
              <Link to="/organize-pdf" className="footer-tool-link">Organize PDF</Link>
              <Link to="/remove-empty-pages" className="footer-tool-link">Remove Blank Pages</Link>
              <Link to="/auto-rotate-deskew" className="footer-tool-link">Auto Rotate & Deskew</Link>
            </div>
          </div>

          {/* Col 2: Convert & Edit */}
          <div className="footer-v2-links">
            <h3 className="footer-v2-title">Convert & Edit</h3>
            <div className="footer-links-list">
              <Link to="/compress-pdf" className="footer-tool-link">Compress PDF</Link>
              <Link to="/pdf-to-word" className="footer-tool-link">PDF to Word</Link>
              <Link to="/pdf-to-jpg" className="footer-tool-link">PDF to JPG</Link>
              <Link to="/image-to-pdf" className="footer-tool-link">Image to PDF</Link>
              <Link to="/pdf-to-pptx" className="footer-tool-link">PDF to PPTX</Link>
              <Link to="/ocr-pdf" className="footer-tool-link">Offline OCR</Link>
              <Link to="/excel-pdf" className="footer-tool-link">Excel to PDF</Link>
              <Link to="/chat-pdf" className="footer-tool-link" style={{ fontWeight: 600, color: 'var(--primary)' }}>Chat with PDF (AI)</Link>
            </div>
          </div>

          {/* Col 3: Security & Legal */}
          <div className="footer-v2-links">
            <h3 className="footer-v2-title">Security & Legal</h3>
            <div className="footer-links-list">
              <Link to="/protect-pdf" className="footer-tool-link">Protect (AES-256)</Link>
              <Link to="/unlock-pdf" className="footer-tool-link">Unlock PDF</Link>
              <Link to="/draw-sign-pdf" className="footer-tool-link">E-Sign PDF</Link>
              <Link to="/redact-pdf" className="footer-tool-link">Redact PDF</Link>
              <Link to="/sanitize-metadata" className="footer-tool-link">Sanitize Metadata</Link>
              <Link to="/flatten-forms" className="footer-tool-link">Flatten Forms</Link>
              <Link to="/bates-numbering-pdf" className="footer-tool-link">Bates Numbering</Link>
              <Link to="/tools" className="footer-tool-link" style={{ fontWeight: 700, color: 'var(--primary)' }}>All 45+ Tools →</Link>
            </div>
          </div>

          {/* Col 4: Alternatives & Info */}
          <div className="footer-v2-links">
            <h3 className="footer-v2-title">Alternatives & Info</h3>
            <div className="footer-links-list">
              <Link to="/ilovepdf-alternative" className="footer-tool-link" style={{ fontWeight: 600, color: 'var(--primary)' }}>iLovePDF Alternative</Link>
              <Link to="/smallpdf-alternative" className="footer-tool-link" style={{ fontWeight: 600, color: 'var(--primary)' }}>Smallpdf Alternative</Link>
              <Link to="/blog" className="footer-tool-link">Blog & Guides</Link>
              <Link to="/about" className="footer-tool-link">About OM PDF</Link>
              <Link to="/privacy" className="footer-tool-link">Privacy Guarantee</Link>
              <Link to="/how-it-works" className="footer-tool-link">How It Works</Link>
              <Link to="/feedback" className="footer-tool-link">Feedback</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-v2-bottom">
          <div className="bottom-left">
            <p>© {currentYear} OM PDF · Built by <strong>OM Patil</strong></p>
          </div>
          <div className="bottom-right">
            <div className="trust-badges">
              <span className="trust-badge">
                <ShieldIcon size={13} /> 100% Private
              </span>
              <span className="trust-badge">
                <ZapIcon size={13} /> Zero Uploads
              </span>
              <span className="trust-badge">
                <LockIcon size={13} /> AES-256
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
