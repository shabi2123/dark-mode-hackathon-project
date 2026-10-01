import React from 'react';

export default function FormField({
  label,
  error,
  required = false,
  children,
  className = '',
  hint = null
}) {
  return (
    <div className={`form-control ${className}`}>
      {label && (
        <label className="form-label">
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
