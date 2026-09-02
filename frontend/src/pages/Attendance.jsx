import { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, Filter } from 'lucide-react';
import { attendanceApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function durationLabel(clockIn, clockOut) {
  if (!clockOut) return '—';
  const hours = (new Date(clockOut) - new Date(clockIn)) / 3600000;
  return `${hours.toFixed(1)} hrs`;
}

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [myRecords, setMyRecords] = useState([]);
  const [loadingMy, setLoadingMy] = useState(true);
  const [clocking, setClocking] = useState(false);

  const [allRecords, setAllRecords] = useState([]);
  const [loadingAll, setLoadingAll] = useState(isAdmin);
  const [staff, setStaff] = useState([]);
  const [filters, setFilters] = useState({ userId: '', from: '', to: '' });

  async function loadMine() {
    setLoadingMy(true);
    try {
      const res = await attendanceApi.list({ userId: user.id });
      setMyRecords(res.data);
    } finally {
      setLoadingMy(false);
    }
  }

  async function loadAll() {
    setLoadingAll(true);
    try {
      const params = {};
      if (filters.userId) params.userId = filters.userId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const res = await attendanceApi.list(params);
      setAllRecords(res.data);
    } finally {
      setLoadingAll(false);
    }
  }

  useEffect(() => { loadMine(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (!isAdmin) return;
    usersApi.list().then((res) => setStaff(res.data)).catch(() => {});
    // eslint-disable-next-line
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
    // eslint-disable-next-line
  }, [isAdmin, filters.userId, filters.from, filters.to]);

  const openRecord = myRecords.find((r) => !r.clockOut);
  const displayRecords = isAdmin ? allRecords : myRecords;
  const displayLoading = isAdmin ? loadingAll : loadingMy;
  const colCount = isAdmin ? 5 : 4;

  async function handleClockIn() {
    setClocking(true);
    try {
      await attendanceApi.clockIn();
      await loadMine();
      if (isAdmin) await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clock in');
    } finally {
      setClocking(false);
    }
  }

  async function handleClockOut() {
    setClocking(true);
    try {
      await attendanceApi.clockOut();
      await loadMine();
      if (isAdmin) await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clock out');
    } finally {
      setClocking(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={isAdmin ? 'Clock in/out and review hospital-wide attendance' : 'Clock in and out, and review your attendance history'}
      />

      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${openRecord ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            <Clock size={22} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {openRecord ? `Clocked in since ${formatDateTime(openRecord.clockIn)}` : 'Not clocked in'}
            </p>
            <p className="text-sm text-slate-500">{user?.name} · <span className="capitalize">{user?.role}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={handleClockIn} disabled={clocking || !!openRecord}>
            <LogIn size={16} /> Clock In
          </button>
          <button className="btn-secondary" onClick={handleClockOut} disabled={clocking || !openRecord}>
            <LogOut size={16} /> Clock Out
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Filter size={15} className="text-slate-400" />
          <select className="input w-auto" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })}>
            <option value="">All staff</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" className="input w-auto" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <span className="text-sm text-slate-400">to</span>
          <input type="date" className="input w-auto" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              {isAdmin && <th className="px-4 py-3">Staff</th>}
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Clock In</th>
              <th className="px-4 py-3">Clock Out</th>
              <th className="px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayLoading ? (
              <tr><td colSpan={colCount} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : displayRecords.length === 0 ? (
              <tr><td colSpan={colCount} className="px-4 py-8 text-center text-slate-400">No attendance records found.</td></tr>
            ) : (
              displayRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  {isAdmin && <td className="px-4 py-3 font-medium text-slate-900">{r.User?.name || `User #${r.userId}`}</td>}
                  <td className="px-4 py-3 text-slate-600">{r.date}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(r.clockIn)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.clockOut ? formatDateTime(r.clockOut) : <span className="font-medium text-emerald-600">Active</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{durationLabel(r.clockIn, r.clockOut)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
