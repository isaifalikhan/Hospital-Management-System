import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usersApi } from '../api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = { name: '', username: '', email: '', password: '', role: 'receptionist', active: true };

export default function StaffUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await usersApi.list();
    setUsers(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
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
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await usersApi.update(editing.id, payload);
      } else {
        await usersApi.create(form);
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
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
