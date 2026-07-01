import React, { useRef } from 'react';
import { useExport } from '../context/ExportContext';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import PrivacyDashboard from '../components/PrivacyDashboard';
import { useFavorites } from '../hooks/useFavorites';
import { TOOLS } from '../constants/tools';
import ToolCard from '../components/ToolCard';
import '../styles/Home.css';

const FEATURES = [
  { icon: '⚡', title: 'Lightning Fast',    desc: 'No upload delays. Processing runs instantly in your browser.' },
  { icon: '🔒', title: '100% Private',      desc: 'Your files never leave your device. Zero server contact.' },
  { icon: '💰', title: 'Always Free',       desc: 'No subscriptions. No watermarks. No account required.' },
  { icon: '📱', title: 'Works Everywhere',  desc: 'Fully responsive — desktop, tablet, and mobile.' },
  { icon: '✅', title: 'No Watermarks',     desc: 'Clean output files with no forced branding.' },
  { icon: '⚙️', title: 'All-in-One Suite',  desc: 'Merge, split, rotate, compress, and more in one place.' },
];

const FloatIcon = ({ icon, style }) => (
  <div className="float-icon" style={style} aria-hidden="true">{icon}</div>
);

export default function Home() {
  const { favorites, toggleFavorite } = useFavorites();
  const favoriteTools = TOOLS.filter(t => favorites.includes(t.key)).sort((a, b) => favorites.indexOf(a.key) - favorites.indexOf(b.key));

  const renderToolCard = (tool, isFavorite) => (
    <ToolCard key={tool.key} tool={tool} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
  );

  return (
    <div className="home-page">
      <SEO
        keywords="pdf to jpg, convert pdf to image, extract images from pdf, pdf to jpeg, high quality pdf conversion"
        title="Free PDF Tools Online | Merge, Split, Compress, Convert"
        description="Merge PDF, split PDF, compress PDF, convert PDF to JPG and add page numbers — all free, private and instant in your browser. No upload. No sign-up."
        url="https://om-pdf.netlify.app/"
      />

      {/* ══════════ HERO ══════════ */}
      <section className="home-hero" aria-label="Hero">
        <div className="hero-bg-shapes" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>

        <div className="hero-content">
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="8" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Merge PDF
              </Link>
              <Link to="/tools" className="btn-secondary">
                Explore All Tools →
              </Link>
            </div>

            <div className="hero-trust-bar">
              <div className="trust-chip">✅ No sign-up</div>
              <div className="trust-chip">✅ No watermarks</div>
              <div className="trust-chip">✅ Completely free</div>
            </div>
          </div>

          <div className="hero-right" aria-hidden="true">
            <div className="hero-illustration">
              <div className="hero-center-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
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

      {/* ══════════ FAVORITES ══════════ */}
      {favoriteTools.length > 0 && (
        <section className="tools-section" style={{ paddingBottom: '0', paddingTop: '40px' }}>
          <div className="section-header">
            <h2 className="section-title">Your Favorite Tools</h2>
          </div>
          <div className="tools-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
            {favoriteTools.map(t => renderToolCard(t, true))}
          </div>
        </section>
      )}

      {/* ══════════ PRIVACY COMPARISON ══════════ */}
      <section className="privacy-section" aria-label="Privacy comparison">
        <div className="privacy-inner">
          <h2 className="section-title">Your Privacy is Our Priority</h2>
          <p className="section-sub" style={{ marginBottom: 36 }}>Unlike other PDF tools, OM PDF never touches your files on any server.</p>

          <PrivacyDashboard />

          <div className="comparison-grid" style={{ marginTop: 32 }}>
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

      {/* ══════════ SEO CONTENT & FAQ ══════════ */}
      <section className="seo-content-section" aria-label="About OM PDF">
        <div className="seo-inner">
          <article className="seo-article">
            <h2>The Privacy-First Online PDF Editor</h2>
            <p>Welcome to OM PDF, the ultimate suite of free PDF tools designed with your privacy in mind. Whether you need to <strong>merge PDF files</strong>, <strong>split PDF pages</strong>, <strong>compress PDF documents</strong>, or <strong>convert PDF to JPG</strong>, our platform offers lightning-fast solutions without compromising your data security.</p>
            <h3>100% Local Processing: No Uploads Required</h3>
            <p>Unlike traditional online PDF editors that force you to upload sensitive documents to remote cloud servers, OM PDF leverages advanced browser technologies like WebAssembly. This means every action — from rotating pages to lossless compression — happens locally on your device. Your files are never uploaded, ensuring absolute privacy and eliminating wait times.</p>
            <h3>Secure, Fast, and Free PDF Tools</h3>
            <p>We believe essential document management should be accessible to everyone. That's why OM PDF offers premium features like drag-and-drop page reordering, offline Progressive Web App (PWA) support, and high-quality image extraction completely free of charge. No watermarks, no account registration, and no limits.</p>
          </article>

          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-grid">
              <div className="faq-item">
                <h3>Is OM PDF free?</h3>
                <p>Yes, OM PDF is completely free to use. There are no hidden fees, no subscriptions, and no sign-up required.</p>
              </div>
              <div className="faq-item">
                <h3>Are my PDF files uploaded to a server?</h3>
                <p>No. OM PDF processes all your files entirely locally inside your browser. Your files never leave your device.</p>
              </div>
              <div className="faq-item">
                <h3>Is OM PDF secure?</h3>
                <p>Absolutely. Because of our zero-upload architecture, there is no risk of your sensitive documents being stored on remote servers.</p>
              </div>
              <div className="faq-item">
                <h3>Does OM PDF work offline?</h3>
                <p>Yes! You can install OM PDF as a Progressive Web App (PWA) on your desktop or mobile device to merge and split PDFs without an internet connection.</p>
              </div>
            </div>
          </div>
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
