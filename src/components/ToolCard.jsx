import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionLink = motion.create(Link);

export default function ToolCard({ tool, isFavorite, toggleFavorite }) {
  return (
    <MotionLink
      to={tool.path}
      className="tool-card"
      style={{ '--card-color': tool.color, position: 'relative', originY: 1 }}
      aria-label={`Open ${tool.title} tool`}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
      <div className="tool-card-icon" style={{ background: tool.color + '18', color: tool.color }}>
        {tool.icon}
      </div>
      <h3 className="tool-card-title">{tool.title}</h3>
      <p className="tool-card-desc">{tool.desc}</p>
      <span className="tool-card-cta">Use tool →</span>
    </MotionLink>
  );
}
