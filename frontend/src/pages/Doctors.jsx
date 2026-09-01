import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail } from 'lucide-react';
import { doctorsApi, departmentsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  name: '', specialization: '', qualification: '', phone: '', email: '',
  consultationFee: 0, availableDays: '', availableTime: '', status: 'active', departmentId: '',
};

export default function Doctors() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [dRes, deptRes] = await Promise.all([doctorsApi.list(), departmentsApi.list()]);
      setDoctors(dRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(doc) {
    setEditing(doc);
    setForm({ ...emptyForm, ...doc, departmentId: doc.departmentId || '' });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, departmentId: form.departmentId || null };
      if (editing) {
        await doctorsApi.update(editing.id, payload);
      } else {
        await doctorsApi.create(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save doctor');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doc) {
    if (!confirm(`Remove Dr. ${doc.name}?`)) return;
    try {
      await doctorsApi.remove(doc.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete doctor');
    }
  }

  return (
    <div>
      <PageHeader
        title="Doctors"
        subtitle="Manage physicians and their schedules"
        action={canEdit && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Doctor
          </button>
        )}
      />

      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doc) => (
            <div key={doc.id} className="card p-5">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{doc.name}</p>
                  <p className="text-sm text-slate-500">{doc.specialization || 'General'}</p>
                </div>
                <StatusBadge status={doc.status} />
              </div>
              <p className="text-xs text-slate-500 mb-3">{doc.Department?.name || 'No department'}</p>
              <div className="space-y-1 text-sm text-slate-600 mb-3">
                {doc.phone && <p className="flex items-center gap-1.5"><Phone size={13} /> {doc.phone}</p>}
                {doc.email && <p className="flex items-center gap-1.5"><Mail size={13} /> {doc.email}</p>}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-500">Fee: <span className="text-slate-800 font-medium">${doc.consultationFee}</span></p>
                  {doc.availableDays && <p className="text-xs text-slate-400 mt-0.5">{doc.availableDays} • {doc.availableTime}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(doc)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(doc)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {doctors.length === 0 && <p className="text-slate-400 col-span-full text-center py-8">No doctors found.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Doctor' : 'New Doctor'} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith" />
          </div>
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
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Consultation Fee ($)</label>
            <input type="number" min="0" step="0.01" className="input" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} />
          </div>
          <div>
            <label className="label">Available Days</label>
            <input className="input" value={form.availableDays} onChange={(e) => setForm({ ...form, availableDays: e.target.value })} placeholder="Mon,Tue,Wed" />
          </div>
          <div>
            <label className="label">Available Time</label>
            <input className="input" value={form.availableTime} onChange={(e) => setForm({ ...form, availableTime: e.target.value })} placeholder="09:00-17:00" />
          </div>
          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Doctor'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
