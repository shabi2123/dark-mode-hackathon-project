import React from 'react';
import { getStatusColor, getStatusLabel } from '../../utils/formatters';

export default function StatusIndicator({ status, label, pulse = false }) {
  const color = getStatusColor(status);
  const text = label || getStatusLabel(status);

  return (
    <div className="status-indicator">
      <span
        className={`status-dot ${pulse ? 'status-dot-pulse' : ''}`}
        style={{ backgroundColor: color }}
      />
      <span>{text}</span>
    </div>
  );
}
