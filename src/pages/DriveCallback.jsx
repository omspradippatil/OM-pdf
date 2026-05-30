// src/pages/DriveCallback.jsx
// Handles the Google OAuth redirect after the user grants offline Drive access.
// Google redirects to /drive-callback?code=...&state=...
// This page picks up the code, sends it to the CF Worker, and stores the token.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useExport } from '../context/ExportContext';
import { cfExchangeCode } from '../services/cfTokenService';
import { setDriveAccessToken } from '../services/googleDrive';

const REDIRECT_URI = `${window.location.origin}/drive-callback`;

export default function DriveCallback() {
  const { triggerExport } = useExport();
  const { user, ensureDriveToken, setDriveConnected } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing | success | error
  const [message, setMessage] = useState('Connecting Google Drive…');

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code   = params.get('code');
      const error  = params.get('error');

      if (error) {
        if (!cancelled) { setStatus('error'); setMessage('Google denied Drive access: ' + error); }
        setTimeout(() => navigate('/my-files'), 3000);
        return;
      }

      if (!code) {
        if (!cancelled) { setStatus('error'); setMessage('No authorization code received.'); }
        setTimeout(() => navigate('/my-files'), 3000);
        return;
      }

      // Wait for auth to be ready. On redirect returns, React context can lag
      // behind Firebase Auth even when the user is already signed in.
      let attempts = 0;
      let currentUser = user || auth?.currentUser || null;
      while (!currentUser && attempts < 40) {
        await new Promise(r => setTimeout(r, 250));
        currentUser = user || auth?.currentUser || null;
        attempts++;
      }

      if (!currentUser) {
        if (!cancelled) { setStatus('error'); setMessage('Please sign in before connecting Drive.'); }
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        const idToken = await currentUser.getIdToken();
        const result  = await cfExchangeCode(idToken, code, REDIRECT_URI);

        if (!result || !result.access_token) {
          const refreshed = await ensureDriveToken(true, { interactive: false });
          if (refreshed) {
            if (!cancelled) { setStatus('success'); setMessage('Google Drive connected! Redirecting...'); }
            setTimeout(() => navigate('/my-files'), 1500);
            return;
          }
          throw new Error('Worker did not return an access token.');
        }

        // Store the fresh access token in the Drive service (in-memory + localStorage)
        setDriveAccessToken(result.access_token, result.expires_in * 1000, currentUser.uid);
        setDriveConnected(true);

        if (!cancelled) { setStatus('success'); setMessage('Google Drive connected! Redirecting…'); }
        setTimeout(() => navigate('/my-files'), 1500);
      } catch (err) {
        console.error('[DriveCallback]', err);
        if (!cancelled) { setStatus('error'); setMessage('Failed to connect Drive: ' + err.message); }
        setTimeout(() => navigate('/my-files'), 4000);
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const icons = { processing: '⏳', success: '✅', error: '❌' };
  const colors = { processing: '#3949ab', success: '#059669', error: '#dc2626' };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      flexDirection: 'column',
      gap: 16,
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem' }}>{icons[status]}</div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: colors[status], margin: 0 }}>
        {status === 'processing' ? 'Connecting Drive…' : status === 'success' ? 'Connected!' : 'Connection Failed'}
      </h1>
      <p style={{ color: 'var(--text-muted)', margin: 0, maxWidth: 400 }}>{message}</p>
      {status === 'processing' && (
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--border)',
          borderTopColor: '#3949ab',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
