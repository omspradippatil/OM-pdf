import React from 'react';
import { useExport } from '../context/ExportContext';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { TOOLS } from '../constants/tools';
import { useFavorites } from '../hooks/useFavorites';
import ToolCard from '../components/ToolCard';
import '../styles/Home.css';

export default function AllTools() {
  const { favorites, toggleFavorite } = useFavorites();

  const favoriteTools = TOOLS.filter(t => favorites.includes(t.key)).sort((a, b) => favorites.indexOf(a.key) - favorites.indexOf(b.key));
  const otherTools = TOOLS.filter(t => !favorites.includes(t.key));

  const renderToolCard = (tool, isFavorite) => (
    <ToolCard key={tool.key} tool={tool} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
  );

  return (
    <div className="home-page" style={{ paddingTop: '80px', minHeight: '100vh' }}>
      <SEO 
        title="All PDF Tools | OM PDF" 
        description="Browse our complete collection of free, offline PDF tools. Merge, split, compress, edit, and more."
        url="https://om-pdf.pages.dev/tools"
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
