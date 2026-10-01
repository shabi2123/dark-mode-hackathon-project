import React from 'react';

export default function EmptyState({
  icon = '📋',
  title = 'No records found',
  description = 'There is currently no data to display.',
  action = null
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h4 className="empty-title">{title}</h4>
      <p className="empty-desc">{description}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
