import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

// Layouts
import CustomerLayout from '../layouts/CustomerLayout';
import StaffLayout from '../layouts/StaffLayout';
import AdminLayout from '../layouts/AdminLayout';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

// Customer Pages
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import ServicesPage from '../pages/customer/ServicesPage';
import BookAppointment from '../pages/customer/BookAppointment';
import JoinQueue from '../pages/customer/JoinQueue';
import QueueStatus from '../pages/customer/QueueStatus';
import MyAppointments from '../pages/customer/MyAppointments';
import NotificationsPage from '../pages/customer/NotificationsPage';

// Staff Pages
import StaffDashboard from '../pages/staff/StaffDashboard';
import StaffAppointments from '../pages/staff/StaffAppointments';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import QueueMonitor from '../pages/admin/QueueMonitor';
import CounterManagement from '../pages/admin/CounterManagement';
import StaffManagement from '../pages/admin/StaffManagement';
import ServiceManagement from '../pages/admin/ServiceManagement';
import AnalyticsPage from '../pages/admin/AnalyticsPage';
import AdminAppointmentsPage from '../pages/admin/AdminAppointmentsPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const routes = {
    customer: '/customer',
    staff: '/staff',
    manager: '/admin',
    admin: '/admin',
  };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Customer Panel */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute roles={['customer']}>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CustomerDashboard />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="book" element={<BookAppointment />} />
          <Route path="join-queue" element={<JoinQueue />} />
          <Route path="queue-status" element={<QueueStatus />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Staff / Operations Panel */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute roles={['staff', 'manager', 'admin']}>
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffDashboard />} />
          <Route path="appointments" element={<StaffAppointments />} />
        </Route>

        {/* Admin / Manager Panel */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['manager', 'admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="monitor" element={<QueueMonitor />} />
          <Route path="appointments" element={<AdminAppointmentsPage />} />
          <Route path="counters" element={<CounterManagement />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="services" element={<ServiceManagement />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
