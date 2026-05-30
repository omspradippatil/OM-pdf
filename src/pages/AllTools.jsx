import React from 'react';
import { useExport } from '../context/ExportContext';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { TOOLS } from '../constants/tools';
import '../styles/Home.css'; // Re-use the home grid styles

export default function AllTools() {
  const { triggerExport } = useExport();
  return (
    <div className="home-page" style={{ paddingTop: '80px', minHeight: '100vh' }}>
      <SEO 
        title="All PDF Tools | OM PDF" 
        description="Browse our complete collection of free, offline PDF tools. Merge, split, compress, edit, and more."
        url="https://om-pdf.netlify.app/tools"
      />
      
      <section className="tools-section" aria-label="PDF Tools">
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
              <div
                className="tool-card-icon"
                style={{ background: tool.color + '18', color: tool.color }}
              >
                {tool.icon}
              </div>
              <h3 className="tool-card-title">{tool.title}</h3>
              <p className="tool-card-desc">{tool.desc}</p>
              <span className="tool-card-cta">Use tool →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
