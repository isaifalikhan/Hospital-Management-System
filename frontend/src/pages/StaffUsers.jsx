import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usersApi, doctorsApi, departmentsApi } from '../api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  name: '', username: '', email: '', password: '', role: 'receptionist', active: true,
  // Doctor-profile fields — only sent when role === 'doctor'. A doctor
  // account is useless on its own (booking, check-in, the doctor picker all
  // read from the Doctor profile, not the User row), so creating one here
  // also creates or links that profile in the same request — see
  // backend/controllers/userController.js#create.
  doctorMode: 'new', doctorId: '', specialization: '', qualification: '',
  departmentId: '', consultationFee: 0, phone: '', availableDays: '', availableTime: '',
};

export default function StaffUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [unlinkedDoctors, setUnlinkedDoctors] = useState([]);

  async function load() {
    setLoading(true);
    const res = await usersApi.list();
    setUsers(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Only needed while the "New User" modal is open with role = doctor, but
  // both lists are small and rarely change, so just fetch once on mount.
  useEffect(() => {
    departmentsApi.list().then((res) => setDepartments(res.data)).catch(() => {});
    doctorsApi.list({ unlinked: true }).then((res) => setUnlinkedDoctors(res.data)).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, doctorMode: unlinkedDoctors.length ? 'link' : 'new' });
    setModalOpen(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({ ...emptyForm, ...u, password: '' });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role, active: form.active };
        if (form.password) payload.password = form.password;
        await usersApi.update(editing.id, payload);
      } else {
        const payload = { name: form.name, username: form.username, email: form.email, password: form.password, role: form.role };
        if (form.role === 'doctor') {
          if (form.doctorMode === 'link') {
            payload.doctorId = form.doctorId;
          } else {
            Object.assign(payload, {
              specialization: form.specialization,
              qualification: form.qualification,
              departmentId: form.departmentId || null,
              consultationFee: form.consultationFee || 0,
              phone: form.phone,
              availableDays: form.availableDays,
              availableTime: form.availableTime,
            });
          }
        }
        await usersApi.create(payload);
        // A new doctor profile (or a freshly-linked one) won't be in
        // unlinkedDoctors' complement yet — refresh so the next "New User"
        // doesn't offer an already-linked profile.
        doctorsApi.list({ unlinked: true }).then((res) => setUnlinkedDoctors(res.data)).catch(() => {});
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Delete user "${u.name}"?`)) return;
    try {
      await usersApi.remove(u.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff Users"
        subtitle="Manage login accounts and roles"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New User
          </button>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.username}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{u.role}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.active ? 'active' : 'inactive'} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(u)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'New User'} wide={!editing && form.role === 'doctor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name *</label>
              <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Username *</label>
              <input required disabled={!!editing} className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select required className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="pharmacist">Pharmacist</option>
              </select>
            </div>
            <div>
              <label className="label">{editing ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
              <input required={!editing} type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {editing && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Active
              </label>
            )}
          </div>

          {editing && editing.role === 'doctor' && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              This account's clinical profile (specialization, fee, availability) is managed from the Doctors page.
            </p>
          )}

          {!editing && form.role === 'doctor' && (
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="label mb-2">Doctor Profile</p>

              {unlinkedDoctors.length > 0 && (
                <div className="mb-3 flex gap-4 text-sm text-slate-700">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={form.doctorMode === 'link'} onChange={() => setForm({ ...form, doctorMode: 'link' })} />
                    Link an existing doctor profile
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={form.doctorMode === 'new'} onChange={() => setForm({ ...form, doctorMode: 'new' })} />
                    Create a new profile
                  </label>
                </div>
              )}

              {form.doctorMode === 'link' && unlinkedDoctors.length > 0 ? (
                <div>
                  <label className="label">Existing Doctor Profile *</label>
                  <select required className="input" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
                    <option value="">Select a profile with no login yet</option>
                    {unlinkedDoctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}{d.specialization ? ` — ${d.specialization}` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Specialization</label>
                    <input className="input" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Qualification</label>
                    <input className="input" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                      <option value="">None</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Consultation Fee ($)</label>
                    <input type="number" min="0" step="0.01" className="input" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Available Days</label>
                    <input className="input" value={form.availableDays} onChange={(e) => setForm({ ...form, availableDays: e.target.value })} placeholder="Mon,Tue,Wed" />
                  </div>
                  <div>
                    <label className="label">Available Time</label>
                    <input className="input" value={form.availableTime} onChange={(e) => setForm({ ...form, availableTime: e.target.value })} placeholder="09:00-17:00" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
