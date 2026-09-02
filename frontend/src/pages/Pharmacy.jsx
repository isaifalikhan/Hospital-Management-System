import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, AlertTriangle, ClipboardList } from 'lucide-react';
import { medicinesApi } from '../api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

const emptyForm = {
  name: '', category: '', manufacturer: '', unit: 'tablet', unitPrice: 0,
  quantityInStock: 0, reorderLevel: 10, expiryDate: '',
};

export default function Pharmacy() {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [stockModal, setStockModal] = useState(null); // { medicine, type }
  const [stockQty, setStockQty] = useState('');
  const [stockReason, setStockReason] = useState('');

  async function load() {
    setLoading(true);
    const res = await medicinesApi.list({ search: search || undefined, lowStock: lowStockOnly ? 'true' : undefined });
    setMedicines(res.data);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search, lowStockOnly]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(med) {
    setEditing(med);
    setForm({ ...emptyForm, ...med, expiryDate: med.expiryDate || '' });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await medicinesApi.update(editing.id, form);
      } else {
        await medicinesApi.create(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save medicine');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(med) {
    if (!confirm(`Remove "${med.name}" from inventory?`)) return;
    try {
      await medicinesApi.remove(med.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete medicine');
    }
  }

  function openStock(medicine, type) {
    setStockModal({ medicine, type });
    setStockQty('');
    setStockReason(type === 'in' ? 'restock' : 'dispensed');
  }

  function openReorder(medicine) {
    setStockModal({ medicine, type: 'in' });
    setStockQty(String(medicine.suggestedReorderQty || ''));
    setStockReason('restock (reorder suggestion)');
  }

  async function handleStockSubmit(e) {
    e.preventDefault();
    if (!stockQty || Number(stockQty) <= 0) return alert('Enter a valid quantity');
    try {
      await medicinesApi.adjustStock(stockModal.medicine.id, { type: stockModal.type, quantity: Number(stockQty), reason: stockReason });
      setStockModal(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stock');
    }
  }

  const reorderSuggestions = medicines.filter((m) => m.suggestedReorderQty > 0);

  return (
    <div>
      <PageHeader
        title="Pharmacy & Inventory"
        subtitle="Track medicine stock and dispense to patients"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Medicine
          </button>
        }
      />

      {reorderSuggestions.length > 0 && (
        <div className="card mb-6 border-amber-200 bg-amber-50/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList size={18} className="text-amber-600" />
            <h3 className="font-semibold text-slate-900">Reorder Suggestions</h3>
            <span className="badge bg-amber-100 text-amber-700">{reorderSuggestions.length} medicine{reorderSuggestions.length === 1 ? '' : 's'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1.5 pr-4">Name</th>
                  <th className="py-1.5 pr-4">In Stock</th>
                  <th className="py-1.5 pr-4">Reorder Level</th>
                  <th className="py-1.5 pr-4">Suggested Order Qty</th>
                  <th className="py-1.5 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {reorderSuggestions.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-4 font-medium text-slate-900">{m.name}</td>
                    <td className="py-2 pr-4 text-rose-600 font-medium">{m.quantityInStock}</td>
                    <td className="py-2 pr-4 text-slate-500">{m.reorderLevel}</td>
                    <td className="py-2 pr-4 font-medium text-slate-800">{m.suggestedReorderQty} {m.unit}(s)</td>
                    <td className="py-2 pr-0 text-right">
                      <button onClick={() => openReorder(m)} className="text-xs font-medium text-indigo-600 hover:underline">
                        Order now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="input w-full max-w-xs" placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Unit Price</th>
              <th className="px-4 py-3">In Stock</th>
              <th className="px-4 py-3">Reorder Level</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : medicines.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No medicines found.</td></tr>
            ) : (
              medicines.map((m) => {
                const low = m.quantityInStock <= m.reorderLevel;
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.category || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">${Number(m.unitPrice).toFixed(2)} / {m.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${low ? 'text-rose-600 font-medium' : 'text-slate-800'}`}>
                        {low && <AlertTriangle size={14} />} {m.quantityInStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.reorderLevel}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {m.expiryStatus === 'expired' ? (
                        <span className="flex items-center gap-1 text-rose-600 font-medium">
                          <AlertTriangle size={14} /> Expired {m.expiryDate}
                        </span>
                      ) : m.expiryStatus === 'expiring_soon' ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <AlertTriangle size={14} /> {m.expiryDate}
                        </span>
                      ) : (
                        m.expiryDate || '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openStock(m, 'in')} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50" title="Stock in"><ArrowDownCircle size={16} /></button>
                        <button onClick={() => openStock(m, 'out')} className="rounded p-1.5 text-amber-600 hover:bg-amber-50" title="Stock out"><ArrowUpCircle size={16} /></button>
                        <button onClick={() => openEdit(m)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Edit"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(m)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Medicine' : 'New Medicine'} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <label className="label">Manufacturer</label>
            <input className="input" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
          </div>
          <div>
            <label className="label">Unit</label>
            <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="tablet, bottle, box..." />
          </div>
          <div>
            <label className="label">Unit Price ($)</label>
            <input type="number" min="0" step="0.01" className="input" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          </div>
          <div>
            <label className="label">Quantity In Stock</label>
            <input type="number" min="0" className="input" value={form.quantityInStock} onChange={(e) => setForm({ ...form, quantityInStock: e.target.value })} disabled={!!editing} />
            {editing && <p className="mt-1 text-xs text-slate-400">Use stock in/out actions to adjust quantity.</p>}
          </div>
          <div>
            <label className="label">Reorder Level</label>
            <input type="number" min="0" className="input" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
          </div>
          <div>
            <label className="label">Expiry Date</label>
            <input type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </div>
          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Medicine'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={stockModal ? `Stock ${stockModal.type === 'in' ? 'In' : 'Out'}: ${stockModal.medicine.name}` : ''}>
        {stockModal && (
          <form onSubmit={handleStockSubmit} className="space-y-4">
            <p className="text-sm text-slate-500">Current stock: <span className="font-medium text-slate-800">{stockModal.medicine.quantityInStock}</span> {stockModal.medicine.unit}(s)</p>
            <div>
              <label className="label">Quantity *</label>
              <input type="number" min="1" required className="input" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
            </div>
            <div>
              <label className="label">Reason</label>
              <input className="input" value={stockReason} onChange={(e) => setStockReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setStockModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Confirm</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
