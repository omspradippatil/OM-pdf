import React from 'react';
import { useExport } from '../context/ExportContext';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { TOOLS } from '../constants/tools';
import { useFavorites } from '../hooks/useFavorites';
import '../styles/Home.css';

export default function AllTools() {
  const { favorites, toggleFavorite } = useFavorites();

  const favoriteTools = TOOLS.filter(t => favorites.includes(t.key)).sort((a, b) => favorites.indexOf(a.key) - favorites.indexOf(b.key));
  const otherTools = TOOLS.filter(t => !favorites.includes(t.key));

  const renderToolCard = (tool, isFavorite) => (
    <Link
      key={tool.key}
      to={tool.path}
      className="tool-card"
      style={{ '--card-color': tool.color, position: 'relative' }}
      aria-label={`Open ${tool.title} tool`}
    >
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(tool.key); }}
        className="tool-fav-btn"
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        style={{
          position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', 
          cursor: 'pointer', fontSize: '1.2rem', padding: '4px', opacity: isFavorite ? 1 : 0.4,
          transition: 'all 0.2s', zIndex: 2
        }}
      >
        {isFavorite ? '⭐️' : '☆'}
      </button>
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
  );

  return (
    <div className="home-page" style={{ paddingTop: '80px', minHeight: '100vh' }}>
      <SEO 
        title="All PDF Tools | OM PDF" 
        description="Browse our complete collection of free, offline PDF tools. Merge, split, compress, edit, and more."
        url="https://om-pdf.netlify.app/tools"
      />
      
      {favoriteTools.length > 0 && (
        <section className="tools-section" style={{ paddingBottom: '0' }}>
          <div className="section-header">
            <h2 className="section-title">Your Favorites</h2>
          </div>
          <div className="tools-grid">
            {favoriteTools.map(t => renderToolCard(t, true))}
          </div>
        </section>
      )}

      <section className="tools-section" aria-label="PDF Tools">
        <div className="section-header">
          <h2 className="section-title">Everything you need for PDFs</h2>
          <p className="section-sub">Professional PDF tools — all free, all private, all local.</p>
        </div>

        <div className="tools-grid">
          {otherTools.map(t => renderToolCard(t, false))}
        </div>
      </section>
    </div>
  );
}
