import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await api.get('/services');
      setServices(res.data);
    } catch (err) {
      console.error('Failed to load services', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/services/${editModal.id}`, {
        name: editModal.name,
        description: editModal.description,
        avg_duration_minutes: parseInt(editModal.avg_duration_minutes),
        max_daily_appointments: parseInt(editModal.max_daily_appointments),
        status: editModal.status
      });
      setEditModal(null);
      await fetchServices();
    } catch (err) {
      alert(err.message || 'Failed to update service');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading service catalog..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Banking Services & Capacity</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Configure estimated service durations (influencing queue wait times) and daily appointment limits.
          </p>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Department</th>
                <th>Est. Duration</th>
                <th>Max Daily Appointments</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.description}</div>
                  </td>
                  <td>{s.department_name}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>~{s.avg_duration_minutes} min</span>
                  </td>
                  <td>
                    <span>{s.max_daily_appointments} slots/day</span>
                  </td>
                  <td>
                    <Badge status={s.status} />
                  </td>
                  <td>
                    <Button variant="secondary" size="sm" onClick={() => setEditModal({ ...s })}>
                      Edit Rules
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Service Modal */}
      {editModal && (
        <Modal
          isOpen={true}
          onClose={() => setEditModal(null)}
          title={`Configure: ${editModal.name}`}
        >
          <form onSubmit={handleSave}>
            <FormField label="Service Name" required>
              <input
                type="text"
                className="form-input"
                value={editModal.name}
                onChange={(e) => setEditModal(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </FormField>

            <FormField label="Description">
              <textarea
                className="form-textarea"
                rows={2}
                value={editModal.description || ''}
                onChange={(e) => setEditModal(prev => ({ ...prev, description: e.target.value }))}
              />
            </FormField>

            <FormField label="Average Service Duration (Minutes)" hint="Used in deterministic waiting time formula" required>
              <input
                type="number"
                min="1"
                max="120"
                className="form-input"
                value={editModal.avg_duration_minutes}
                onChange={(e) => setEditModal(prev => ({ ...prev, avg_duration_minutes: e.target.value }))}
                required
              />
            </FormField>

            <FormField label="Max Daily Appointments (Per Slot)" hint="Prevents branch counter overbooking" required>
              <input
                type="number"
                min="1"
                max="100"
                className="form-input"
                value={editModal.max_daily_appointments}
                onChange={(e) => setEditModal(prev => ({ ...prev, max_daily_appointments: e.target.value }))}
                required
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              <Button variant="secondary" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={submitting}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
