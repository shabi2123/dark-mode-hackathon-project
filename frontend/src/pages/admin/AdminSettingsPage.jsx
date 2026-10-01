import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      setSettings(res.data);
      setDepartments(res.data.departments || []);
    } catch (err) {
      setError('Failed to load branch configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTimeChange = (index, field, value) => {
    setDepartments(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await api.put('/admin/settings', { departments });
      setMessage('Branch operating hours saved successfully!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading branch operational policies..." />;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Branch & System Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Configure branch business hours, smart queue routing engine parameters, and appointment windows.
        </p>
      </div>

      {message && (
        <div style={{
          backgroundColor: 'var(--success-light)',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-lg)',
          fontSize: 'var(--font-size-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger)',
          border: '1px solid #fecaca',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-lg)',
          fontSize: 'var(--font-size-sm)'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.6fr) 1fr', gap: 'var(--space-xl)' }}>
        
        {/* Left Column: Department Operating Hours */}
        <Card
          title="Department Operating Hours"
          subtitle="Define official customer serving hours per banking division"
        >
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {departments.map((dept, idx) => (
                <div
                  key={dept.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-md)',
                    backgroundColor: 'var(--bg-body)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                      {dept.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Division Code: <strong>{dept.code}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={dept.working_hours_start ? dept.working_hours_start.substring(0, 5) : '08:00'}
                        onChange={(e) => handleTimeChange(idx, 'working_hours_start', e.target.value + ':00')}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          fontSize: 'var(--font-size-sm)',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>

                    <span style={{ color: 'var(--text-muted)', marginTop: 14 }}>—</span>

                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                        End Time
                      </label>
                      <input
                        type="time"
                        value={dept.working_hours_end ? dept.working_hours_end.substring(0, 5) : '16:00'}
                        onChange={(e) => handleTimeChange(idx, 'working_hours_end', e.target.value + ':00')}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          fontSize: 'var(--font-size-sm)',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving Changes...' : '💾 Save Operating Hours'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Right Column: Engine Rules & Branch Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          
          <Card
            title="Branch Parameters"
            subtitle="Core operational constants and rules"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Branch Name</span>
                <strong>{settings?.branch_name || 'BankFlow Main Branch'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Branch Code</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{settings?.branch_code || 'BF-001'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Arrival Check-in Window</span>
                <strong>± {settings?.check_in_window_minutes || 10} minutes</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Max Daily Bookings / Customer</span>
                <strong>{settings?.max_appointments_per_user_per_day || 3} per day</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Live Sync Polling</span>
                <strong>{settings?.polling_interval_seconds || 10}s interval</strong>
              </div>
            </div>
          </Card>

          <Card
            title="Queue Intelligence Engines"
            subtitle="Status of active automated routing and rescue subsystems"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{
                padding: 'var(--space-sm) var(--space-md)',
                backgroundColor: 'var(--bg-body)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--success)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 'var(--font-size-sm)' }}>Smart Counter Capability Matching</strong>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Active</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Dispatches customers only to active counters verified in <code>counter_services</code> capability matrix.
                </p>
              </div>

              <div style={{
                padding: 'var(--space-sm) var(--space-md)',
                backgroundColor: 'var(--bg-body)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--success)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 'var(--font-size-sm)' }}>Queue Rescue & Reassignment</strong>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Active</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Automatically re-routes waiting tokens without loss of queue seniority when a counter switches to break or closed.
                </p>
              </div>

              <div style={{
                padding: 'var(--space-sm) var(--space-md)',
                backgroundColor: 'var(--bg-body)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--success)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 'var(--font-size-sm)' }}>Service Document Readiness Pre-Check</strong>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Active</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Calculates customer document readiness % before token issuance; warns customer while permitting non-blocking override.
                </p>
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}
