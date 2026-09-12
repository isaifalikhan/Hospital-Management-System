import { useEffect, useState } from 'react';
import { FlaskConical, AlertCircle, Plus, X } from 'lucide-react';
import Modal from './Modal';
import AttachmentList from './AttachmentList';
import { formatMoney } from '../utils/currency';

// Recording a test's outcome. This replaced a window.prompt(), which could
// only ever capture one line of free text — no reference range, no result
// date, no report file, and no way to see which test you were typing into.
//
// The report is a table, not prose: the rows (parameter, unit, reference
// range) come pre-built from the test's catalogue entry, so entering a result
// is normally just filling in the Value column. Tests with no parameters —
// imaging, mostly — fall back to the narrative box underneath.
//
// Shared by the laboratory queue (LabOrders.jsx) and the patient chart
// (PatientDetail.jsx) so a result is entered the same way from both.
export default function LabResultModal({ order, onClose, onSubmit }) {
  const [form, setForm] = useState({ result: '', resultDate: '', notes: '' });
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reopening on a different order (or the same one again) starts clean.
  useEffect(() => {
    if (!order) return;
    setForm({
      result: order.result || '',
      resultDate: order.resultDate || new Date().toISOString().slice(0, 10),
      notes: order.notes || '',
    });
    // Rows already saved against this order win — that's a result being
    // corrected. Otherwise the catalogue's parameters become empty rows.
    const saved = order.LabResultItems || [];
    const template = order.LabTest?.parameters || [];
    setRows(
      saved.length
        ? saved.map((r) => ({
            parameter: r.parameter, value: r.value || '', unit: r.unit || '',
            referenceRange: r.referenceRange || '', flag: r.flag || 'normal',
          }))
        : template.map((p) => ({
            parameter: p.parameter, value: '', unit: p.unit || '',
            referenceRange: p.referenceRange || '', flag: 'normal',
          }))
    );
    setError('');
  }, [order]);

  if (!order) return null;

  const updateRow = (i, field, value) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const addRow = () =>
    setRows((prev) => [...prev, { parameter: '', value: '', unit: '', referenceRange: '', flag: 'normal' }]);
  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  async function handleSubmit(e) {
    e.preventDefault();
    const filled = rows.filter((r) => r.parameter.trim() && String(r.value).trim());
    // Either form of result counts: measured rows for a panel, or the
    // narrative box for imaging. Only an entirely empty report is rejected.
    if (!filled.length && !form.result.trim()) {
      setError('Enter at least one result value, or write a narrative result below.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(order, { ...form, resultItems: rows, status: 'completed' });
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
            {order.priority === 'urgent' && <span className="ml-1 font-medium text-rose-600">· Urgent</span>}
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
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">Results</label>
            <button type="button" onClick={addRow} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
              <Plus size={13} /> Add row
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
              No parameters set up for this test in the catalogue — add rows here, or write a narrative result below.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Parameter</th>
                    <th className="w-28 px-3 py-2">Value</th>
                    <th className="w-24 px-3 py-2">Unit</th>
                    <th className="w-32 px-3 py-2">Reference</th>
                    <th className="w-28 px-3 py-2">Flag</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i} className={r.flag !== 'normal' ? 'bg-rose-50/60' : ''}>
                      <td className="px-2 py-1.5">
                        <input className="input py-1 text-sm" value={r.parameter} onChange={(e) => updateRow(i, 'parameter', e.target.value)} placeholder="Parameter" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input py-1 text-sm font-semibold" value={r.value} onChange={(e) => updateRow(i, 'value', e.target.value)} placeholder="—" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input py-1 text-sm" value={r.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input py-1 text-sm" value={r.referenceRange} onChange={(e) => updateRow(i, 'referenceRange', e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="input py-1 text-sm" value={r.flag} onChange={(e) => updateRow(i, 'flag', e.target.value)}>
                          <option value="normal">Normal</option>
                          <option value="low">Low</option>
                          <option value="high">High</option>
                          <option value="abnormal">Abnormal</option>
                        </select>
                      </td>
                      <td className="px-1">
                        <button type="button" onClick={() => removeRow(i)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600" title="Remove row">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Parameters, units and reference ranges come from the test catalogue — normally only the Value column needs filling in.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label">
              Narrative Result {rows.length > 0 && <span className="font-normal text-slate-400">(optional)</span>}
            </label>
            <textarea
              rows={3}
              className="input text-sm"
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              placeholder="For imaging and descriptive reports — e.g. No acute cardiopulmonary abnormality."
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
