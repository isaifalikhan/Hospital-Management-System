import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Filter } from 'lucide-react';
import { appointmentsApi, patientsApi, doctorsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const today = new Date().toISOString().slice(0, 10);
const emptyForm = { patientId: '', doctorId: '', date: today, time: '09:00', reason: '', status: 'scheduled', notes: '' };

export default function Appointments() {
  const { user } = useAuth();
  const canManage = ['admin', 'receptionist'].includes(user?.role);

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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
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
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  }

  async function handleDelete(appt) {
    if (!confirm('Delete this appointment?')) return;
    try {
      await appointmentsApi.remove(appt.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete appointment');
    }
  }

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Schedule and track patient visits"
        action={canManage && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Appointment
          </button>
        )}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
            <input type="time" required className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
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
