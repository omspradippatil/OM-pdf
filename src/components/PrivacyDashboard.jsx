import React, { useEffect, useState } from 'react';
import { getPrivacyStats } from '../services/privacyStats';

export default function PrivacyDashboard() {
  const [stats, setStats] = useState(getPrivacyStats());

  useEffect(() => {
    // Keep it live syncing with storage
    const onStorage = () => setStats(getPrivacyStats());
    window.addEventListener('storage', onStorage);
    
    // Also poll every 2 seconds for local updates that might not trigger 'storage' event in the same tab
    const interval = setInterval(() => {
      setStats(getPrivacyStats());
    }, 2000);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="privacy-dashboard">
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.localJobs.toLocaleString()}</div>
          <div className="stat-label">Processed Locally</div>
          <div className="privacy-note">Jobs completed on this device</div>
        </div>
        
        <div className="dashboard-stat-card bad-stat">
          <div className="stat-icon">☁️</div>
          <div className="stat-value">{stats.cloudUploads.toLocaleString()}</div>
          <div className="stat-label">Server Uploads</div>
          <div className="privacy-note">We never auto-upload</div>
        </div>
        
        <div className="dashboard-stat-card info-stat">
          <div className="stat-icon">💾</div>
          <div className="stat-value">{stats.driveUploads.toLocaleString()}</div>
          <div className="stat-label">Saved to Drive</div>
          <div className="privacy-note">User-triggered saves only</div>
        </div>
      </div>
    </div>
  );
}
