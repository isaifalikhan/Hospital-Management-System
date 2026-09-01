import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Stethoscope, CalendarClock, DollarSign, PackageX, Clock, CalendarX2 } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

const PIE_COLORS = ['#6366f1', '#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6'];

function formatDay(d) {
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .summary()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
    dashboardApi
      .analytics()
      .then((res) => setAnalytics(res.data))
      .catch(() => {});
  }, []);

  const greeting = `Welcome back, ${user?.name?.split(' ')[0] || ''}`;

  if (error) {
    return <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  }

  if (!data) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div>
      <PageHeader title={greeting} subtitle="Here's what's happening at your hospital today." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Patients" value={data.totalPatients} tone="indigo" />
        <StatCard icon={Stethoscope} label="Active Doctors" value={data.totalDoctors} tone="emerald" />
        <StatCard icon={CalendarClock} label="Today's Appointments" value={data.todaysAppointments} tone="sky" />
        <StatCard icon={Clock} label="Upcoming Appointments" value={data.upcomingAppointments} tone="amber" />
        <StatCard
          icon={DollarSign}
          label="Outstanding Revenue"
          value={`$${Number(data.outstandingRevenue).toFixed(2)}`}
          tone="rose"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue This Month"
          value={`$${Number(data.revenueThisMonth).toFixed(2)}`}
          tone="emerald"
        />
        <StatCard icon={PackageX} label="Low Stock Medicines" value={data.lowStockCount} tone="rose" />
        <StatCard icon={CalendarX2} label="Expiring / Expired Medicines" value={data.expiredCount + data.expiringSoonCount} tone="amber" />
      </div>

      {analytics && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Revenue Trend (Last 14 Days)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.revenueTrend.map((d) => ({ ...d, day: formatDay(d.date) }))}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Appointments by Department</h2>
            {analytics.appointmentsByDepartment.length === 0 ? (
              <p className="text-sm text-slate-500">No appointment data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analytics.appointmentsByDepartment}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {analytics.appointmentsByDepartment.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5 lg:col-span-3">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Appointments Booked (Last 14 Days)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.appointmentsTrend.map((d) => ({ ...d, day: formatDay(d.date) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="appointments" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Today's Appointments</h2>
            <Link to="/appointments" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          {data.recentAppointments.length === 0 ? (
            <p className="text-sm text-slate-500">No appointments scheduled for today.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentAppointments.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{appt.Patient?.name}</p>
                    <p className="text-xs text-slate-500">
                      Dr. {appt.Doctor?.name?.replace(/^Dr\.?\s*/, '')} • {appt.time}
                    </p>
                  </div>
                  <StatusBadge status={appt.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recently Registered Patients</h2>
            <Link to="/patients" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          {data.recentPatients.length === 0 ? (
            <p className="text-sm text-slate-500">No patients registered yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentPatients.map((p) => (
                <li key={p.id} className="py-3">
                  <Link to={`/patients/${p.id}`} className="flex items-center justify-between hover:opacity-80">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.mrn} • {p.phone || 'No phone'}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
