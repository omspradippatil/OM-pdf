import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
    }
  }, [user]);

  if (user === undefined) return null; // loading auth
  if (user === null) return <Navigate to="/" replace />; // not logged in

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updateProfile(user, {
        displayName: name.trim()
      });
      setMessage('Profile updated successfully!');
      // Update local state by forcing a re-render or letting the auth observer handle it
      // Since updateProfile modifies the object directly, we can just show success.
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ux-tool-page">
      <SEO title="My Profile | OM PDF" description="Manage your OM PDF account profile." url="https://om-pdf.pages.dev/profile" />
      
      <div className="ux-tool-main">
        <div className="ux-one-col" style={{ maxWidth: 500 }}>
          <div className="ux-settings-card" style={{ marginTop: 20 }}>
            <h2 className="ux-settings-title" style={{ fontSize: '1.4rem' }}>My Profile</h2>
            
            {message && (
              <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
                ✓ {message}
              </div>
            )}
            {error && (
              <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="ux-field">
                <label className="ux-label">Email Address</label>
                <input 
                  type="email" 
                  className="ux-input" 
                  value={user.email || ''} 
                  disabled 
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Your email is linked to your Google Account and cannot be changed here.
                </div>
              </div>

              <div className="ux-field">
                <label className="ux-label">Display Name</label>
                <input 
                  type="text" 
                  className="ux-input" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="ux-btn-primary" 
                disabled={saving || !name.trim() || name === user.displayName}
                style={{ marginTop: 24 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
