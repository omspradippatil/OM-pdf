// src/components/DriveConnectButton.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';

const GoogleDriveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
    <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.55A8.994 8.994 0 0 0 0 53.05h27.5l16.15-28.05z" fill="#00AC47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.2 7.9 12.6z" fill="#EA4335"/>
    <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.1.45-4.5 1.2L43.65 25z" fill="#00832D"/>
    <path d="M59.8 53.05H27.5L13.75 76.8c1.4.8 2.95 1.2 4.5 1.2h50.8c1.6 0 3.1-.45 4.5-1.2L59.8 53.05z" fill="#2684FC"/>
    <path d="M73.4 26.5l-13.1-22.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28.05H87.3c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/>
  </svg>
);

export default function DriveConnectButton({
  style,
  className = '',
  label = 'Connect Google Drive',
  redirectTo = window.location.pathname + window.location.search
}) {
  const { user } = useAuth();

  const handleConnect = (e) => {
    e.preventDefault();
    const clientId = import.meta.env.VITE_GOOGLE_DRIVE_OAUTH_CLIENT_ID;
    if (!clientId || clientId.includes('PASTE_YOUR')) {
      alert('Google Drive client ID is not configured. Please add VITE_GOOGLE_DRIVE_OAUTH_CLIENT_ID to your .env file.');
      return;
    }

    const redirectUri = encodeURIComponent(`${window.location.origin}/drive-callback`);
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file email profile');
    const state = encodeURIComponent(redirectTo || '/my-files');
    const email = user?.email;

    let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${redirectUri}` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;

    if (email) {
      authUrl += `&login_hint=${encodeURIComponent(email)}`;
    }

    window.location.href = authUrl;
  };

  return (
    <button
      onClick={handleConnect}
      className={`btn-action btn-drive-connect ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 20px',
        fontWeight: '600',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        background: 'linear-gradient(135deg, #2684FC 0%, #0066DA 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 12px rgba(38, 132, 252, 0.25)',
        transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(38, 132, 252, 0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(38, 132, 252, 0.25)';
      }}
    >
      <GoogleDriveIcon />
      <span>{label}</span>
    </button>
  );
}
