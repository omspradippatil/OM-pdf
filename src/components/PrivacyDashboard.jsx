import React, { useEffect, useState } from 'react';
import { getPrivacyStats } from '../services/privacyStats';
import '../styles/PrivacyDashboard.css';

export default function PrivacyDashboard() {
  const [stats, setStats] = useState(getPrivacyStats());

  useEffect(() => {
    const onStorage = () => setStats(getPrivacyStats());
    window.addEventListener('storage', onStorage);
    const interval = setInterval(() => setStats(getPrivacyStats()), 2000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="privacy-dashboard">
      <div className="dashboard-stats-grid">
        {/* Jobs completed locally */}
        <div className="dashboard-stat-card">
          <div className="stat-icon" aria-hidden="true">✅</div>
          <div className="stat-value">{stats.localJobs.toLocaleString()}</div>
          <div className="stat-label">Processed Locally</div>
          <div className="privacy-note">Jobs completed on this device</div>
        </div>

        {/* Cloud uploads — always 0 */}
        <div className="dashboard-stat-card bad-stat">
          <div className="stat-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="stat-value">{stats.cloudUploads.toLocaleString()}</div>
          <div className="stat-label">Server Uploads</div>
          <div className="privacy-note">We never auto-upload</div>
        </div>

        {/* Drive saves — user triggered */}
        <div className="dashboard-stat-card info-stat">
          <div className="stat-icon" aria-hidden="true">💾</div>
          <div className="stat-value">{stats.driveUploads.toLocaleString()}</div>
          <div className="stat-label">Saved to Drive</div>
          <div className="privacy-note">User-triggered saves only</div>
        </div>
      </div>
    </div>
  );
}
