import React from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../constants/tools';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">

        {/* Brand */}
        <div className="footer-brand">
          <Link to="/" className="nav-brand" aria-label="OM PDF Home">
            <div className="brand-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="brand-name">OM <span>PDF</span></span>
          </Link>
          <p className="footer-tagline">Simple. Fast. Private PDF tools.</p>
          <p className="footer-privacy">🔒 All files processed locally — never uploaded</p>
        </div>

        {/* Tools links */}
        <div className="footer-links-section">
          <h4 className="footer-heading">Tools</h4>
          <ul className="footer-list">
            {TOOLS.map(t => (
              <li key={t.key}>
                <Link to={t.path} className="footer-link">
                  {t.icon} {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Project links */}
        <div className="footer-links-section">
          <h4 className="footer-heading">Project</h4>
          <ul className="footer-list">
            <li>
              <a
                href="https://github.com/omspradippatil/OM-pdf"
                className="footer-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub (Open Source)
              </a>
            </li>
            <li>
              <a
                href="https://om-pdf.netlify.app"
                className="footer-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Live Site
              </a>
            </li>
            <li>
              <Link to="/my-files" className="footer-link">
                ☁️ My Cloud Files
              </Link>
            </li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom">
        <p>Built with ❤️ by <strong>OM Patil</strong> · Open Source</p>
        <p className="footer-sub">All PDF processing happens locally in your browser. Your files are completely private.</p>
      </div>
    </footer>
  );
}
