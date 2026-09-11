import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, FlaskConical } from 'lucide-react';
import { labTestsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

const emptyForm = { name: '', price: 0, sampleType: '', referenceRange: '', active: true };

// The hospital's price list for orderable tests. Ordering a test copies the
// price onto the lab order and raises the patient's bill from it (see
// backend/controllers/labOrderController.js#create), so editing a price here
// only affects tests ordered from now on — never a bill already raised.
export default function LabTests() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

  const [tests, setTests] = useState([]);
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
      const res = await labTestsApi.list(search ? { search } : {});
      setTests(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load lab tests');
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

  function openEdit(test) {
    setEditing(test);
    setForm({ ...emptyForm, ...test });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) || 0 };
      if (editing) {
        await labTestsApi.update(editing.id, payload);
      } else {
        await labTestsApi.create(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save lab test');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(test) {
    if (!confirm(`Remove "${test.name}" from the catalogue? Tests already ordered keep their name and price.`)) return;
    try {
      await labTestsApi.remove(test.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete lab test');
    }
  }

  return (
    <div>
      <PageHeader
        title="Lab Test Catalogue"
        subtitle="Orderable tests and their prices — used to bill every test a doctor orders"
        action={canEdit && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Test
          </button>
        )}
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Test</th>
                <th className="px-4 py-3">Sample</th>
                <th className="px-4 py-3">Reference Range</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : tests.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No lab tests in the catalogue yet.</td></tr>
              ) : (
                tests.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="flex items-center gap-1.5 px-4 py-3 font-medium text-slate-900">
                      <FlaskConical size={14} className="text-purple-500" /> {t.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.sampleType || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.referenceRange || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatMoney(t.price)}</td>
                    <td className="px-4 py-3">
                      {t.active
                        ? <span className="badge bg-emerald-100 text-emerald-700">Active</span>
                        : <span className="badge bg-slate-100 text-slate-600">Retired</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <button onClick={() => openEdit(t)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Edit">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(t)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Lab Test' : 'New Lab Test'} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Test Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Complete Blood Count (CBC)" />
          </div>
          <div>
            <label className="label">Price (Rs.)</label>
            <input type="number" min="0" step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="label">Sample Type</label>
            <input className="input" value={form.sampleType || ''} onChange={(e) => setForm({ ...form, sampleType: e.target.value })} placeholder="e.g. Blood, Urine, Imaging" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Reference Range</label>
            <input className="input" value={form.referenceRange || ''} onChange={(e) => setForm({ ...form, referenceRange: e.target.value })} placeholder="e.g. 70-100 mg/dL" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Offer this test on the order form
          </label>
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Test'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
