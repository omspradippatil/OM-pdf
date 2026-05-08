import React from 'react';

const STATUS_LABELS = {
  queued: 'Queued',
  processing: 'Processing',
  ready: 'Ready',
  done: 'Done',
  error: 'Error',
};

function formatEta(ms) {
  if (!ms || ms < 1000) return '—';
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

export default function QueuePanel({ title = 'Queue', items = [] }) {
  if (!items.length) return null;
  return (
    <div className="queue-panel">
      <div className="queue-header">
        <h3 className="queue-title">{title}</h3>
        <span className="queue-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="queue-list">
        {items.map(item => (
          <div key={item.id} className={`queue-item status-${item.status || 'queued'}`}>
            <div className="queue-main">
              <div className="queue-name" title={item.name}>{item.name}</div>
              <div className="queue-meta">
                <span>{STATUS_LABELS[item.status] || 'Queued'}</span>
                {item.etaMs ? <span>ETA {formatEta(item.etaMs)}</span> : <span>ETA —</span>}
                {typeof item.progress === 'number' ? <span>{Math.round(item.progress)}%</span> : null}
              </div>
            </div>
            <div className="queue-progress">
              <div className="queue-progress-bar" style={{ width: `${Math.min(100, Math.max(0, item.progress || 0))}%` }} />
            </div>
            {item.message ? <div className="queue-message">{item.message}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
