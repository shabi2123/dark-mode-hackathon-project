import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import api from '../api/client';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications');
        const unread = res.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } catch (err) {
        // quiet ignore
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="customer-layout">
      <header className="customer-navbar">
        <Link to="/customer" className="brand-logo">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="var(--primary)" />
            <path d="M12 20h16M20 12v16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span>BankFlow</span>
        </Link>

        <nav className="customer-nav-links">
          <NavLink to="/customer" end className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/customer/services" className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            Bank Services
          </NavLink>
          <NavLink to="/customer/book" className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            Book Appointment
          </NavLink>
          <NavLink to="/customer/queue-status" className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            Live Queue
          </NavLink>
          <NavLink to="/customer/appointments" className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}>
            My Visits
          </NavLink>
        </nav>

        <div className="user-profile-badge">
          <Link to="/customer/notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '6px' }}>
            <span style={{ fontSize: '1.25rem' }}>🔔</span>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: 'var(--danger)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </Link>

          <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Customer</div>
          </div>

          <Button variant="secondary" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="customer-main-content">
        <Outlet />
      </main>
    </div>
  );
}
