import React from 'react';

export default function SuccessBanner({ message, details, onDismiss, children }) {
  return (
    <div className="success-banner" role="status" aria-live="polite">
      <div className="success-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <polyline points="9 12 11 14 15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="success-text">
        <strong>{message}</strong>
        {details && <span>{details}</span>}
      </div>
      <div className="success-actions">
        {children}
      </div>
      <button className="success-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
