import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import TokenCard from '../../components/queue/TokenCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';
import { formatDate, formatTime } from '../../utils/formatters';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queueStatus, setQueueStatus] = useState(null);
  const [upcomingApt, setUpcomingApt] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [queueRes, aptsRes, servRes] = await Promise.all([
        api.get('/queue/status'),
        api.get('/appointments'),
        api.get('/services')
      ]);

      setQueueStatus(queueRes.data);

      // Find first upcoming appointment
      const upcoming = aptsRes.data.find(a => ['booked', 'confirmed'].includes(a.status));
      setUpcomingApt(upcoming || null);

      setServices(servRes.data.slice(0, 4));
    } catch (err) {
      console.error('Error fetching customer dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelToken = async () => {
    if (!window.confirm('Are you sure you want to leave the queue?')) return;
    try {
      await api.post('/queue/cancel');
      await fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to cancel token');
    }
  };

  const handleCheckIn = async (aptId) => {
    setCheckingIn(true);
    try {
      await api.post(`/appointments/${aptId}/check-in`);
      alert('Checked in successfully! Your token has been generated.');
      await fetchDashboardData();
      navigate('/customer/queue-status');
    } catch (err) {
      alert(err.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const activeToken = queueStatus?.active_token;

  return (
    <div>
      {/* Welcome & Quick Action Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)'
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
            Welcome back, {user?.name}! 👋
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Manage your bank branch visits, digital tokens, and appointments with ease.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Button variant="primary" onClick={() => navigate('/customer/join-queue')}>
            ⚡ Join Walk-in Queue
          </Button>
          <Button variant="outline" onClick={() => navigate('/customer/book')}>
            📅 Book Appointment
          </Button>
        </div>
      </div>

      {/* Main Grid: Active Token / Upcoming Appointment */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: activeToken ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr',
        gap: 'var(--space-lg)',
        marginBottom: 'var(--space-xl)'
      }}>
        {activeToken ? (
          <div>
            <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
              🔴 Your Active Queue Token
            </h2>
            <TokenCard token={activeToken} onCancel={handleCancelToken} />
          </div>
        ) : (
          <Card style={{
            background: 'linear-gradient(135deg, #f8faff 0%, #eef3ff 100%)',
            border: '1.5px dashed var(--primary-light)',
            padding: 'var(--space-xl)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-xs)' }}>🎟️</div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
              No Active Queue Token
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', maxWidth: 440, margin: '6px auto 16px' }}>
              Are you currently at or heading to the branch? Take a digital walk-in token now to secure your spot in line without standing physically.
            </p>
            <Button variant="primary" onClick={() => navigate('/customer/join-queue')}>
              Take a Digital Token Now
            </Button>
          </Card>
        )}

        {/* Upcoming Appointment Card */}
        {upcomingApt && (
          <div>
            <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
              🗓️ Upcoming Scheduled Appointment
            </h2>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>APPOINTMENT NUMBER</span>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--primary)' }}>
                    {upcomingApt.appointment_number}
                  </div>
                </div>
                <Badge status={upcomingApt.status} />
              </div>

              <div style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{upcomingApt.service_name}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{upcomingApt.department_name}</div>
              </div>

              <div style={{
                display: 'flex',
                gap: 'var(--space-lg)',
                padding: 'var(--space-sm) var(--space-md)',
                backgroundColor: 'var(--bg-body)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-md)',
                fontSize: 'var(--font-size-sm)'
              }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Date</div>
                  <strong>{formatDate(upcomingApt.appointment_date)}</strong>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Time Slot</div>
                  <strong>{formatTime(upcomingApt.start_time)} - {formatTime(upcomingApt.end_time)}</strong>
                </div>
              </div>

              {upcomingApt.appointment_date === new Date().toISOString().split('T')[0] ? (
                <Button
                  variant="success"
                  style={{ width: '100%' }}
                  loading={checkingIn}
                  onClick={() => handleCheckIn(upcomingApt.id)}
                >
                  📍 Check-In Now (Arrival at Branch)
                </Button>
              ) : (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Check-in will unlock on the appointment date.
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Featured Services */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Available Branch Services</h2>
          <Link to="/customer/services" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
            View all services →
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 'var(--space-md)'
        }}>
          {services.map(s => (
            <Card key={s.id} hover style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary)', fontWeight: 600 }}>
                  {s.department_name}
                </span>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: '4px 0 8px' }}>
                  {s.name}
                </h4>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                  {s.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-sm)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  ⏱ ~{s.avg_duration_minutes} mins
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/customer/book?service_id=${s.id}`)}
                >
                  Book Slot
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
