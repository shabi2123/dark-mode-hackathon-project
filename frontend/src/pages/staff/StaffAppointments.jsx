import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';
import { formatTime } from '../../utils/formatters';

export default function StaffAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(null);

  const fetchApts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/appointments?date=${today}`);
      setAppointments(res.data);
    } catch (err) {
      console.error('Error fetching today appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApts();
    const interval = setInterval(fetchApts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualCheckIn = async (id) => {
    setCheckingIn(id);
    try {
      await api.post(`/appointments/${id}/check-in`);
      alert('Customer successfully checked in and placed into queue!');
      await fetchApts();
    } catch (err) {
      alert(err.message || 'Check-in failed');
    } finally {
      setCheckingIn(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading today's schedule..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Today's Branch Appointments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Scheduled customer visits for today. Assist with manual check-in upon customer arrival.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchApts}>
          🔄 Refresh
        </Button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {appointments.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No appointments scheduled today"
            description="There are currently no customer bookings on the calendar for today."
          />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Appointment #</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Service</th>
                  <th>Department</th>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(apt => (
                  <tr key={apt.id}>
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>{apt.appointment_number}</strong>
                    </td>
                    <td>
                      <strong>{apt.user_name}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--font-size-xs)' }}>{apt.user_phone || apt.user_email}</span>
                    </td>
                    <td>{apt.service_name}</td>
                    <td>{apt.department_name}</td>
                    <td>
                      <strong>{formatTime(apt.start_time)}</strong> - {formatTime(apt.end_time)}
                    </td>
                    <td>
                      <Badge status={apt.status} />
                    </td>
                    <td>
                      {['booked', 'confirmed'].includes(apt.status) ? (
                        <Button
                          variant="success"
                          size="sm"
                          loading={checkingIn === apt.id}
                          onClick={() => handleManualCheckIn(apt.id)}
                        >
                          Check In Customer
                        </Button>
                      ) : (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          {apt.token_number ? `Token ${apt.token_number}` : 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
