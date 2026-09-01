import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, List, CalendarDays, Download } from 'lucide-react';
import { appointmentsApi, patientsApi, doctorsApi, reportsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const today = new Date().toISOString().slice(0, 10);
const emptyForm = { patientId: '', doctorId: '', date: today, time: '09:00', reason: '', status: 'scheduled', notes: '' };

function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

export default function Appointments() {
  const { user } = useAuth();
  const canManage = ['admin', 'receptionist'].includes(user?.role);
  const canExport = ['admin', 'receptionist'].includes(user?.role);

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('list');
  const [weekAnchor, setWeekAnchor] = useState(today);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');

  // For calendar view we fetch the whole week regardless of dateFilter.
  const [weekAppointments, setWeekAppointments] = useState([]);
  const [weekLoading, setWeekLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = {};
    if (dateFilter) params.date = dateFilter;
    if (statusFilter) params.status = statusFilter;
    const [aRes, pRes, dRes] = await Promise.all([
      appointmentsApi.list(params),
      patients.length ? Promise.resolve({ data: patients }) : patientsApi.list(),
      doctors.length ? Promise.resolve({ data: doctors }) : doctorsApi.list(),
    ]);
    setAppointments(aRes.data);
    setPatients(pRes.data);
    setDoctors(dRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dateFilter, statusFilter]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekAnchor]);

  async function loadWeek() {
    setWeekLoading(true);
    const start = toISODate(weekDays[0]);
    const end = toISODate(weekDays[6]);
    try {
      const res = await appointmentsApi.list({ from: start, to: end });
      setWeekAppointments(res.data);
    } catch {
      // Fallback: fetch each day individually if the backend doesn't support range params.
      const results = await Promise.all(weekDays.map((d) => appointmentsApi.list({ date: toISODate(d) })));
      setWeekAppointments(results.flatMap((r) => r.data));
    } finally {
      setWeekLoading(false);
    }
  }

  useEffect(() => { if (view === 'calendar') loadWeek(); /* eslint-disable-next-line */ }, [view, weekAnchor]);

  function openCreate(prefillDate) {
    setEditing(null);
    setForm(prefillDate ? { ...emptyForm, date: prefillDate } : emptyForm);
    setModalOpen(true);
  }

  function openEdit(appt) {
    setEditing(appt);
    setForm({
      patientId: appt.patientId, doctorId: appt.doctorId, date: appt.date, time: appt.time,
      reason: appt.reason || '', status: appt.status, notes: appt.notes || '',
    });
    setModalOpen(true);
  }

  // Fetch available slots whenever doctor + date are both chosen in the form.
  useEffect(() => {
    if (!modalOpen || !form.doctorId || !form.date) {
      setSlots([]);
      setSlotsMessage('');
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    doctorsApi.availableSlots(form.doctorId, form.date)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.data.slots || []);
        setSlotsMessage(res.data.reason || (res.data.slots?.length ? '' : 'No open slots for this date.'));
      })
      .catch(() => { if (!cancelled) { setSlots([]); setSlotsMessage(''); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [modalOpen, form.doctorId, form.date]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await appointmentsApi.update(editing.id, form);
      } else {
        await appointmentsApi.create(form);
      }
      setModalOpen(false);
      await load();
      if (view === 'calendar') loadWeek();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save appointment');
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(appt, status) {
    try {
      await appointmentsApi.update(appt.id, { status });
      await load();
      if (view === 'calendar') loadWeek();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  }

  async function handleDelete(appt) {
    if (!confirm('Delete this appointment?')) return;
    try {
      await appointmentsApi.remove(appt.id);
      await load();
      if (view === 'calendar') loadWeek();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete appointment');
    }
  }

  async function handleExport() {
    try {
      await reportsApi.downloadCsv('/reports/appointments.csv', 'appointments.csv');
    } catch {
      alert('Failed to export appointments');
    }
  }

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Schedule and track patient visits"
        action={
          <div className="flex items-center gap-2">
            {canExport && (
              <button className="btn-secondary" onClick={handleExport}>
                <Download size={16} /> Export CSV
              </button>
            )}
            {canManage && (
              <button className="btn-primary" onClick={() => openCreate()}>
                <Plus size={16} /> New Appointment
              </button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <List size={15} /> List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CalendarDays size={15} /> Calendar
          </button>
        </div>

        {view === 'list' ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400" />
              <input type="date" className="input w-auto" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-show</option>
            </select>
            {(dateFilter || statusFilter) && (
              <button className="text-sm text-indigo-600 hover:underline" onClick={() => { setDateFilter(''); setStatusFilter(''); }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setWeekAnchor(toISODate(addDays(weekDays[0], -7)))}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-700">
              {weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setWeekAnchor(toISODate(addDays(weekDays[0], 7)))}>
              <ChevronRight size={18} />
            </button>
            <button className="text-sm text-indigo-600 hover:underline ml-1" onClick={() => setWeekAnchor(today)}>Today</button>
          </div>
        )}
      </div>

      {view === 'list' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : appointments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No appointments found.</td></tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{a.date} <span className="text-slate-400">{a.time}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-900">{a.Patient?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{a.Doctor?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{a.reason || '—'}</td>
                    <td className="px-4 py-3">
                      {canManage && a.status === 'scheduled' ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => quickStatus(a, 'completed')} className="badge bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Complete</button>
                          <button onClick={() => quickStatus(a, 'cancelled')} className="badge bg-rose-50 text-rose-700 hover:bg-rose-100">Cancel</button>
                        </div>
                      ) : (
                        <StatusBadge status={a.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(a)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(a)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((d) => {
            const iso = toISODate(d);
            const dayAppts = weekAppointments
              .filter((a) => a.date === iso)
              .sort((a, b) => a.time.localeCompare(b.time));
            const isToday = iso === today;
            return (
              <div key={iso} className={`card min-h-[220px] p-3 ${isToday ? 'ring-2 ring-indigo-400' : ''}`}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">{d.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                    <p className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>{d.getDate()}</p>
                  </div>
                  {canManage && (
                    <button onClick={() => openCreate(iso)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" title="New appointment">
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {weekLoading ? (
                    <p className="text-xs text-slate-400">Loading...</p>
                  ) : dayAppts.length === 0 ? (
                    <p className="text-xs text-slate-300">No appointments</p>
                  ) : (
                    dayAppts.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => canManage && openEdit(a)}
                        className={`block w-full rounded-md px-2 py-1.5 text-left text-xs leading-tight transition-colors ${
                          a.status === 'cancelled' ? 'bg-rose-50 text-rose-600 line-through' :
                          a.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <span className="font-semibold">{a.time}</span> {a.Patient?.name}
                        <br /><span className="text-[10px] opacity-75">{a.Doctor?.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Appointment' : 'New Appointment'} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Patient *</label>
            <select required className="input" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Select patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Doctor *</label>
            <select required className="input" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
              <option value="">Select doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" required className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Time *</label>
            {form.doctorId && slots.length > 0 ? (
              <select required className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
                {!slots.includes(form.time) && <option value={form.time}>{form.time} (current)</option>}
                {slots.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type="time" required className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            )}
            {slotsLoading && <p className="mt-1 text-xs text-slate-400">Checking availability...</p>}
            {!slotsLoading && slotsMessage && <p className="mt-1 text-xs text-amber-600">{slotsMessage}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Reason</label>
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          {editing && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No-show</option>
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Appointment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
