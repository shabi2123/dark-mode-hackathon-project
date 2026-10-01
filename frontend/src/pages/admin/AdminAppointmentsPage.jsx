import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';
import { formatTime, formatDate } from '../../utils/formatters';

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchServices = async () => {
    try {
      const res = await api.get('/services');
      setServices(res.data || []);
    } catch (err) {
      console.error('Failed to load services', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      let url = '/appointments';
      const params = [];
      if (selectedDate) params.push(`date=${selectedDate}`);
      if (selectedService !== 'all') params.push(`service_id=${selectedService}`);
      if (selectedStatus !== 'all') params.push(`status=${selectedStatus}`);

      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const res = await api.get(url);
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Failed to load appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 15000);
    return () => clearInterval(interval);
  }, [selectedDate, selectedService, selectedStatus]);

  const handleCancel = async (id, apptNumber) => {
    if (!window.confirm(`Are you sure you want to cancel appointment ${apptNumber}?`)) return;
    setActionLoading(id);
    try {
      await api.patch(`/appointments/${id}`, { action: 'cancel' });
      await fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckIn = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/appointments/${id}/check-in`);
      alert('Customer checked in and token issued successfully!');
      await fetchAppointments();
    } catch (err) {
      alert(err.message || 'Check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Client-side search filtering
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const q = searchQuery.toLowerCase();
    return appointments.filter(a =>
      (a.appointment_number && a.appointment_number.toLowerCase().includes(q)) ||
      (a.user_name && a.user_name.toLowerCase().includes(q)) ||
      (a.user_email && a.user_email.toLowerCase().includes(q)) ||
      (a.user_phone && a.user_phone.toLowerCase().includes(q)) ||
      (a.service_name && a.service_name.toLowerCase().includes(q))
    );
  }, [appointments, searchQuery]);

  // Statistics
  const counts = useMemo(() => {
    const total = filteredAppointments.length;
    const booked = filteredAppointments.filter(a => ['booked', 'confirmed'].includes(a.status)).length;
    const waiting = filteredAppointments.filter(a => ['checked_in', 'waiting'].includes(a.status)).length;
    const completed = filteredAppointments.filter(a => a.status === 'completed').length;
    const cancelled = filteredAppointments.filter(a => ['cancelled', 'missed'].includes(a.status)).length;
    return { total, booked, waiting, completed, cancelled };
  }, [filteredAppointments]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Master Appointments Ledger</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Centralized appointment tracking, customer attendance control, and document readiness audit.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchAppointments}>
          🔄 Refresh Ledger
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)'
      }}>
        <Card style={{ padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Filtered</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{counts.total}</div>
        </Card>
        <Card style={{ padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Booked / Upcoming</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6' }}>{counts.booked}</div>
        </Card>
        <Card style={{ padding: 'var(--space-md)', borderLeft: '3px solid var(--warning)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Arrived / Waiting</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>{counts.waiting}</div>
        </Card>
        <Card style={{ padding: 'var(--space-md)', borderLeft: '3px solid var(--success)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Completed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>{counts.completed}</div>
        </Card>
        <Card style={{ padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cancelled / Missed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>{counts.cancelled}</div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Filter by Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--bg-input)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Filter by Service
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--bg-input)'
              }}
            >
              <option value="all">All Services</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.department_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--bg-input)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="waiting">Waiting</option>
              <option value="in_service">In Service</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="missed">Missed</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Search Customer / Code
            </label>
            <input
              type="text"
              placeholder="Search by name, email, #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--bg-input)'
              }}
            />
          </div>
        </div>

        {selectedDate && (
          <div style={{ marginTop: 'var(--space-sm)', textAlign: 'right' }}>
            <button
              onClick={() => setSelectedDate('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Clear Date Filter (Show All)
            </button>
          </div>
        )}
      </Card>

      {/* Main Ledger Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <LoadingSpinner text="Loading appointment records..." />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No appointments found"
            description="No appointment records match the selected date, filters, or search term."
          />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Appointment #</th>
                  <th>Customer</th>
                  <th>Service & Dept</th>
                  <th>Date & Time</th>
                  <th>Service Readiness</th>
                  <th>Status</th>
                  <th>Token #</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(apt => {
                  const readinessPct = apt.readiness_percentage !== null ? Number(apt.readiness_percentage) : 100;
                  const readinessStatus = apt.readiness_status || 'READY';

                  return (
                    <tr key={apt.id}>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {apt.appointment_number}
                        </strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{apt.user_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {apt.user_phone || apt.user_email}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{apt.service_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {apt.department_name} ({apt.avg_duration_minutes}m)
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{formatDate(apt.appointment_date)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '11px',
                            fontWeight: 700,
                            width: 'fit-content',
                            backgroundColor: readinessStatus === 'READY' ? 'var(--success-light)' : readinessStatus === 'ACTION_REQUIRED' ? 'var(--warning-light)' : 'var(--danger-light)',
                            color: readinessStatus === 'READY' ? '#047857' : readinessStatus === 'ACTION_REQUIRED' ? '#b45309' : '#b91c1c'
                          }}>
                            {readinessStatus === 'READY' ? '✓' : '!'} {readinessPct}% {readinessStatus.replace('_', ' ')}
                          </span>
                          {apt.missing_requirements && apt.missing_requirements !== '[]' && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={apt.missing_requirements}>
                              Missing: {apt.missing_requirements}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge status={apt.status}>{apt.status.replace('_', ' ')}</Badge>
                      </td>
                      <td>
                        {apt.token_number ? (
                          <span style={{
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}>
                            {apt.token_number}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['booked', 'confirmed'].includes(apt.status) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === apt.id}
                                onClick={() => handleCheckIn(apt.id)}
                                title="Check-in arrival & generate token"
                              >
                                Check-in
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={actionLoading === apt.id}
                                onClick={() => handleCancel(apt.id, apt.appointment_number)}
                                title="Cancel appointment"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {apt.status === 'completed' && (
                            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>Fulfilled</span>
                          )}
                          {['cancelled', 'missed'].includes(apt.status) && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
