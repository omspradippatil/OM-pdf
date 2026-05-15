import React from 'react';
import { getToolContent } from '../constants/toolContent';

export default function ToolSeoContent({ toolKey }) {
  const content = getToolContent(toolKey);
  if (!content) return null;

  return (
    <section className="tool-seo-content" aria-label={`${content.name} details`}>
      <div className="tool-seo-header">
        <h2>{content.name} Guide and FAQs</h2>
        <p className="tool-seo-subtitle">
          Fast, local, and private PDF processing with clear steps and answers.
        </p>
      </div>

      <div className="tool-seo-grid">
        {content.sections.map((section) => (
          <div className="tool-seo-card" key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </div>
        ))}
      </div>

      <div className="tool-faq">
        <h3>Frequently Asked Questions</h3>
        <div className="tool-faq-list">
          {content.faqs.map((item) => (
            <div className="tool-faq-item" key={item.q}>
              <h4>{item.q}</h4>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
