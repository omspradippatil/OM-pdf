import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import '../styles/CompetitorAlternative.css';

const COMPETITOR_DATA = {
  ilovepdf: {
    name: 'iLovePDF',
    slug: 'ilovepdf-alternative',
    title: 'Best Free iLovePDF Alternative (100% Private, Zero Uploads) | OM PDF',
    description: 'Looking for a private iLovePDF alternative? OM PDF processes all files 100% locally in your browser with no file size limits, zero uploads, and no sign-up.',
    headline: 'The 100% Private, Zero-Upload Alternative to iLovePDF',
    subheadline: 'Process PDFs directly on your device without uploading confidential documents to remote cloud servers. Completely free, no task limits, and fully offline.',
    features: [
      { feature: 'Data Privacy & Security', om: '✅ 100% In-Browser (Zero Server Uploads)', comp: '❌ Uploads all files to remote cloud' },
      { feature: 'Daily Task Limits', om: '✅ Unlimited Tasks Forever', comp: '❌ Limited tasks on free tier' },
      { feature: 'File Size Limits', om: '✅ Up to 200 MB Free', comp: '❌ 15 MB - 25 MB max on free tier' },
      { feature: 'Offline PWA Support', om: '✅ Works 100% Offline (No Internet needed)', comp: '❌ Requires active internet connection' },
      { feature: 'Account / Registration', om: '✅ No Account or Sign-Up Needed', comp: '❌ Nag screens to sign up or subscribe' },
      { feature: 'Watermarks', om: '✅ 100% Clean (Zero Forced Watermarks)', comp: '❌ Some premium tools watermark output' },
      { feature: 'Local WebGPU AI Chat', om: '✅ Local AI runs on device GPU', comp: '❌ Cloud AI uploads document text' },
    ],
    faqs: [
      {
        q: 'Why is OM PDF a safer alternative to iLovePDF?',
        a: 'Unlike iLovePDF, which requires you to upload your sensitive contracts, tax records, and bank statements to remote cloud servers, OM PDF processes everything directly on your computer or phone using WebAssembly. Your files never touch a server.'
      },
      {
        q: 'Does OM PDF have daily usage limits like iLovePDF?',
        a: 'No. OM PDF has zero task limits. You can merge, split, compress, sign, and convert as many documents as you need every single day for free.'
      },
      {
        q: 'Can I use OM PDF without an internet connection?',
        a: 'Yes! You can install OM PDF as a Progressive Web App (PWA) on your Mac, Windows PC, iPhone, or Android device to edit PDFs offline anywhere.'
      }
    ]
  },
  smallpdf: {
    name: 'Smallpdf',
    slug: 'smallpdf-alternative',
    title: 'Best Free Smallpdf Alternative with No Limits & Zero Uploads | OM PDF',
    description: 'Tired of Smallpdf daily limits and paywalls? Switch to OM PDF — the free, open, and 100% private browser-based PDF suite.',
    headline: 'The Free, Unlimited Alternative to Smallpdf',
    subheadline: 'No 2-task daily limits, no paywalls, and no cloud uploads. Fast, secure, and private PDF editing that runs directly in your browser.',
    features: [
      { feature: 'Free Daily Usage', om: '✅ Unlimited Documents (No 2-task limit)', comp: '❌ Strict 2 tasks per day on free tier' },
      { feature: 'Server Storage Risk', om: '✅ Zero Uploads (Processed locally)', comp: '❌ Stored on third-party cloud servers' },
      { feature: 'Paywalls & Subscriptions', om: '✅ 100% Free Core Tools', comp: '❌ Constant upgrade prompts & paywalls' },
      { feature: 'Offline Capability', om: '✅ Native PWA Offline Mode', comp: '❌ Web app requires active internet' },
      { feature: 'Client-Side OCR & Conversion', om: '✅ Offline Tesseract OCR & Word export', comp: '❌ Premium paywall for OCR' },
      { feature: 'Document Signing', om: '✅ Draw, Type, & Stamp Signatures', comp: '❌ Limited signatures on free tier' },
    ],
    faqs: [
      {
        q: 'Is OM PDF completely free compared to Smallpdf?',
        a: 'Yes. Smallpdf restricts free users to only 2 document tasks per day before demanding a paid subscription. OM PDF provides unlimited processing completely free.'
      },
      {
        q: 'Do my files get uploaded to the cloud with OM PDF?',
        a: 'No. OM PDF executes all PDF manipulation routines in client-side WebAssembly. No files or document contents are ever transmitted over the network.'
      },
      {
        q: 'What tools are included in OM PDF?',
        a: 'OM PDF includes over 45+ tools including Merge, Split by Size/Bookmarks, Lossless Compression, E-Sign, Drawing Signatures, PDF to Word, Offline OCR, Page Numbering, Watermarking, and Local AI Chat.'
      }
    ]
  }
};

const TOP_TOOLS = [
  { name: 'Merge PDF', icon: '📑', path: '/merge-pdf', desc: 'Combine multiple PDF files in any order.' },
  { name: 'Compress PDF', icon: '🗜️', path: '/compress-pdf', desc: 'Shrink PDF file size up to 85% locally.' },
  { name: 'Split PDF', icon: '✂️', path: '/split-pdf', desc: 'Extract specific pages or split by page ranges.' },
  { name: 'E-Sign & Draw', icon: '✍️', path: '/draw-sign-pdf', desc: 'Sign documents electronically with zero upload.' },
  { name: 'PDF to Word', icon: '📝', path: '/pdf-to-word', desc: 'Convert PDF files into editable DOCX format.' },
  { name: 'Offline OCR', icon: '🔍', path: '/ocr-pdf', desc: 'Convert scanned images to searchable text.' },
];

export default function CompetitorAlternative({ competitor = 'ilovepdf' }) {
  const data = COMPETITOR_DATA[competitor] || COMPETITOR_DATA.ilovepdf;

  const canonicalUrl = `https://om-pdf.netlify.app/${data.slug}`;

  // Structured Data Schema (WebApplication, BreadcrumbList, FAQPage)
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": `OM PDF - ${data.name} Alternative`,
      "url": canonicalUrl,
      "description": data.description,
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "All",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://om-pdf.netlify.app/" },
        { "@type": "ListItem", "position": 2, "name": `${data.name} Alternative`, "item": canonicalUrl }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": data.faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a }
      }))
    }
  ];

  return (
    <div className="alt-page-container">
      <SEO
        title={data.title}
        description={data.description}
        url={canonicalUrl}
        keywords={`${data.name.toLowerCase()} alternative, free ${data.name.toLowerCase()} alternative, offline pdf editor, private pdf tools, no upload pdf merger, unlimited pdf compress`}
        schema={schemas}
      />

      {/* Hero */}
      <section className="alt-hero">
        <div className="alt-badge">
          🛡️ Privacy First • Zero Cloud Uploads
        </div>
        <h1 className="alt-title">{data.headline}</h1>
        <p className="alt-subtitle">{data.subheadline}</p>
        <div className="alt-hero-ctas">
          <Link to="/tools" className="btn-primary">
            Explore All 45+ Tools →
          </Link>
          <Link to="/merge-pdf" className="btn-secondary">
            Try Merge PDF Free
          </Link>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="alt-matrix-section">
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>
          OM PDF vs {data.name}: Direct Comparison
        </h2>
        <div className="alt-matrix-table-wrap">
          <table className="alt-matrix-table">
            <thead>
              <tr>
                <th>Feature / Capability</th>
                <th className="om-col">OM PDF (Local)</th>
                <th>{data.name} (Cloud)</th>
              </tr>
            </thead>
            <tbody>
              {data.features.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.feature}</td>
                  <td className="om-col">{item.om}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.comp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Popular Tools */}
      <section style={{ margin: '60px 0' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>
          Start Using Free, Private PDF Tools Today
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 28 }}>
          No file uploads, no sign-ups, no daily caps. Select any tool below to begin.
        </p>
        <div className="alt-tools-grid">
          {TOP_TOOLS.map(t => (
            <Link key={t.path} to={t.path} className="alt-tool-card">
              <span className="alt-tool-icon">{t.icon}</span>
              <span className="alt-tool-name">{t.name}</span>
              <span className="alt-tool-desc">{t.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section style={{ margin: '60px 0' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 24, textAlign: 'center' }}>
          Frequently Asked Questions
        </h2>
        <div>
          {data.faqs.map((faq, idx) => (
            <div key={idx} className="alt-faq-item">
              <h3 className="alt-faq-q">{faq.q}</h3>
              <p className="alt-faq-a">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
