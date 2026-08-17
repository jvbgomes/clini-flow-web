import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import api from '../services/api';
import Modal from './Modal';
import './Layout.css';

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconPatients() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [changePwdModal, setChangePwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDark]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New passwords do not match');
      return;
    }
    setPwdSaving(true);
    setPwdError('');
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      addToast('Password changed. Please log in again.');
      setChangePwdModal(false);
      await logout();
      navigate('/login');
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setPwdSaving(false);
    }
  }

  function openChangePwd() {
    setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwdError('');
    setChangePwdModal(true);
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>CliniFlow</h1>
          <p>Clinic Management</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconDashboard />
            Dashboard
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconPatients />
            Patients
          </NavLink>
          <NavLink to="/appointments" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconCalendar />
            Appointments
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-actions">
            <button className="sidebar-action-btn" onClick={() => setIsDark(d => !d)} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <IconSun /> : <IconMoon />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
            <button className="sidebar-action-btn" onClick={openChangePwd}>
              <IconKey />
              Change password
            </button>
          </div>
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <IconLogout />
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {changePwdModal && (
        <Modal
          title="Change Password"
          onClose={() => setChangePwdModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" type="button" onClick={() => setChangePwdModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="change-pwd-form" type="submit" disabled={pwdSaving}>
                {pwdSaving ? 'Saving...' : 'Change Password'}
              </button>
            </>
          }
        >
          {pwdError && <div className="alert alert-error">{pwdError}</div>}
          <form id="change-pwd-form" onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input className="form-input" type="password" value={pwdForm.currentPassword}
                onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input className="form-input" type="password" value={pwdForm.newPassword}
                onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password *</label>
              <input className="form-input" type="password" value={pwdForm.confirmPassword}
                onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))} required minLength={6} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
