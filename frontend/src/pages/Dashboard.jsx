import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Stethoscope, CalendarClock, DollarSign, PackageX, Clock } from 'lucide-react';
import { dashboardApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .summary()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
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
      </div>

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
