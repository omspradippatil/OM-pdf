import React from 'react';

export default function ProgressBar({ pct, label }) {
  return (
    <div className="progress-container" aria-live="polite">
      <div className="progress-info">
        <span className="progress-label">{label || 'Processing…'}</span>
        <span className="progress-pct">{pct}%</span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}
