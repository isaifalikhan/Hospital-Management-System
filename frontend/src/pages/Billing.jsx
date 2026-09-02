import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Plus, Trash2, DollarSign, Eye, Download, Printer } from 'lucide-react';
import { invoicesApi, patientsApi, reportsApi } from '../api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const CATEGORIES = ['consultation', 'procedure', 'medicine', 'lab', 'room', 'other'];
const emptyItem = { description: '', category: 'consultation', quantity: 1, unitPrice: 0 };

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [saving, setSaving] = useState(false);

  const [viewInvoice, setViewInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');

  // upiPaymentUri is set by the backend only when UPI_ID is configured and
  // the invoice has a balance due (see invoiceController.attachUpiPaymentUri).
  // Rendered client-side so no image round-trips the server.
  useEffect(() => {
    if (!viewInvoice?.upiPaymentUri) {
      setUpiQrDataUrl('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(viewInvoice.upiPaymentUri, { width: 160, margin: 1 })
      .then((url) => { if (!cancelled) setUpiQrDataUrl(url); })
      .catch(() => { if (!cancelled) setUpiQrDataUrl(''); });
    return () => { cancelled = true; };
  }, [viewInvoice?.upiPaymentUri]);

  async function load() {
    setLoading(true);
    const [iRes, pRes] = await Promise.all([
      invoicesApi.list(statusFilter ? { status: statusFilter } : {}),
      patients.length ? Promise.resolve({ data: patients }) : patientsApi.list(),
    ]);
    setInvoices(iRes.data);
    setPatients(pRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  function openCreate() {
    setPatientId('');
    setItems([{ ...emptyItem }]);
    setDiscount(0);
    setTax(0);
    setCreateOpen(true);
  }

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  const total = Math.max(subtotal - Number(discount || 0) + Number(tax || 0), 0);

  async function handleCreate(e) {
    e.preventDefault();
    if (!patientId) return alert('Please select a patient');
    if (!items.length || items.some((it) => !it.description)) return alert('Every line item needs a description');
    setSaving(true);
    try {
      await invoicesApi.create({ patientId, items, discount, tax });
      setCreateOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  function openView(inv) {
    setViewInvoice(inv);
    setPaymentAmount('');
    setPaymentMethod('cash');
  }

  async function handlePayment(e) {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) return alert('Enter a valid payment amount');
    try {
      const res = await invoicesApi.recordPayment(viewInvoice.id, { amount: paymentAmount, paymentMethod });
      setViewInvoice(res.data);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  }

  async function handleExport() {
    try {
      await reportsApi.downloadCsv('/reports/invoices.csv', 'invoices.csv');
    } catch {
      alert('Failed to export invoices');
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Create invoices and record payments"
        action={
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={handleExport}>
              <Download size={16} /> Export CSV
            </button>
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> New Invoice
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No invoices found.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.Patient?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.date}</td>
                  <td className="px-4 py-3 text-slate-800">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">${Number(inv.amountPaid).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openView(inv)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Eye size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Invoice" wide>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Patient *</label>
            <select required className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
            </select>
          </div>

          <div>
            <label className="label">Line Items</label>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="input col-span-5"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  />
                  <select className="input col-span-2" value={it.category} onChange={(e) => updateItem(idx, 'category', e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="number" min="0" step="1" className="input col-span-2" placeholder="Qty"
                    value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  />
                  <input
                    type="number" min="0" step="0.01" className="input col-span-2" placeholder="Unit price"
                    value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                  />
                  <button type="button" onClick={() => removeItem(idx)} className="col-span-1 rounded p-1.5 text-rose-500 hover:bg-rose-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 text-sm text-indigo-600 hover:underline">+ Add line item</button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:w-1/2 sm:ml-auto">
            <div>
              <label className="label">Discount ($)</label>
              <input type="number" min="0" step="0.01" className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <label className="label">Tax ($)</label>
              <input type="number" min="0" step="0.01" className="input" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-sm sm:w-1/2 sm:ml-auto">
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-${Number(discount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>+${Number(tax || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 mt-1 pt-1">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Invoice'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={viewInvoice ? `Invoice ${viewInvoice.invoiceNumber}` : ''} wide>
        {viewInvoice && (
          <div id="invoice-print-area">
            <div className="mb-4 flex items-center justify-between print:mb-6">
              <div>
                <p className="hidden text-lg font-semibold text-slate-900 print:block">MediCare HMS</p>
                <p className="font-medium text-slate-900">{viewInvoice.Patient?.name}</p>
                <p className="text-sm text-slate-500">Invoice {viewInvoice.invoiceNumber} · {viewInvoice.date}</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <StatusBadge status={viewInvoice.status} />
                <button onClick={() => window.print()} className="btn-secondary" title="Print or save as PDF">
                  <Printer size={16} /> Print / PDF
                </button>
              </div>
            </div>

            <table className="w-full text-sm mb-4">
              <thead className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2">Description</th>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewInvoice.InvoiceItems?.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2">{it.description}</td>
                    <td className="py-2 capitalize text-slate-500">{it.category}</td>
                    <td className="py-2 text-right">{it.quantity}</td>
                    <td className="py-2 text-right">${Number(it.unitPrice).toFixed(2)}</td>
                    <td className="py-2 text-right">${Number(it.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="rounded-lg bg-slate-50 p-3 text-sm mb-4 sm:w-1/2 sm:ml-auto">
              <div className="flex justify-between"><span>Subtotal</span><span>${Number(viewInvoice.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-${Number(viewInvoice.discount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>+${Number(viewInvoice.tax).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 mt-1 pt-1">
                <span>Total</span><span>${Number(viewInvoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600"><span>Paid</span><span>${Number(viewInvoice.amountPaid).toFixed(2)}</span></div>
              <div className="flex justify-between font-medium"><span>Balance</span><span>${(Number(viewInvoice.total) - Number(viewInvoice.amountPaid)).toFixed(2)}</span></div>
            </div>

            {viewInvoice.upiPaymentUri && (
              <div className="mb-4 flex items-center gap-4 rounded-lg border border-slate-200 p-3 sm:w-1/2 sm:ml-auto">
                {upiQrDataUrl ? (
                  <img src={upiQrDataUrl} alt="UPI payment QR code" className="h-24 w-24 shrink-0" />
                ) : (
                  <div className="h-24 w-24 shrink-0 animate-pulse rounded bg-slate-100" />
                )}
                <div className="text-sm">
                  <p className="font-medium text-slate-900">Scan to pay via UPI</p>
                  <p className="text-slate-500">
                    Balance due: ${(Number(viewInvoice.total) - Number(viewInvoice.amountPaid)).toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Front desk will confirm and record the payment.</p>
                </div>
              </div>
            )}

            {viewInvoice.status !== 'paid' && (
              <form onSubmit={handlePayment} className="flex items-end gap-2 border-t border-slate-200 pt-4 print:hidden">
                <div className="flex-1">
                  <label className="label">Record Payment ($)</label>
                  <input type="number" min="0" step="0.01" className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                </div>
                <div>
                  <label className="label">Method</label>
                  <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary"><DollarSign size={16} /> Record</button>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
