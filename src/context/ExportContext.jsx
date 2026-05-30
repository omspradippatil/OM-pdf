import React, { createContext, useContext, useState } from 'react';
import SaveToDriveButton from '../components/SaveToDriveButton';
import { useAuth } from './AuthContext';

const ExportContext = createContext();

export function useExport() {
  return useContext(ExportContext);
}

export function ExportProvider({ children }) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [filename, setFilename] = useState('');

  const triggerExport = (bytes, defaultFilename, mimeType = 'application/pdf', toolFolder = 'Exported') => {
    setExportData({ bytes, mimeType, toolFolder });
    setFilename(defaultFilename);
    setModalOpen(true);
  };

  const handleDownload = () => {
    if (!exportData) return;
    const { bytes, mimeType } = exportData;
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    setModalOpen(false);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <ExportContext.Provider value={{ triggerExport }}>
      {children}
      {modalOpen && exportData && (
        <div className="ux-modal-overlay" onClick={closeModal} style={{ zIndex: 9999 }}>
          <div className="ux-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="ux-modal-header">
              <h3>Export File</h3>
              <button className="ux-modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="ux-modal-body" style={{ padding: '24px 24px 8px' }}>
              <div className="ux-field">
                <label className="ux-label">Filename</label>
                <input 
                  type="text" 
                  className="ux-input" 
                  value={filename} 
                  onChange={e => setFilename(e.target.value)} 
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                <button className="ux-btn-primary" onClick={handleDownload}>
                  ↓ Download to Device
                </button>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <SaveToDriveButton 
                    bytes={exportData.bytes} 
                    filename={filename || 'document.pdf'} 
                    toolFolder={exportData.toolFolder} 
                    mimeType={exportData.mimeType} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ExportContext.Provider>
  );
}
