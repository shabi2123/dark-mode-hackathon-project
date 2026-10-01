import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';
import { formatWaitTime } from '../../utils/formatters';

export default function QueueStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const prevStatusRef = useRef(null);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try {
      const res = await api.get('/queue/status');
      setData(res.data);

      const currentStatus = res.data?.active_token?.status;
      if (prevStatusRef.current === 'waiting' && currentStatus === 'called') {
        // Trigger alert / audio beep simulation
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        } catch {
          // ignore
        }
      }
      prevStatusRef.current = currentStatus;
    } catch (err) {
      console.error('Error fetching live queue status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // 5-second polling for active live screen
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your token and leave the queue?')) return;
    setCancelling(true);
    try {
      await api.post('/queue/cancel');
      await fetchStatus();
    } catch (err) {
      alert(err.message || 'Failed to cancel token');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingSpinner text="Connecting to live branch queue..." />;

  const token = data?.active_token;

  if (!token) {
    return (
      <div style={{ maxWidth: 540, margin: 'var(--space-2xl) auto' }}>
        <Card style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <EmptyState
            icon="🎟️"
            title="You are not currently in any queue"
            description="You don't have an active token waiting at the branch. Join the walk-in queue or schedule an appointment."
            action={
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
                <Button variant="primary" onClick={() => navigate('/customer/join-queue')}>
                  Join Walk-in Queue
                </Button>
                <Button variant="outline" onClick={() => navigate('/customer/book')}>
                  Book Appointment
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  const isCalled = token.status === 'called';
  const isInService = token.status === 'in_service';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Announcement Notification if called */}
      {isCalled && (
        <div className="call-banner">
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>📢 YOUR TURN HAS ARRIVED!</div>
            <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.95, marginTop: 4 }}>
              Token <strong>{token.token_number}</strong> — Please proceed directly to <strong>{token.counter_name || 'Assigned Counter'}</strong>
            </div>
          </div>
          <div style={{ fontSize: '2rem' }}>👉</div>
        </div>
      )}

      {isInService && (
        <div style={{
          backgroundColor: 'var(--primary)',
          color: 'white',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          marginBottom: 'var(--space-lg)',
          fontWeight: 600
        }}>
          ✅ You are currently being served at {token.counter_name}
        </div>
      )}

      <Card style={{
        textAlign: 'center',
        padding: 'var(--space-xl)',
        border: isCalled ? '3px solid var(--info)' : isInService ? '3px solid var(--primary)' : '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Live Queue Board
          </span>
          <Badge status={token.status} />
        </div>

        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>YOUR DIGITAL TOKEN</div>
        <div style={{
          fontSize: '4.5rem',
          fontWeight: 800,
          color: isCalled ? 'var(--info)' : isInService ? 'var(--primary)' : 'var(--text-primary)',
          lineHeight: 1,
          letterSpacing: 2,
          margin: '12px 0'
        }}>
          {token.token_number}
        </div>

        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {token.service_name}
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          {token.department_name} ({token.department_code})
        </div>

        {/* Readiness Status Banner */}
        <div style={{
          backgroundColor: token.readiness_status === 'READY' ? 'var(--success-light)' : 'var(--warning-light)',
          border: token.readiness_status === 'READY' ? '1px solid #bbf7d0' : '1px solid #fef3c7',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-lg)',
          textAlign: 'left',
          fontSize: 'var(--font-size-xs)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: token.readiness_status === 'READY' ? '#166534' : '#92400e' }}>
              ✓ Service Readiness: {token.readiness_status || 'READY'} ({token.readiness_percentage || 100}%)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Smart Counter Matching Active
            </span>
          </div>
          {token.missing_requirements && (
            <div style={{ marginTop: 4, color: '#b45309' }}>
              ⚠️ Missing items: <strong>{token.missing_requirements}</strong>
            </div>
          )}
        </div>

        {/* Dynamic Queue Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-xl)'
        }}>
          <div style={{ backgroundColor: 'var(--bg-body)', padding: '16px 8px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>People Ahead</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {token.status === 'waiting' ? token.people_ahead : '0'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>waiting in line</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-body)', padding: '16px 8px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Est. Wait Time</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
              {token.status === 'waiting' ? formatWaitTime(token.estimated_wait_minutes) : 'Now'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>smart calculation</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-body)', padding: '16px 8px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Counter</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
              {token.counter_name || (token.current_serving_counter ? 'Stand by' : 'Wait')}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {token.staff_name ? `Staff: ${token.staff_name}` : 'auto-routed'}
            </div>
          </div>
        </div>

        {/* Branch Context */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-xl)'
        }}>
          <span>Currently Serving in Branch:</span>
          <strong>
            {token.current_serving_token
              ? `Token ${token.current_serving_token} (${token.current_serving_counter || 'Counter'})`
              : 'All counters ready'}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
          {token.status === 'waiting' && (
            <Button variant="danger" size="sm" loading={cancelling} onClick={handleCancel}>
              Cancel Token & Leave Queue
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={fetchStatus}>
            🔄 Refresh Status
          </Button>
        </div>
      </Card>
    </div>
  );
}
