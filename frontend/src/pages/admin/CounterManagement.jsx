import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';

export default function CounterManagement() {
  const [counters, setCounters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newCounter, setNewCounter] = useState({ name: '', department_id: '', staff_id: '', status: 'available' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [cRes, dRes, sRes] = await Promise.all([
        api.get('/admin/counters'),
        api.get('/departments'),
        api.get('/admin/staff')
      ]);
      setCounters(cRes.data);
      setDepartments(dRes.data);
      setStaffList(sRes.data);
      if (dRes.data.length > 0 && !newCounter.department_id) {
        setNewCounter(prev => ({ ...prev, department_id: dRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load counters', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (counterId, newStatus) => {
    try {
      await api.put(`/admin/counters/${counterId}`, { status: newStatus });
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update counter status');
    }
  };

  const handleStaffAssign = async (counterId, staffId) => {
    try {
      await api.put(`/admin/counters/${counterId}`, { staff_id: staffId || null });
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to assign staff');
    }
  };

  const handleCreateCounter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/counters', {
        name: newCounter.name,
        department_id: parseInt(newCounter.department_id),
        staff_id: newCounter.staff_id ? parseInt(newCounter.staff_id) : null,
        status: newCounter.status
      });
      setModalOpen(false);
      setNewCounter({ name: '', department_id: departments[0]?.id || '', staff_id: '', status: 'available' });
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create counter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this counter?')) return;
    try {
      await api.delete(`/admin/counters/${id}`);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete counter');
    }
  };

  if (loading) return <LoadingSpinner text="Loading counter configuration..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Service Counter Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Configure branch service desks, toggle counter operational availability, and assign staff members.
          </p>
        </div>

        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Add New Counter
        </Button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Counter Name</th>
                <th>Department</th>
                <th>Assigned Staff</th>
                <th>Operational Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {counters.map(c => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.department_name}</td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', width: 180 }}
                      value={c.staff_id || ''}
                      onChange={(e) => handleStaffAssign(c.id, e.target.value)}
                    >
                      <option value="">-- Unassigned --</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', width: 140 }}
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="break">On Break</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Counter Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Service Counter"
      >
        <form onSubmit={handleCreateCounter}>
          <FormField label="Counter Name" required>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Counter 6 - Rapid Deposit"
              value={newCounter.name}
              onChange={(e) => setNewCounter(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </FormField>

          <FormField label="Department" required>
            <select
              className="form-select"
              value={newCounter.department_id}
              onChange={(e) => setNewCounter(prev => ({ ...prev, department_id: e.target.value }))}
              required
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Assign Staff Member (Optional)">
            <select
              className="form-select"
              value={newCounter.staff_id}
              onChange={(e) => setNewCounter(prev => ({ ...prev, staff_id: e.target.value }))}
            >
              <option value="">-- Assign Later --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </FormField>

          <FormField label="Initial Status" required>
            <select
              className="form-select"
              value={newCounter.status}
              onChange={(e) => setNewCounter(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="available">Available</option>
              <option value="break">On Break</option>
              <option value="closed">Closed</option>
            </select>
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={submitting}>Create Counter</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
