import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { updateProfile, deleteUser } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import { deleteAppDriveData, clearDriveAccessToken } from '../services/googleDrive';
import { cfRevokeToken } from '../services/cfTokenService';
import { deleteUserAccountData } from '../services/userProfile';

export default function Profile() {
  const { user, logout, ensureDriveToken, driveConnected, setDriveConnected } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [bgRefreshEnabled, setBgRefreshEnabled] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDriveData, setDeleteDriveData] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      const disabled = window.localStorage.getItem('om_pdf_disable_bg_refresh') === 'true';
      setBgRefreshEnabled(!disabled);
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
      // Save refresh preference
      if (!bgRefreshEnabled) {
        window.localStorage.setItem('om_pdf_disable_bg_refresh', 'true');
      } else {
        window.localStorage.removeItem('om_pdf_disable_bg_refresh');
      }
      
      setMessage('Profile updated successfully!');
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');
    
    try {
      // 1. Delete Google Drive Data if requested
      if (deleteDriveData) {
        try {
          await deleteAppDriveData();
        } catch (e) {
          console.warn("Failed to delete drive data:", e);
        }
      }
      
      // 2. Revoke Cloudflare Worker token
      try {
        const idToken = await user.getIdToken();
        await cfRevokeToken(idToken);
      } catch (e) {
        console.warn("Failed to revoke CF token:", e);
      }

      // 3. Delete Firestore data
      await deleteUserAccountData(user.uid);
      
      // 4. Delete Firebase Auth user
      await deleteUser(user);
      
      // Navigate to home, auth state will clear automatically
      navigate('/', { replace: true });
    } catch (err) {
      console.error("Error deleting account:", err);
      if (err.code === 'auth/requires-recent-login') {
        setError('For security reasons, please log out and log back in before deleting your account.');
      } else {
        setError(err.message || 'Failed to delete account.');
      }
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="ux-tool-page">
      <SEO title="My Profile | OM PDF" description="Manage your OM PDF account profile." url="https://om-pdf.netlify.app/profile" />
      
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

              <div className="ux-field" style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 12, color: 'var(--text-color)' }}>Connected Services</h3>
                <div style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '16px', background: 'var(--bg-layer-1)', borderRadius: 8, border: '1px solid var(--border-color)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.36 14.4H8.64L5.28 20.16H12L15.36 14.4Z" fill="#0066DA"/>
                      <path d="M11.52 7.68L8.16 13.44L4.8 7.68L8.16 1.92L11.52 7.68Z" fill="#00AC47"/>
                      <path d="M22.08 7.68L18.72 1.92H12L15.36 7.68H22.08Z" fill="#EA4335"/>
                      <path d="M15.36 14.4L18.72 20.16H22.08L18.72 14.4H15.36Z" fill="#00832D"/>
                      <path d="M22.08 7.68H15.36L12 13.44H18.72L22.08 7.68Z" fill="#2684FC"/>
                      <path d="M4.8 7.68L1.44 13.44L4.8 19.2H8.16L4.8 13.44V7.68Z" fill="#FFBA00"/>
                    </svg>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>Google Drive</strong>
                      <span style={{ fontSize: '0.8rem', color: driveConnected ? '#16a34a' : 'var(--text-muted)' }}>
                        {driveConnected ? 'Connected & syncing automatically' : 'Not connected'}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    type="button" 
                    className={driveConnected ? "ux-btn-outline" : "ux-btn-primary"}
                    style={driveConnected ? { borderColor: '#ef4444', color: '#ef4444' } : {}}
                    onClick={async () => {
                      if (driveConnected) {
                        try {
                          const idToken = await user.getIdToken();
                          await cfRevokeToken(idToken);
                        } catch(e) {}
                        clearDriveAccessToken();
                        setDriveConnected(false);
                      } else {
                        ensureDriveToken(true, { interactive: true });
                      }
                    }}
                  >
                    {driveConnected ? 'Disconnect' : 'Connect Drive'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 24 }}>
                <button 
                  type="submit" 
                  className="ux-btn-primary" 
                  disabled={saving || (!name.trim() || name === user.displayName)}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="ux-settings-card" style={{ marginTop: 24, border: '1px solid #fca5a5', background: '#fef2f2' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: '#ef4444' }}>Danger Zone</h3>
            <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: 16 }}>
              Permanently delete your account and all associated data. This action is irreversible.
            </p>
            <button 
              type="button" 
              onClick={() => setShowDeleteModal(true)}
              className="ux-btn-primary"
              style={{ background: '#ef4444', border: 'none', width: '100%' }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="ux-settings-card" style={{ maxWidth: 420, margin: 20, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span> Delete Account
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-color)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete your OM PDF account? This action cannot be undone and your profile and stats will be erased.
            </p>
            
            <label style={{ display: 'flex', alignItems: 'flex-start', marginTop: 16, cursor: 'pointer', padding: '16px', background: 'var(--bg-layer-1)', borderRadius: 8, border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
              <input 
                type="checkbox"
                checked={deleteDriveData}
                onChange={(e) => setDeleteDriveData(e.target.checked)}
                style={{ marginTop: 4, marginRight: 12, width: 18, height: 18, accentColor: '#ef4444' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-color)' }}>
                <strong style={{ display: 'block', marginBottom: 4, color: '#ef4444' }}>Also delete uploaded Google Drive files</strong>
                Check this box to permanently delete the 'OM PDF' folder and all files you created with this app from your Google Drive.
              </span>
            </label>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="ux-btn-outline" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="ux-btn-primary" 
                style={{ background: '#ef4444' }}
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
