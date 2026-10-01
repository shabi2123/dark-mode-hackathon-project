import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';
import { formatDate } from '../../utils/formatters';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  if (loading) return <LoadingSpinner text="Loading notifications..." />;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Branch Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Stay updated with your queue position changes, appointments, and staff calls.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon="🔕"
            title="No notifications yet"
            description="When you take a token or book an appointment, alerts will appear here."
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {notifications.map(n => (
            <Card
              key={n.id}
              style={{
                backgroundColor: n.is_read ? 'var(--bg-card)' : '#f0f7ff',
                borderLeft: n.is_read ? '1px solid var(--border-light)' : '4px solid var(--primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-md) var(--space-lg)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
                  <span style={{ fontSize: '1rem' }}>
                    {n.type === 'queue' ? '🎟️' : n.type === 'appointment' ? '🗓️' : '🔔'}
                  </span>
                  <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                    {n.title}
                  </strong>
                  {!n.is_read && (
                    <span style={{
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      NEW
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {n.message}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatDate(n.created_at)} • {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {!n.is_read && (
                <Button variant="secondary" size="sm" onClick={() => handleMarkRead(n.id)}>
                  Dismiss
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
