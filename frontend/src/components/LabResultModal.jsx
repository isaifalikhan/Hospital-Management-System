import { useEffect, useState } from 'react';
import { FlaskConical, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import AttachmentList from './AttachmentList';
import { formatMoney } from '../utils/currency';

// Recording a test's outcome. This replaced a window.prompt(), which could
// only ever capture one line of free text — no reference range, no result
// date, no report file, and no way to see which test you were typing into.
// Shared by the laboratory queue (LabOrders.jsx) and the patient chart
// (PatientDetail.jsx) so a result is entered the same way from both.
export default function LabResultModal({ order, onClose, onSubmit }) {
  const [form, setForm] = useState({ result: '', referenceRange: '', resultDate: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reopen on a different order (or the same one again) starts clean, seeded
  // with whatever the order already carries — the catalogue's reference range
  // comes through on the order itself, so it's pre-filled rather than retyped.
  useEffect(() => {
    if (!order) return;
    setForm({
      result: order.result || '',
      referenceRange: order.referenceRange || '',
      resultDate: order.resultDate || new Date().toISOString().slice(0, 10),
      notes: order.notes || '',
    });
    setError('');
  }, [order]);

  if (!order) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.result.trim()) {
      setError('Enter the result before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(order, { ...form, status: 'completed' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the result.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!order} onClose={onClose} title="Enter Test Result" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-1.5 font-medium text-slate-900">
            <FlaskConical size={15} className="text-purple-500" /> {order.testName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {order.Patient?.name || 'Patient'}
            {order.Doctor?.name ? ` · ordered by ${order.Doctor.name}` : ''}
            {order.orderedDate ? ` · ${order.orderedDate}` : ''}
            {order.priority === 'urgent' ? ' · ' : ''}
            {order.priority === 'urgent' && <span className="font-medium text-rose-600">Urgent</span>}
          </p>
          {order.price > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {formatMoney(order.price)}
              {order.Invoice ? ` · ${order.Invoice.invoiceNumber} (${order.Invoice.status})` : ''}
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="label">Result *</label>
          <textarea
            required
            rows={6}
            className="input font-mono text-sm"
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
            placeholder={'Haemoglobin      13.4 g/dL\nWBC count        7,200 /µL\nPlatelets        250,000 /µL'}
          />
          <p className="mt-1 text-xs text-slate-400">One value per line keeps the printed report readable.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Reference Range</label>
            <input
              className="input"
              value={form.referenceRange}
              onChange={(e) => setForm({ ...form, referenceRange: e.target.value })}
              placeholder="e.g. 70-100 mg/dL"
            />
          </div>
          <div>
            <label className="label">Result Date</label>
            <input
              type="date"
              className="input"
              value={form.resultDate}
              onChange={(e) => setForm({ ...form, resultDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            rows={2}
            className="input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Anything the doctor should know — sample quality, repeat advised, etc."
          />
        </div>

        <div className="border-t border-slate-200 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Report / Scan</p>
          <AttachmentList entityType="LabOrder" entityId={order.id} canEdit />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Result & Complete'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
