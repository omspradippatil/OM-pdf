import React from 'react';

export default function CrashRecoveryBanner({ onRestore, onDiscard, recovering }) {
  return (
    <div style={{
      background: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '12px',
      padding: '16px 20px',
      margin: '0 0 20px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '1.4rem' }}>🔄</div>
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text-primary)' }}>Previous Session Found</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            We found some files you were working on. Do you want to restore them?
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={onDiscard} 
          disabled={recovering}
          style={{
            background: 'transparent',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          Discard
        </button>
        <button 
          onClick={onRestore}
          disabled={recovering}
          style={{
            background: 'var(--primary)',
            border: 'none',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          {recovering ? 'Restoring...' : 'Restore Files'}
        </button>
      </div>
    </div>
  );
}
