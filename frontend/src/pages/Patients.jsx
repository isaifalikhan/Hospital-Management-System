import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Eye, Download } from 'lucide-react';
import { patientsApi, reportsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  name: '', dob: '', gender: 'male', bloodGroup: '', phone: '', email: '',
  address: '', emergencyContactName: '', emergencyContactPhone: '', allergies: '', status: 'outpatient',
};

export default function Patients() {
  const { user } = useAuth();
  const canEdit = ['admin', 'receptionist'].includes(user?.role);
  const canDelete = user?.role === 'admin';
  const canExport = ['admin', 'receptionist'].includes(user?.role);

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await patientsApi.list(search ? { search } : {});
      setPatients(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(patient) {
    setEditing(patient);
    setForm({ ...emptyForm, ...patient, dob: patient.dob || '' });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await patientsApi.update(editing.id, form);
      } else {
        await patientsApi.create(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(patient) {
    if (!confirm(`Delete patient "${patient.name}"? This cannot be undone.`)) return;
    try {
      await patientsApi.remove(patient.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete patient');
    }
  }

  async function handleExport() {
    try {
      await reportsApi.downloadCsv('/reports/patients.csv', 'patients.csv');
    } catch {
      alert('Failed to export patients');
    }
  }

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Register and manage patient records"
        action={
          <div className="flex items-center gap-2">
            {canExport && (
              <button className="btn-secondary" onClick={handleExport}>
                <Download size={16} /> Export CSV
              </button>
            )}
            {canEdit && (
              <button className="btn-primary" onClick={openCreate}>
                <Plus size={16} /> New Patient
              </button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, MRN, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">MRN</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No patients found.</td></tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.mrn}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{p.gender || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.phone || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/patients/${p.id}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="View">
                        <Eye size={16} />
                      </Link>
                      {canEdit && (
                        <button onClick={() => openEdit(p)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Edit">
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(p)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Patient' : 'New Patient'} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Full Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={form.dob || ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Blood Group</label>
            <input className="input" value={form.bloodGroup || ''} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="e.g. O+" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="outpatient">Outpatient</option>
              <option value="admitted">Admitted</option>
              <option value="discharged">Discharged</option>
            </select>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Emergency Contact Name</label>
            <input className="input" value={form.emergencyContactName || ''} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
          </div>
          <div>
            <label className="label">Emergency Contact Phone</label>
            <input className="input" value={form.emergencyContactPhone || ''} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Allergies</label>
            <input className="input" value={form.allergies || ''} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, None known" />
          </div>
          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Patient'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
