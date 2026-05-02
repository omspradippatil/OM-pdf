import React from 'react';

export default function ToolPageLayout({ icon, title, subtitle, children }) {
  return (
    <div className="tool-page">
      <div className="tool-page-hero">
        <div className="tool-page-hero-icon">{icon}</div>
        <h1 className="tool-page-title">{title}</h1>
        {subtitle && <p className="tool-page-subtitle">{subtitle}</p>}
        <div className="tool-privacy-badge">🔒 100% Local Processing — Files never leave your device</div>
      </div>
      <div className="app-container tool-page-content">
        {children}
      </div>
    </div>
  );
}
