import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ReadinessCheckModal from '../../components/common/ReadinessCheckModal';
import api from '../../api/client';
import { formatTime } from '../../utils/formatters';

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const preselectedServiceId = searchParams.get('service_id');
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(preselectedServiceId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successApt, setSuccessApt] = useState(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          api.get('/departments'),
          api.get('/services')
        ]);
        setDepartments(dRes.data);
        setServices(sRes.data);

        if (preselectedServiceId) {
          const s = sRes.data.find(x => String(x.id) === String(preselectedServiceId));
          if (s) {
            setSelectedDeptId(String(s.department_id));
            setSelectedServiceId(String(s.id));
          }
        } else if (dRes.data.length > 0) {
          setSelectedDeptId(String(dRes.data[0].id));
        }
      } catch (err) {
        setError('Failed to load services data');
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, [preselectedServiceId]);

  // When service or date changes, fetch available time slots
  useEffect(() => {
    if (!selectedServiceId || !date) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError('');
      try {
        const res = await api.get(`/services/${selectedServiceId}/slots?date=${date}`);
        setSlots(res.data);
        if (res.data.length > 0) {
          setSelectedSlot(res.data[0].start_time);
        } else {
          setSelectedSlot('');
        }
      } catch (err) {
        setError('Failed to load slots for this date');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedServiceId, date]);

  const handleDeptChange = (deptId) => {
    setSelectedDeptId(deptId);
    const available = services.filter(s => String(s.department_id) === String(deptId));
    if (available.length > 0) {
      setSelectedServiceId(String(available[0].id));
    } else {
      setSelectedServiceId('');
    }
  };

  const [showReadinessModal, setShowReadinessModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedServiceId) {
      setError('Please select a service');
      return;
    }
    if (!date) {
      setError('Please select a date');
      return;
    }
    if (!selectedSlot) {
      setError('Please choose an available time slot');
      return;
    }

    setShowReadinessModal(true);
  };

  const handleConfirmBooking = async (readinessData) => {
    setShowReadinessModal(false);
    setSubmitting(true);
    try {
      const res = await api.post('/appointments', {
        service_id: parseInt(selectedServiceId),
        appointment_date: date,
        start_time: selectedSlot,
        notes: notes.trim() || undefined,
        readiness_percentage: readinessData.readiness_percentage,
        readiness_status: readinessData.readiness_status,
        missing_requirements: readinessData.missing_requirements
      });
      setSuccessApt(res.data);
    } catch (err) {
      setError(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading appointment calendar..." />;

  if (successApt) {
    return (
      <div style={{ maxWidth: 540, margin: 'var(--space-2xl) auto' }}>
        <Card style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-md)' }}>🎉</div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--success)' }}>
            Appointment Confirmed!
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 20px' }}>
            Your appointment has been successfully scheduled. Please arrive 5-10 minutes prior to your time slot for check-in.
          </p>

          <div style={{
            backgroundColor: 'var(--bg-body)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'left',
            marginBottom: 'var(--space-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Appointment Number:</span>
              <strong style={{ color: 'var(--primary)', fontSize: 'var(--font-size-lg)' }}>
                {successApt.appointment_number}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Date:</span>
              <strong>{successApt.appointment_date}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Time Slot:</span>
              <strong>{formatTime(successApt.start_time)} - {formatTime(successApt.end_time)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => navigate('/customer/appointments')}>
              View My Appointments
            </Button>
            <Button variant="secondary" onClick={() => navigate('/customer')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const deptServices = services.filter(s => String(s.department_id) === String(selectedDeptId));
  const activeService = services.find(s => String(s.id) === String(selectedServiceId));

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Schedule Branch Appointment</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Reserve a priority time slot at your preferred department to bypass walk-in waiting.
        </p>
      </div>

      <Card>
        {error && (
          <div style={{
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)',
            fontSize: 'var(--font-size-sm)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Department */}
          <FormField label="1. Select Department" required>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-sm)' }}>
              {departments.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleDeptChange(String(d.id))}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedDeptId === String(d.id) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: selectedDeptId === String(d.id) ? 'var(--primary-light)' : 'var(--bg-card)',
                    color: selectedDeptId === String(d.id) ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: selectedDeptId === String(d.id) ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: 'var(--font-size-sm)' }}>{d.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hours: 8 AM - 4 PM</div>
                </button>
              ))}
            </div>
          </FormField>

          {/* Step 2: Service */}
          <FormField label="2. Select Banking Service" required>
            <select
              className="form-select"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              required
            >
              <option value="">-- Choose a service --</option>
              {deptServices.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} (~{s.avg_duration_minutes} mins)
                </option>
              ))}
            </select>
            {activeService && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                {activeService.description}
              </span>
            )}
          </FormField>

          {/* Step 3: Date */}
          <FormField label="3. Choose Appointment Date" required>
            <input
              type="date"
              className="form-input"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </FormField>

          {/* Step 4: Time Slot */}
          <FormField label="4. Available Time Slots" required>
            {loadingSlots ? (
              <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                Checking available slots...
              </div>
            ) : slots.length === 0 ? (
              <div style={{
                padding: 'var(--space-lg)',
                backgroundColor: 'var(--bg-body)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                No available appointment slots found for this date. Please try another day.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 'var(--space-xs)',
                maxHeight: 200,
                overflowY: 'auto',
                padding: 4
              }}>
                {slots.map(s => (
                  <button
                    key={s.start_time}
                    type="button"
                    onClick={() => setSelectedSlot(s.start_time)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: selectedSlot === s.start_time ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: selectedSlot === s.start_time ? 'var(--primary)' : 'var(--bg-card)',
                      color: selectedSlot === s.start_time ? 'white' : 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: 'var(--font-size-xs)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {formatTime(s.start_time)}
                  </button>
                ))}
              </div>
            )}
          </FormField>

          {/* Optional Notes */}
          <FormField label="Visit Notes / Specific Requests (Optional)">
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Bringing supporting tax docs, joint account setup..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={!selectedSlot || loadingSlots}
            style={{ width: '100%', marginTop: 'var(--space-md)' }}
          >
            📋 Check Readiness & Reserve Appointment
          </Button>
        </form>
      </Card>

      {showReadinessModal && activeService && (
        <ReadinessCheckModal
          isOpen={showReadinessModal}
          onClose={() => setShowReadinessModal(false)}
          service={activeService}
          onConfirm={handleConfirmBooking}
          actionType="appointment"
        />
      )}
    </div>
  );
}
