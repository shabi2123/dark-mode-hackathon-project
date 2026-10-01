import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';
import { formatTime } from '../../utils/formatters';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load admin dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner text="Aggregating branch operations metrics..." />;

  const kpis = data?.kpis || {};
  const hourly = data?.hourly_distribution || [];
  const activity = data?.recent_activity || [];

  // Generate hourly slots from 8 AM to 5 PM
  const hoursMap = {};
  hourly.forEach(h => {
    hoursMap[h.hour] = h.count;
  });
  const businessHours = [8, 9, 10, 11, 12, 13, 14, 15, 16];
  const maxTraffic = Math.max(1, ...businessHours.map(h => hoursMap[h] || 0));

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Executive Branch Overview</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Real-time visibility into branch customer flow, counter performance, and queue velocity.
        </p>
      </div>

      {/* KPI Cards Grid - 8 core metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)'
      }}>
        <Card hover>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Total Appointments
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
            {kpis.total_appointments_today ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Scheduled for today
          </div>
        </Card>

        <Card hover>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Walk-in Visitors
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#3b82f6', marginTop: 4 }}>
            {kpis.walk_in_visitors_today ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Tokens generated today
          </div>
        </Card>

        <Card hover style={{ borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Current Waiting
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>
            {kpis.current_waiting_customers ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Customers waiting in hall
          </div>
        </Card>

        <Card hover style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Active Counters
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
            {kpis.active_counters ?? 0} <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: 400 }}>/ {kpis.total_counters ?? 0}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Available & in-service
          </div>
        </Card>

        <Card hover>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Completed Services
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
            {kpis.completed_services_today ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Served today
          </div>
        </Card>

        <Card hover>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Missed / No-Show
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>
            {kpis.missed_appointments_today ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Skipped or cancelled
          </div>
        </Card>

        <Card hover>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Avg Waiting Time
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {kpis.average_waiting_time_mins ?? 0}<span style={{ fontSize: 'var(--font-size-base)', fontWeight: 500 }}>m</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Before token called
          </div>
        </Card>

        <Card hover>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Avg Service Time
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {kpis.average_service_duration_mins ?? 0}<span style={{ fontSize: 'var(--font-size-base)', fontWeight: 500 }}>m</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Duration at counter
          </div>
        </Card>

        <Card hover style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Readiness Issues
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {kpis.readiness_issues_today ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Incomplete checklist today
          </div>
        </Card>

        <Card hover style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            First-Visit Completion
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {kpis.first_visit_completion_rate ?? 100}<span style={{ fontSize: 'var(--font-size-base)', fontWeight: 500 }}>%</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Served with full readiness
          </div>
        </Card>
      </div>

      {/* Two Column Grid: Hourly Chart & Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.4fr) 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        
        {/* Peak Visiting Hours Visualization */}
        <Card title="Peak Visiting Hours (Hourly Traffic)" subtitle="Customer arrival distribution throughout branch business hours">
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: 180,
            padding: 'var(--space-lg) var(--space-sm) 0',
            gap: 12
          }}>
            {businessHours.map(hour => {
              const count = hoursMap[hour] || 0;
              const heightPercent = Math.max(8, Math.round((count / maxTraffic) * 100));
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayH = hour % 12 || 12;

              return (
                <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: count > 0 ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 4 }}>
                    {count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 32,
                      height: `${heightPercent}%`,
                      backgroundColor: count > 0 ? 'var(--primary)' : 'var(--border-light)',
                      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      transition: 'height 0.4s ease'
                    }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: 6, whiteSpace: 'nowrap' }}>
                    {displayH}{ampm}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border-light)',
            marginTop: 'var(--space-lg)',
            paddingTop: 'var(--space-sm)',
            fontSize: 'var(--font-size-xs)'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Busiest Department: </span>
              <strong>{kpis.busiest_department}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Top Requested Service: </span>
              <strong>{kpis.busiest_service}</strong>
            </div>
          </div>
        </Card>

        {/* Live Branch Activity Stream */}
        <Card title="Live Activity Feed" subtitle="Real-time queue transitions across all counters">
          {activity.length === 0 ? (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recent queue events today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
              {activity.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-body)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-xs)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      backgroundColor: item.action === 'completed' ? 'var(--success-light)' : item.action === 'called' ? 'var(--info-light)' : 'var(--border-light)',
                      color: item.action === 'completed' ? '#047857' : item.action === 'called' ? '#1d4ed8' : 'var(--text-secondary)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: '9px'
                    }}>
                      {item.action}
                    </span>
                    <strong>Token {item.token_number}</strong>
                    {item.counter_name && (
                      <span style={{ color: 'var(--text-secondary)' }}>at {item.counter_name}</span>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
