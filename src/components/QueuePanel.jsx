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
  // Technical details hidden as per user request to keep the UI clean
  return null;
}
