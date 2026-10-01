import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import StatusIndicator from '../../components/common/StatusIndicator';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import api from '../../api/client';
import { formatTime } from '../../utils/formatters';

export default function QueueMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMonitor = async () => {
    try {
      const res = await api.get('/admin/queue-monitor');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load queue monitor', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
    const interval = setInterval(fetchMonitor, 5000); // 5s live branch monitoring
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner text="Connecting to branch hall monitor feed..." />;

  const counters = data?.counters || [];
  const activeTokens = data?.active_tokens || [];
  const departments = data?.departments || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Branch Live Operations Board</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Real-time status of all service counters and waiting queues across departments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span className="status-indicator">
            <span className="status-dot status-dot-pulse" style={{ backgroundColor: 'var(--success)' }} />
            <strong style={{ fontSize: 'var(--font-size-xs)', color: 'var(--success)' }}>LIVE FEED (5s)</strong>
          </span>
          <Button variant="outline" size="sm" onClick={fetchMonitor}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Counter Status Matrix */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
          🪑 Service Counters Grid ({counters.length})
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 'var(--space-md)'
        }}>
          {counters.map(c => {
            const isAvailable = c.status === 'available';
            const isBusy = c.status === 'busy';

            return (
              <Card
                key={c.id}
                hover
                style={{
                  borderTop: isBusy
                    ? '4px solid var(--primary)'
                    : isAvailable
                    ? '4px solid var(--success)'
                    : '4px solid var(--text-muted)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>{c.name}</h3>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      {c.department_name} ({c.code || c.department_code})
                    </span>
                  </div>
                  <Badge status={c.status} />
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-body)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  margin: 'var(--space-sm) 0'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Current Serving Token
                  </div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: c.current_token_number ? 'var(--primary)' : 'var(--text-muted)',
                    margin: '2px 0'
                  }}>
                    {c.current_token_number || '—'}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {c.current_service_name || 'Idle'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
                  <span>Staff:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{c.staff_name || 'Unassigned'}</strong>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Waiting Queues by Department */}
      <div>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
          👥 Department Queue Monitor
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-lg)' }}>
          {departments.map(dept => {
            const deptTokens = activeTokens.filter(t => t.department_name === dept.name);
            const waitingCount = deptTokens.filter(t => t.status === 'waiting').length;

            return (
              <Card key={dept.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>{dept.name}</h3>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      Active Counters: {dept.active_counters} / {dept.total_counters}
                    </span>
                  </div>
                  <span style={{
                    backgroundColor: waitingCount > 0 ? 'var(--warning-light)' : 'var(--success-light)',
                    color: waitingCount > 0 ? '#b45309' : '#047857',
                    fontWeight: 700,
                    fontSize: 'var(--font-size-xs)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    {waitingCount} waiting
                  </span>
                </div>

                {deptTokens.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                    No active tokens in this department.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {deptTokens.map((t, idx) => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-body)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--font-size-xs)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--text-muted)', width: 14 }}>#{idx + 1}</span>
                          <strong style={{ color: 'var(--primary)' }}>{t.token_number}</strong>
                          <span>{t.service_name}</span>
                        </div>
                        <Badge status={t.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
