import React from 'react';

export default function LoadingSpinner({ text = 'Loading...', size = 32 }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-2xl) var(--space-md)',
      gap: 'var(--space-md)',
      color: 'var(--text-secondary)'
    }}>
      <div className="spinner" style={{ width: size, height: size }} />
      {text && <span style={{ fontSize: 'var(--font-size-sm)' }}>{text}</span>}
    </div>
  );
}
