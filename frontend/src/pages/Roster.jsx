import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { shiftsApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
  return new Date(new Date(dateStr).getTime() + days * 86400000).toISOString().slice(0, 10);
}

const emptyForm = { userId: '', date: todayStr(), startTime: '09:00', endTime: '17:00', note: '' };

export default function Roster() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [shifts, setShifts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: todayStr(), to: addDays(todayStr(), 6) });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = isAdmin ? { from: range.from, to: range.to } : { from: todayStr() };
      const res = await shiftsApi.list(params);
      setShifts(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isAdmin, range.from, range.to]);

  useEffect(() => {
    if (isAdmin) usersApi.list().then((res) => setStaff(res.data)).catch(() => {});
  }, [isAdmin]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, userId: staff[0]?.id || '' });
    setModalOpen(true);
  }

  function openEdit(shift) {
    setEditing(shift);
    setForm({ userId: shift.userId, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, note: shift.note || '' });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.userId) return alert('Select a staff member');
    setSaving(true);
    try {
      const payload = { ...form, userId: Number(form.userId) };
      if (editing) {
        await shiftsApi.update(editing.id, payload);
      } else {
        await shiftsApi.create(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(shift) {
    if (!confirm(`Remove this shift for ${shift.User?.name || 'this staff member'}?`)) return;
    try {
      await shiftsApi.remove(shift.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete shift');
    }
  }

  const colCount = isAdmin ? 6 : 4;

  return (
    <div>
      <PageHeader
        title="Shift Roster"
        subtitle={isAdmin ? 'Assign and manage staff shifts' : 'Your upcoming shifts'}
        action={isAdmin && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Shift
          </button>
        )}
      />

      {isAdmin && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <CalendarDays size={15} className="text-slate-400" />
          <input type="date" className="input w-auto" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <span className="text-sm text-slate-400">to</span>
          <input type="date" className="input w-auto" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              {isAdmin && <th className="px-4 py-3">Staff</th>}
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Note</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={colCount} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : shifts.length === 0 ? (
              <tr><td colSpan={colCount} className="px-4 py-8 text-center text-slate-400">No shifts scheduled.</td></tr>
            ) : (
              shifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  {isAdmin && <td className="px-4 py-3 font-medium text-slate-900">{s.User?.name || `User #${s.userId}`}</td>}
                  <td className="px-4 py-3 text-slate-600">{s.date}</td>
                  <td className="px-4 py-3 text-slate-600">{s.startTime}</td>
                  <td className="px-4 py-3 text-slate-600">{s.endTime}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={s.note}>{s.note || '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(s)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isAdmin && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Shift' : 'New Shift'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Staff Member *</label>
              <select required className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Select staff...</option>
                {staff.map((st) => <option key={st.id} value={st.id}>{st.name} ({st.role})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input required type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Time *</label>
                <input required type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="label">End Time *</label>
                <input required type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Note</label>
              <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Covering ER, night shift..." />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Shift'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
