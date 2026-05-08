import React, { useEffect, useMemo, useState } from 'react';
import { clearRecentFiles, getRecentFiles } from '../services/recentFiles';
import { formatBytes } from '../fileManager';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function RecentFilesPanel({ tool, title }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(getRecentFiles(tool));
  }, [tool]);

  const onClear = () => {
    setItems(clearRecentFiles(tool));
  };

  const content = useMemo(() => items.slice(0, 5), [items]);

  return (
    <div className="recent-panel">
      <div className="recent-header">
        <div>
          <h3 className="recent-title">{title || 'Recent files'}</h3>
          <p className="recent-sub">Stored locally in your browser</p>
        </div>
        {items.length > 0 && (
          <button className="btn-text btn-compact" type="button" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {content.length === 0 ? (
        <div className="recent-empty">No recent files yet.</div>
      ) : (
        <div className="recent-list">
          {content.map(item => (
            <div key={item.id} className="recent-item">
              <div className="recent-item-main">
                <div className="recent-name" title={item.name}>{item.name}</div>
                <div className="recent-meta">
                  <span>{formatDate(item.createdAt)}</span>
                  {item.pages ? <span>{item.pages} pages</span> : null}
                  <span>{formatBytes(item.size || 0)}</span>
                </div>
              </div>
              <span className="recent-tool">{item.tool}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
