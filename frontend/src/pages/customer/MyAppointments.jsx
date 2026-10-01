import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';
import { formatDate, formatTime } from '../../utils/formatters';

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const navigate = useNavigate();

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCheckIn = async (aptId) => {
    setActionLoading(aptId);
    try {
      await api.post(`/appointments/${aptId}/check-in`);
      alert('Checked in! Your digital token has been added to the branch queue.');
      await fetchAppointments();
      navigate('/customer/queue-status');
    } catch (err) {
      alert(err.message || 'Check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (aptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    setActionLoading(aptId);
    try {
      await api.patch(`/appointments/${aptId}`, { action: 'cancel' });
      await fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const openReschedule = (apt) => {
    setRescheduleModal(apt);
    setNewDate(apt.appointment_date);
    setNewTime('');
  };

  useEffect(() => {
    if (!rescheduleModal || !newDate) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await api.get(`/services/${rescheduleModal.service_id}/slots?date=${newDate}`);
        setAvailableSlots(res.data);
        if (res.data.length > 0) setNewTime(res.data[0].start_time);
      } catch (err) {
        console.error('Failed to load slots', err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [rescheduleModal, newDate]);

  const handleConfirmReschedule = async () => {
    if (!newDate || !newTime) return;
    setActionLoading(rescheduleModal.id);
    try {
      await api.patch(`/appointments/${rescheduleModal.id}`, {
        action: 'reschedule',
        appointment_date: newDate,
        start_time: newTime
      });
      setRescheduleModal(null);
      await fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to reschedule appointment');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading appointment history..." />;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>My Branch Appointments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Track, check-in, reschedule, or cancel your bank branch bookings.
          </p>
        </div>

        <Button variant="primary" onClick={() => navigate('/customer/book')}>
          + Book New Appointment
        </Button>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <EmptyState
            icon="📅"
            title="No appointments scheduled"
            description="You don't have any upcoming or past appointments on record."
            action={
              <Button variant="primary" onClick={() => navigate('/customer/book')}>
                Schedule Your First Visit
              </Button>
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {appointments.map(apt => {
            const isToday = apt.appointment_date === today;
            const canCheckIn = ['booked', 'confirmed'].includes(apt.status) && isToday;
            const canCancelOrReschedule = ['booked', 'confirmed', 'rescheduled'].includes(apt.status);

            return (
              <Card key={apt.id} hover>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-md)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                      <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--primary)' }}>
                        {apt.appointment_number}
                      </strong>
                      <Badge status={apt.status} />
                      {apt.token_number && (
                        <span style={{ fontSize: 'var(--font-size-xs)', backgroundColor: 'var(--bg-body)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                          Token: <strong>{apt.token_number}</strong>
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: '2px 0 6px' }}>
                      {apt.service_name}
                    </h3>

                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      🏢 {apt.department_name} • ⏱ ~{apt.avg_duration_minutes} mins
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-lg)',
                    padding: '8px 16px',
                    backgroundColor: 'var(--bg-body)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Date</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                        {formatDate(apt.appointment_date)} {isToday && <span style={{ color: 'var(--success)' }}>(Today)</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Time Window</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                        {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                    {canCheckIn && (
                      <Button
                        variant="success"
                        size="sm"
                        loading={actionLoading === apt.id}
                        onClick={() => handleCheckIn(apt.id)}
                      >
                        📍 Check-In (Arrived)
                      </Button>
                    )}

                    {canCancelOrReschedule && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={actionLoading === apt.id}
                          onClick={() => openReschedule(apt)}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={actionLoading === apt.id}
                          onClick={() => handleCancel(apt.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}

                    {apt.status === 'checked_in' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/customer/queue-status')}
                      >
                        View Live Turn →
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <Modal
          isOpen={true}
          onClose={() => setRescheduleModal(null)}
          title={`Reschedule ${rescheduleModal.appointment_number}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRescheduleModal(null)}>Cancel</Button>
              <Button variant="primary" loading={actionLoading === rescheduleModal.id} onClick={handleConfirmReschedule} disabled={!newTime}>
                Confirm Reschedule
              </Button>
            </>
          }
        >
          <FormField label="Service" hint={rescheduleModal.service_name}>
            <div style={{ fontWeight: 600 }}>{rescheduleModal.service_name}</div>
          </FormField>

          <FormField label="Select New Date" required>
            <input
              type="date"
              className="form-input"
              value={newDate}
              min={today}
              onChange={(e) => setNewDate(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Available Slots" required>
            {loadingSlots ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>Loading slots...</div>
            ) : availableSlots.length === 0 ? (
              <div style={{ color: 'var(--danger)', fontSize: 'var(--font-size-xs)' }}>No slots available for this date</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {availableSlots.map(s => (
                  <button
                    key={s.start_time}
                    type="button"
                    onClick={() => setNewTime(s.start_time)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: newTime === s.start_time ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: newTime === s.start_time ? 'var(--primary)' : 'var(--bg-card)',
                      color: newTime === s.start_time ? 'white' : 'var(--text-primary)',
                      fontSize: 'var(--font-size-xs)',
                      cursor: 'pointer'
                    }}
                  >
                    {formatTime(s.start_time)}
                  </button>
                ))}
              </div>
            )}
          </FormField>
        </Modal>
      )}
    </div>
  );
}
