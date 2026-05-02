import React, { useRef } from 'react';
import useSEO from '../hooks/useSEO';
import { Link, useNavigate } from 'react-router-dom';
import { TOOLS } from '../constants/tools';

const FEATURES = [
  { icon: '⚡', title: 'Lightning Fast',    desc: 'No upload delays. Processing runs instantly in your browser.' },
  { icon: '🔒', title: '100% Private',      desc: 'Your files never leave your device. Zero server contact.' },
  { icon: '💰', title: 'Always Free',       desc: 'No subscriptions. No watermarks. No account required.' },
  { icon: '📱', title: 'Works Everywhere',  desc: 'Fully responsive — desktop, tablet, and mobile.' },
];

/* Floating icon in hero illustration */
const FloatIcon = ({ icon, style }) => (
  <div className="float-icon" style={style} aria-hidden="true">{icon}</div>
);

export default function Home() {
  useSEO('OM PDF � Free PDF Tools Online | Merge, Split, Compress, Convert','Merge PDF, split PDF, compress PDF, convert PDF to JPG and add page numbers � all free, private and instant in your browser. No upload. No sign-up.','https://om-pdf.netlify.app/');
  const toolsRef = useRef(null);

  const scrollToTools = (e) => {
    e.preventDefault();
    toolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="home-page">

      {/* ══════════ HERO ══════════ */}
      <section className="home-hero" aria-label="Hero">
        {/* Animated background blobs */}
        <div className="hero-bg-shapes" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>

        <div className="hero-content">
          {/* Left: Headline + CTAs */}
          <div className="hero-left">
            <div className="hero-badge">
              <span className="badge-dot" />
              🔒 100% Local Processing — Zero uploads
            </div>

            <h1 className="hero-title">
              We make PDFs<br />
              <span className="gradient-text">simple, fast &amp; private.</span>
            </h1>

            <p className="hero-subtitle">
              All tools run locally in your browser. No upload required.<br />
              Your files never leave your device — ever.
            </p>

            <div className="hero-ctas">
              <Link to="/merge-pdf" className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="8" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Merge PDF
              </Link>
              <a href="#tools" className="btn-secondary" onClick={scrollToTools}>
                Explore All Tools ↓
              </a>
            </div>

            <div className="hero-trust-bar">
              <div className="trust-chip">✅ No sign-up</div>
              <div className="trust-chip">✅ No watermarks</div>
              <div className="trust-chip">✅ Completely free</div>
            </div>
          </div>

          {/* Right: Animated illustration */}
          <div className="hero-right" aria-hidden="true">
            <div className="hero-illustration">
              <div className="hero-center-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2z"
                    stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <FloatIcon icon="🔗" style={{ top: '8%',   left: '4%',  '--dur': '3.2s', animationDelay: '0s'   }} />
              <FloatIcon icon="✂️" style={{ top: '18%',  right: '6%', '--dur': '2.8s', animationDelay: '0.6s' }} />
              <FloatIcon icon="⚡" style={{ bottom:'18%',left: '8%',  '--dur': '3.5s', animationDelay: '1.0s' }} />
              <FloatIcon icon="🔢" style={{ bottom:'8%', right: '4%', '--dur': '3.0s', animationDelay: '0.3s' }} />
              <FloatIcon icon="🔄" style={{ top: '48%',  left: '0%',  '--dur': '2.6s', animationDelay: '1.4s' }} />
              <FloatIcon icon="📄" style={{ top: '38%',  right: '1%', '--dur': '3.3s', animationDelay: '0.8s' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ ALL TOOLS GRID ══════════ */}
      <section
        id="tools"
        ref={toolsRef}
        className="tools-section"
        aria-label="PDF Tools"
      >
        <div className="section-header">
          <h2 className="section-title">Everything you need for PDFs</h2>
          <p className="section-sub">Professional PDF tools — all free, all private, all local.</p>
        </div>

        <div className="tools-grid">
          {TOOLS.map((tool) => (
            <Link
              key={tool.key}
              to={tool.path}
              className="tool-card"
              style={{ '--card-color': tool.color }}
              aria-label={`Open ${tool.title} tool`}
            >
              <div className="tool-card-icon" style={{ background: tool.color + '18', color: tool.color }}>
                {tool.icon}
              </div>
              <h3 className="tool-card-title">{tool.title}</h3>
              <p className="tool-card-desc">{tool.desc}</p>
              <span className="tool-card-cta">Use tool →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════ PRIVACY COMPARISON ══════════ */}
      <section className="privacy-section" aria-label="Privacy comparison">
        <div className="privacy-inner">
          <h2 className="section-title">Your Privacy is Our Priority</h2>
          <p className="section-sub">Unlike other PDF tools, OM PDF never touches your files on any server.</p>

          <div className="comparison-grid">
            <div className="comparison-col comparison-bad">
              <div className="comparison-col-header">❌ Other Tools</div>
              <ul className="comparison-list">
                <li>Upload files to remote servers</li>
                <li>Files stored in the cloud</li>
                <li>Slow — depends on your internet</li>
                <li>Privacy risk with sensitive documents</li>
                <li>May require account / login</li>
              </ul>
            </div>
            <div className="comparison-col comparison-good">
              <div className="comparison-col-header">✅ OM PDF</div>
              <ul className="comparison-list">
                <li>Everything runs in your browser</li>
                <li>Files never leave your device</li>
                <li>Instant — no upload wait</li>
                <li>100% private, always</li>
                <li>No sign-up, completely free</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ WHY OM PDF ══════════ */}
      <section className="features-section" aria-label="Why choose OM PDF">
        <div className="section-header">
          <h2 className="section-title">Why Choose OM PDF?</h2>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon" aria-hidden="true">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ CTA BANNER ══════════ */}
      <section className="cta-section" aria-label="Call to action">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to work with PDFs?</h2>
          <p className="cta-sub">Free. Private. Instant. No account needed.</p>
          <div className="hero-ctas" style={{ justifyContent: 'center' }}>
            <Link to="/merge-pdf" className="btn-primary">Start Merging →</Link>
            <Link to="/split-pdf" className="btn-secondary">Split PDF</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
