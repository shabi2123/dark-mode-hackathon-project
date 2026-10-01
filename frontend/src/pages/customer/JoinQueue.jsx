import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ReadinessCheckModal from '../../components/common/ReadinessCheckModal';
import api from '../../api/client';

export default function JoinQueue() {
  const [searchParams] = useSearchParams();
  const preselectedService = searchParams.get('service_id');
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(preselectedService || '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showReadinessModal, setShowReadinessModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          api.get('/departments'),
          api.get('/services')
        ]);
        setDepartments(dRes.data);
        setServices(sRes.data);

        if (preselectedService) {
          const s = sRes.data.find(x => String(x.id) === String(preselectedService));
          if (s) {
            setSelectedDeptId(String(s.department_id));
            setSelectedServiceId(String(s.id));
          }
        } else if (dRes.data.length > 0) {
          setSelectedDeptId(String(dRes.data[0].id));
          const deptSvcs = sRes.data.filter(s => s.department_id === dRes.data[0].id);
          if (deptSvcs.length > 0) setSelectedServiceId(String(deptSvcs[0].id));
        }
      } catch (err) {
        setError('Failed to load bank services');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [preselectedService]);

  const handleDeptChange = (deptId) => {
    setSelectedDeptId(deptId);
    const available = services.filter(s => String(s.department_id) === String(deptId));
    if (available.length > 0) {
      setSelectedServiceId(String(available[0].id));
    } else {
      setSelectedServiceId('');
    }
  };

  const activeService = services.find(s => String(s.id) === String(selectedServiceId));

  const handleOpenReadiness = (e) => {
    e.preventDefault();
    if (!selectedServiceId) {
      setError('Please select a service first');
      return;
    }
    setError('');
    setShowReadinessModal(true);
  };

  const handleConfirmJoin = async (readinessData) => {
    setShowReadinessModal(false);
    setSubmitting(true);
    setError('');

    try {
      await api.post('/queue/join', {
        service_id: parseInt(selectedServiceId),
        readiness_percentage: readinessData.readiness_percentage,
        readiness_status: readinessData.readiness_status,
        missing_requirements: readinessData.missing_requirements
      });
      navigate('/customer/queue-status');
    } catch (err) {
      setError(err.message || 'Failed to join queue. You may already have an active token.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Checking queue availability..." />;

  const deptServices = services.filter(s => String(s.department_id) === String(selectedDeptId));

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Join Walk-in Digital Queue</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Check your document readiness, receive an instant digital token, and track your turn live.
        </p>
      </div>

      <Card>
        {error && (
          <div style={{
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)',
            fontSize: 'var(--font-size-sm)'
          }}>
            {error}
            {error.includes('already have an active token') && (
              <div style={{ marginTop: 8 }}>
                <Button size="sm" variant="primary" onClick={() => navigate('/customer/queue-status')}>
                  View Active Token →
                </Button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleOpenReadiness}>
          {/* Step 1: Department */}
          <FormField label="1. Select Department" required>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-sm)' }}>
              {departments.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleDeptChange(String(d.id))}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedDeptId === String(d.id) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: selectedDeptId === String(d.id) ? 'var(--primary-light)' : 'var(--bg-card)',
                    color: selectedDeptId === String(d.id) ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: selectedDeptId === String(d.id) ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 'var(--font-size-sm)' }}>{d.name}</div>
                </button>
              ))}
            </div>
          </FormField>

          {/* Step 2: Service */}
          <FormField label="2. Choose Service Needed" required>
            <select
              className="form-select"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              required
            >
              <option value="">-- Choose service --</option>
              {deptServices.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} (~{s.avg_duration_minutes} mins)
                </option>
              ))}
            </select>
          </FormField>

          {/* Service Requirements Preview Box */}
          {activeService && (
            <div style={{
              backgroundColor: 'var(--bg-body)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)',
              border: '1px solid var(--border-light)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Required Documents Checklist
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ~{activeService.avg_duration_minutes} mins
                </span>
              </div>

              <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                {(activeService.requirements || ['Valid Identification']).map((req, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={!selectedServiceId}
            style={{ width: '100%' }}
          >
            📋 Check Service Readiness & Join Queue
          </Button>
        </form>
      </Card>

      {/* Service Readiness Modal */}
      {showReadinessModal && activeService && (
        <ReadinessCheckModal
          isOpen={showReadinessModal}
          onClose={() => setShowReadinessModal(false)}
          service={activeService}
          onConfirm={handleConfirmJoin}
          actionType="queue"
        />
      )}
    </div>
  );
}
