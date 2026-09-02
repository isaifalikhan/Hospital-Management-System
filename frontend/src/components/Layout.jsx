import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Stethoscope, CalendarClock, Receipt, Pill,
  UserCog, LogOut, HeartPulse, Building2, FlaskConical, BedDouble, ScrollText, LineChart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'receptionist', 'pharmacist'] },
  { to: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/appointments', label: 'Appointments', icon: CalendarClock, roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/lab-orders', label: 'Lab Orders', icon: FlaskConical, roles: ['admin', 'doctor'] },
  { to: '/admissions', label: 'Admissions', icon: BedDouble, roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope, roles: ['admin', 'doctor', 'receptionist', 'pharmacist'] },
  { to: '/departments', label: 'Departments', icon: Building2, roles: ['admin'] },
  { to: '/billing', label: 'Billing', icon: Receipt, roles: ['admin', 'receptionist'] },
  { to: '/pharmacy', label: 'Pharmacy', icon: Pill, roles: ['admin', 'pharmacist'] },
  { to: '/users', label: 'Staff Users', icon: UserCog, roles: ['admin'] },
  { to: '/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['admin'] },
  { to: '/insights', label: 'Owner Insights', icon: LineChart, roles: ['admin'] },
];

const roleColors = {
  admin: 'bg-indigo-100 text-indigo-700',
  doctor: 'bg-emerald-100 text-emerald-700',
  receptionist: 'bg-amber-100 text-amber-700',
  pharmacist: 'bg-sky-100 text-sky-700',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <HeartPulse size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">MediCare HMS</p>
            <p className="text-xs text-slate-500">Hospital Management</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
              <span className={`badge ${roleColors[user?.role] || 'bg-slate-100 text-slate-700'} capitalize`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
