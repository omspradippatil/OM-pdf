import { Link } from 'react-router-dom';
import { getToolContent } from '../constants/toolContent';
import { TOOLS } from '../constants/tools';

export default function ToolSeoContent({ toolKey }) {
  const content = getToolContent(toolKey);
  if (!content) return null;

  // Select related tools from the same category or general popular tools
  const currentTool = TOOLS.find(t => t.key === toolKey || t.path.includes(toolKey));
  const relatedTools = TOOLS.filter(t => t.key !== currentTool?.key && (currentTool ? t.category === currentTool.category : true)).slice(0, 4);

  return (
    <section className="tool-seo-content" aria-label={`${content.name} comprehensive guide`}>
      <div className="tool-seo-header">
        <h2>{content.name} — Complete Free Guide</h2>
        <p className="tool-seo-subtitle">
          {content.headline || "Fast, local, and private in-browser PDF processing with zero uploads."}
        </p>
      </div>

      {content.description && (
        <div className="tool-seo-lead" style={{ marginTop: 16, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.98rem' }}>
          <p>{content.description}</p>
        </div>
      )}

      {/* Syntax Guide (for tools like merge-with-ranges) */}
      {content.syntaxGuide && (
        <div className="tool-syntax-box" style={{ marginTop: 24, padding: 18, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 10, color: 'var(--text-primary)' }}>{content.syntaxGuide.title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 12 }}>
            {content.syntaxGuide.examples.map((ex, idx) => (
              <div key={idx} style={{ padding: 10, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <code style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                  {ex.syntax}
                </code>
                <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{ex.desc}</p>
              </div>
            ))}
          </div>
          {content.syntaxGuide.tip && (
            <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              💡 Tip: {content.syntaxGuide.tip}
            </p>
          )}
        </div>
      )}

      {/* How To Steps */}
      {content.howTo && content.howTo.length > 0 && (
        <div className="tool-howto-section" style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>How to use {content.name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {content.howTo.map((step, idx) => (
              <div key={idx} style={{ padding: 16, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', marginBottom: 10 }}>
                  {idx + 1}
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.98rem' }}>{step.title}</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Use Cases */}
      {content.useCases && content.useCases.length > 0 && (
        <div className="tool-usecases-section" style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Practical Use Cases</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {content.useCases.map((uc, idx) => (
              <div key={idx} style={{ padding: 14, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>{uc.title}</h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{uc.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Feature Sections */}
      {content.sections && content.sections.length > 0 && (
        <div className="tool-seo-grid" style={{ marginTop: 28 }}>
          {content.sections.map((section) => (
            <div className="tool-seo-card" key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Visible FAQs matching FAQPage Schema */}
      {content.faqs && content.faqs.length > 0 && (
        <div className="tool-faq" style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Frequently Asked Questions</h3>
          <div className="tool-faq-list">
            {content.faqs.map((faq, index) => (
              <div className="tool-faq-item" key={index}>
                <h4>{faq.q}</h4>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zero Upload Privacy Guarantee */}
      <div style={{ marginTop: 30, padding: 18, background: 'rgba(37, 99, 235, 0.05)', borderRadius: 12, border: '1px solid rgba(37, 99, 235, 0.15)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.6rem' }}>🔒</span>
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--primary)' }}>Zero-Upload Security Guarantee</h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            All operations in OM PDF run locally in your web browser using WebAssembly. Your files are never uploaded to any remote server or stored in the cloud, guaranteeing total data security for confidential documents.
          </p>
        </div>
      </div>

      {/* Related Tools Interlinking */}
      {relatedTools.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Related PDF Tools</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {relatedTools.map(t => (
              <Link
                key={t.key}
                to={t.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{t.icon}</span>
                <span>{t.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
