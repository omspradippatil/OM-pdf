import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="ux-tool-page" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 'calc(100vh - 64px - 200px)' }}>
      <SEO 
        title="404 - Page Not Found | OM PDF" 
        description="The page you are looking for does not exist." 
        noindex={true}
      />
      
      <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '48px',
          maxWidth: '500px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
        }}>
          <h1 style={{ fontSize: '8rem', fontWeight: 900, color: 'var(--primary)', margin: 0, lineHeight: 1 }}>404</h1>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 16, marginBottom: 8 }}>Page Not Found</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Oops! The page you're looking for doesn't exist, has been moved, or is temporarily unavailable.
          </p>
          <Link to="/" className="ux-btn-primary" style={{ display: 'inline-flex', width: 'auto', padding: '14px 28px', fontSize: '1rem', textDecoration: 'none', borderRadius: '12px' }}>
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
