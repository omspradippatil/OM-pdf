import React, { useEffect, useState } from 'react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [mode, setMode] = useState('prompt'); // prompt | ios

  const isStandalone = () => {
    try {
      const mq = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = window.navigator && window.navigator.standalone;
      return !!(mq || iosStandalone);
    } catch {
      return false;
    }
  };

  const isIos = () => {
    try {
      const ua = window.navigator.userAgent || '';
      return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMode('prompt');
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowInstall(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari doesn't fire beforeinstallprompt; show a helpful banner.
    if (!isStandalone() && isIos()) {
      setMode('ios');
      setShowInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  if (!showInstall) return null;

  if (isStandalone()) return null;

  return (
    <div className="install-pwa-banner">
      <div className="install-pwa-content">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Install OM PDF for offline access</span>
      </div>
      <div className="install-pwa-actions">
        {mode === 'prompt' ? (
          <button onClick={handleInstallClick} className="btn-action-sm" disabled={!deferredPrompt}>
            Install App
          </button>
        ) : (
          <span className="install-pwa-hint">On iPhone/iPad: Share → Add to Home Screen</span>
        )}
        <button onClick={() => setShowInstall(false)} className="btn-text">Dismiss</button>
      </div>
    </div>
  );
}
