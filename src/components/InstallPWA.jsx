import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [mode, setMode] = useState('prompt'); // prompt | ios

  const STORAGE_KEY = 'om_pdf_pwa_prompted';

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
    if (localStorage.getItem(STORAGE_KEY)) return; // Never show again if already handled
    if (isStandalone()) return; // Already installed

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
      localStorage.setItem(STORAGE_KEY, 'true');
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
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {showInstall && (
        <motion.div 
          className="pwa-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="pwa-modal-card"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="pwa-modal-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <h3 className="pwa-modal-title">Install OM PDF</h3>
            <p className="pwa-modal-desc">
              Get faster access, work entirely offline, and enjoy zero uploads.
            </p>

            <div className="pwa-modal-actions">
              {mode === 'prompt' ? (
                <button onClick={handleInstallClick} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!deferredPrompt}>
                  Install App
                </button>
              ) : (
                <div className="pwa-ios-hint">
                  To install on iOS: tap <strong>Share</strong> and then <strong>Add to Home Screen</strong>
                </div>
              )}
              <button onClick={handleDismiss} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                Maybe Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
