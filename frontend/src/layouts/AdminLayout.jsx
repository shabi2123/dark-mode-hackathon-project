import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Dark Sidebar - Fintech style */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="var(--primary)" />
            <path d="M12 20h16M20 12v16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'white' }}>
              BankFlow Admin
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Branch Management
            </div>
          </div>
        </div>

        <nav className="admin-sidebar-menu">
          <NavLink to="/admin" end className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <span>📊</span>
            <span>Executive Dashboard</span>
          </NavLink>

          <NavLink to="/admin/monitor" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <span>🖥️</span>
            <span>Live Queue Monitor</span>
          </NavLink>

          <NavLink to="/admin/appointments" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <span>📅</span>
            <span>Master Appointments</span>
          </NavLink>

          <NavLink to="/admin/counters" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <span>🪑</span>
            <span>Counter Management</span>
          </NavLink>

          <NavLink to="/admin/staff" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <span>👥</span>
            <span>Staff & Workload</span>
          </NavLink>

          <NavLink to="/admin/services" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <span>⚙️</span>
            <span>Services & Capacity</span>
          </NavLink>

          <NavLink to="/admin/analytics" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <span>📈</span>
            <span>Analytics & Insights</span>
          </NavLink>

          <NavLink to="/admin/settings" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <span>🏢</span>
            <span>Branch Settings</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'white' }}>{user?.name}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-body">
        <header className="admin-header">
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Branch Operations Center
            </h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
              Real-time Queue & Appointment Intelligence
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            {/* Branch Selector */}
            <select
              defaultValue="001"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                backgroundColor: 'white',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="001">🏦 Downtown Main Branch (001)</option>
              <option value="002">🏦 North Metro Branch (002)</option>
              <option value="003">🏦 Westside Financial Center (003)</option>
            </select>

            <div style={{
              backgroundColor: 'var(--bg-body)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              color: 'var(--text-secondary)'
            }}>
              📅 {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>

            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              🔄 Refresh Data
            </Button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
