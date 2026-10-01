import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import api from '../api/client';

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [counter, setCounter] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchCounter = useCallback(async () => {
    try {
      const res = await api.get('/staff/counter');
      setCounter(res.data);
    } catch (err) {
      console.error('Failed to load counter', err);
    }
  }, []);

  useEffect(() => {
    fetchCounter();
    const interval = setInterval(fetchCounter, 10000);
    return () => clearInterval(interval);
  }, [fetchCounter]);

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await api.patch('/staff/counter/status', { status: newStatus });
      await fetchCounter();
    } catch (err) {
      alert(err.message || 'Failed to update counter status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="staff-layout">
      {/* Top Operations Bar */}
      <header className="staff-topbar">
        <div className="staff-counter-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🏦</span>
            <strong style={{ fontSize: 'var(--font-size-base)', letterSpacing: 0.5 }}>
              BankFlow Staff Operations
            </strong>
          </div>

          {counter ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="counter-pill">
                {counter.name} ({counter.department_name})
              </span>
              <Badge status={counter.status} />
            </div>
          ) : (
            <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>
              Assigning counter...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {counter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: '#94a3b8' }}>Counter Mode:</span>
              <select
                value={counter.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusUpdating}
                style={{
                  backgroundColor: '#1a2249',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 8px',
                  fontSize: 'var(--font-size-xs)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="available">Available (Accepting)</option>
                <option value="busy">Busy (In Service)</option>
                <option value="break">Take a Break (Paused)</option>
                <option value="closed">Closed (Off Duty)</option>
              </select>
            </div>
          )}

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{user?.name}</span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: '#94a3b8', marginLeft: 6 }}>({user?.role})</span>
          </div>

          <Button variant="secondary" size="sm" onClick={handleLogout} style={{ backgroundColor: '#1a2249', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
            Logout
          </Button>
        </div>
      </header>

      {/* Staff Workspace Navigation */}
      <div className="staff-nav">
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <NavLink to="/staff" end className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            Queue & Service Desk
          </NavLink>
          <NavLink to="/staff/appointments" className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            Today's Appointments
          </NavLink>
        </div>

        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
          System Clock: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <main className="staff-main-content">
        <Outlet context={{ counter, refreshCounter: fetchCounter }} />
      </main>
    </div>
  );
}
