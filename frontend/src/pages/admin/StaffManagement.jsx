import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/admin/staff');
      setStaffList(res.data);
    } catch (err) {
      console.error('Failed to load staff list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  if (loading) return <LoadingSpinner text="Loading branch staff roster..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Branch Staff Operations & Workload</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Monitor service staff assignments, daily throughput, and counter presence.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchStaff}>
          🔄 Refresh Roster
        </Button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Assigned Counter</th>
                <th>Department</th>
                <th>Customers Served Today</th>
                <th>Account Status</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(s => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.email}</td>
                  <td>
                    <span style={{
                      backgroundColor: s.role === 'manager' ? '#ede9fe' : 'var(--border-light)',
                      color: s.role === 'manager' ? '#6d28d9' : 'var(--text-primary)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {s.role}
                    </span>
                  </td>
                  <td>
                    {s.counter_name ? (
                      <strong style={{ color: 'var(--primary)' }}>{s.counter_name}</strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>{s.department_name || '—'}</td>
                  <td>
                    <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--success)' }}>
                      {s.total_served_today}
                    </strong> served
                  </td>
                  <td>
                    <Badge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
