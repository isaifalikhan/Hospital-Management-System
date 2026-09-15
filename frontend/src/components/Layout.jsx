import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Stethoscope, CalendarClock, Receipt, Pill,
  UserCog, LogOut, HeartPulse, Building2, FlaskConical, BedDouble, ScrollText,
  DatabaseBackup, Clock, CalendarDays, LineChart, Ticket, PhoneCall, KeyRound, TestTube,
  Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import Modal from './Modal';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab'] },
  { to: '/checkin', label: 'OPD', icon: Ticket, roles: ['admin', 'receptionist'] },
  { to: '/queue', label: 'Queue', icon: PhoneCall, roles: ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab'] },
  { to: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab'] },
  { to: '/appointments', label: 'Appointments', icon: CalendarClock, roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/lab-orders', label: 'Laboratory', icon: FlaskConical, roles: ['admin', 'doctor', 'receptionist', 'lab'] },
  { to: '/lab-tests', label: 'Lab Test Prices', icon: TestTube, roles: ['admin'] },
  { to: '/admissions', label: 'Admissions', icon: BedDouble, roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope, roles: ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab'] },
  { to: '/departments', label: 'Departments', icon: Building2, roles: ['admin'] },
  { to: '/attendance', label: 'Attendance', icon: Clock, roles: ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab'] },
  { to: '/roster', label: 'Shift Roster', icon: CalendarDays, roles: ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab'] },
  { to: '/billing', label: 'Billing', icon: Receipt, roles: ['admin', 'receptionist'] },
  { to: '/pharmacy', label: 'Pharmacy', icon: Pill, roles: ['admin', 'pharmacist'] },
  { to: '/users', label: 'Staff Users', icon: UserCog, roles: ['admin'] },
  { to: '/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['admin'] },
  { to: '/backup', label: 'Data Backup', icon: DatabaseBackup, roles: ['admin'] },
  { to: '/insights', label: 'Owner Insights', icon: LineChart, roles: ['admin'] },
];

const roleColors = {
  admin: 'bg-indigo-100 text-indigo-700',
  doctor: 'bg-emerald-100 text-emerald-700',
  receptionist: 'bg-amber-100 text-amber-700',
  pharmacist: 'bg-sky-100 text-sky-700',
  lab: 'bg-purple-100 text-purple-700',
};

const emptyPwForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwForm, setPwForm] = useState(emptyPwForm);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function openPasswordModal() {
    setPwForm(emptyPwForm);
    setPwError('');
    setPwModalOpen(true);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New password and confirmation do not match');
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwModalOpen(false);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="flex h-screen">
      {sidebarOpen && (
        <div
          className="modal-backdrop fixed inset-0 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="tone-indigo flex h-9 w-9 items-center justify-center rounded-xl">
              <HeartPulse size={20} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight tracking-tight text-slate-900">MediCare HMS</p>
              <p className="text-xs text-slate-500">Hospital Management</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200/60 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="tone-indigo flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
              <span className={`badge ${roleColors[user?.role] || 'bg-slate-100 text-slate-700'} capitalize`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button onClick={openPasswordModal} className="btn-secondary w-full mb-2">
            <KeyRound size={16} /> Change Password
          </button>
          <button onClick={handleLogout} className="btn-secondary w-full">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="topbar flex items-center gap-3 px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="tone-indigo flex h-8 w-8 items-center justify-center rounded-lg">
            <HeartPulse size={16} />
          </div>
          <p className="text-sm font-bold tracking-tight text-slate-900">MediCare HMS</p>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>

      <Modal open={pwModalOpen} onClose={() => setPwModalOpen(false)} title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-3">
          {pwError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{pwError}</p>
          )}
          <div>
            <label className="label">Current Password *</label>
            <input
              required
              type="password"
              className="input"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">New Password *</label>
            <input
              required
              type="password"
              minLength={6}
              className="input"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-400">At least 6 characters.</p>
          </div>
          <div>
            <label className="label">Confirm New Password *</label>
            <input
              required
              type="password"
              className="input"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setPwModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pwSaving}>{pwSaving ? 'Saving...' : 'Update Password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
