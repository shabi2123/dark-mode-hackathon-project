import React from 'react';
import { getStatusLabel } from '../../utils/formatters';

export default function Badge({ status, label, className = '' }) {
  const displayLabel = label || getStatusLabel(status);
  return (
    <span className={`badge badge-${status} ${className}`}>
      {displayLabel}
    </span>
  );
}
