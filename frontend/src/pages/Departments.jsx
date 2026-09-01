import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { departmentsApi } from '../api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await departmentsApi.list();
    setDepartments(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '' });
    setModalOpen(true);
  }

  function openEdit(dept) {
    setEditing(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await departmentsApi.update(editing.id, form);
      } else {
        await departmentsApi.create(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(dept) {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await departmentsApi.remove(dept.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete department');
    }
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Organize doctors into hospital departments"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Department
          </button>
        }
      />

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="mb-2 flex items-start justify-between">
                <p className="font-semibold text-slate-900">{d.name}</p>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(d)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(d)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-3">{d.description || 'No description'}</p>
              <p className="text-xs text-slate-400">{d.Doctors?.length || 0} doctor(s)</p>
            </div>
          ))}
          {departments.length === 0 && <p className="text-slate-400 col-span-full text-center py-8">No departments yet.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'New Department'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
