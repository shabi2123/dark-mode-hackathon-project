export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatWaitTime(minutes) {
  if (!minutes || minutes <= 0) return 'No wait';
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function getStatusColor(status) {
  const map = {
    waiting: 'var(--warning)',
    called: 'var(--info)',
    in_service: 'var(--primary)',
    completed: 'var(--success)',
    cancelled: 'var(--text-muted)',
    missed: 'var(--danger)',
    skipped: 'var(--text-muted)',
    booked: 'var(--info)',
    confirmed: 'var(--primary)',
    checked_in: 'var(--warning)',
    available: 'var(--success)',
    busy: 'var(--warning)',
    break: 'var(--text-muted)',
    closed: 'var(--danger)',
    active: 'var(--success)',
    inactive: 'var(--text-muted)',
  };
  return map[status] || 'var(--text-muted)';
}

export function getStatusLabel(status) {
  return status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
}
