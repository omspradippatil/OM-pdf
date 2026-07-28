import React from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../constants/tools';

// Pure SVG Icon components to ensure 0-dependency build success
const GitHubIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedInIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
  </svg>
);

const GlobeIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const MailIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ShieldIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ZapIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const LockIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const FileIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const MessageIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const HeartIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-v2">
      <style>{`
        .footer-os-section {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
        .os-badge-v2 {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          background: rgba(37, 99, 235, 0.1) !important;
          color: var(--primary) !important;
          padding: 6px 12px !important;
          border-radius: 100px !important;
          font-size: 0.8rem !important;
          font-weight: 700 !important;
          text-decoration: none !important;
          transition: all 0.2s !important;
        }
        .os-badge-v2:hover {
          background: var(--primary) !important;
          color: white !important;
          transform: translateY(-2px) !important;
        }
        .support-badge-v2 {
          background: rgba(236, 72, 153, 0.1) !important;
          color: #be185d !important;
        }
        .support-badge-v2:hover {
          background: #ec4899 !important;
          color: white !important;
        }
      `}</style>
      <div className="footer-v2-container">
        <div className="footer-v2-main">
          <div className="footer-v2-brand">
            <Link to="/" className="brand-wrap">
              <div className="brand-logo-v2">
                <FileIcon size={24} />
              </div>
              <span className="brand-text-v2">OM <span>PDF</span></span>
            </Link>
            <p className="brand-tagline">
              Premium, client-side PDF tools designed for ultimate privacy and speed. Your data never leaves your browser.
            </p>
            <div className="creator-badge" style={{ marginBottom: 24 }}>
              <span className="creator-label">Designed & Developed by</span>
              <a href="https://om-patil.com" target="_blank" rel="noopener noreferrer" className="creator-name">OM Patil</a>
            </div>
            
            <div className="footer-os-section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="https://github.com/omspradippatil/OM-pdf" target="_blank" rel="noopener noreferrer" className="os-badge-v2">
                <GitHubIcon size={16} />
                <span>Contribute on GitHub</span>
              </a>
              <a href="https://om-patil.com/donate" target="_blank" rel="noopener noreferrer" className="os-badge-v2 support-badge-v2">
                <HeartIcon size={16} />
                <span>Support Project</span>
              </a>
            </div>
          </div>

          <div className="footer-v2-links">
            <h3 className="footer-v2-title">Popular Tools</h3>
            <div className="footer-tools-grid">
              {TOOLS.slice(0, 8).map(tool => (
                <Link key={tool.key} to={tool.path} className="footer-tool-link">
                  {tool.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="footer-v2-links">
            <div style={{ marginBottom: 40 }}>
              <h3 className="footer-v2-title">Company</h3>
              <div className="footer-tools-grid">
                <Link to="/about" className="footer-tool-link">About</Link>
                <Link to="/privacy" className="footer-tool-link">Privacy</Link>
                <Link to="/how-it-works" className="footer-tool-link">How It Works</Link>
                <Link to="/blog" className="footer-tool-link">Blog</Link>
                <Link to="/feedback" className="footer-tool-link" style={{ fontWeight: 700, color: 'var(--primary)' }}>Feedback</Link>
              </div>
            </div>

            <h3 className="footer-v2-title">Connect</h3>
            <div className="social-grid-v2">
              <a href="https://github.com/omspradippatil" target="_blank" rel="noopener noreferrer" className="social-card">
                <div className="social-icon-box">
                  <GitHubIcon size={20} />
                </div>
                <span className="social-label">GitHub</span>
              </a>
              <a href="https://in.linkedin.com/in/om-pradip-patil" target="_blank" rel="noopener noreferrer" className="social-card">
                <div className="social-icon-box">
                  <LinkedInIcon size={20} />
                </div>
                <span className="social-label">LinkedIn</span>
              </a>
              <Link to="/feedback" className="social-card">
                <div className="social-icon-box" style={{ background: 'var(--primary)', color: 'white' }}>
                  <MessageIcon size={20} />
                </div>
                <span className="social-label">Feedback</span>
              </Link>
              <a href="mailto:omspradippatil@gmail.com" className="social-card">
                <div className="social-icon-box">
                  <MailIcon size={20} />
                </div>
                <span className="social-label">Email</span>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-v2-bottom">
          <div className="bottom-left">
            <p>© {currentYear} OM PDF. Built by <strong>OM Patil</strong>.</p>
          </div>
          <div className="bottom-right">
            <div className="trust-badges">
              <span className="trust-badge">
                <ShieldIcon size={16} /> 100% Private
              </span>
              <span className="trust-badge">
                <ZapIcon size={16} /> No Uploads
              </span>
              <span className="trust-badge">
                <LockIcon size={16} /> AES-256
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
