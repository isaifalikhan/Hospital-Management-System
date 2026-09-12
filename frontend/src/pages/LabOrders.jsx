import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Filter, Play, ClipboardCheck } from 'lucide-react';
import { labOrdersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import LabResultModal from '../components/LabResultModal';

export default function LabOrders() {
  const { user } = useAuth();
  // Reception is here for the bills, not the bench work: it can see every
  // order and what it costs, but progressing a test and entering results
  // belong to the lab (see backend/routes/labOrderRoutes.js).
  const canWorkOrders = ['admin', 'doctor', 'lab'].includes(user?.role);
  // Reception collects before the patient walks to the lab, so the bench
  // can't start an unpaid test. Admin/doctor can override for an emergency
  // or a waived charge — the same rule the API enforces.
  const isBlockedByPayment = (o) =>
    user?.role === 'lab' && o.Invoice && o.Invoice.status !== 'paid';

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [resultTarget, setResultTarget] = useState(null);

  async function load() {
    setLoading(true);
    const res = await labOrdersApi.list(statusFilter ? { status: statusFilter } : {});
    setOrders(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  // Throws on failure so the modal can surface the message inline (a
  // payment block comes back as a 403 with a readable reason) instead of
  // closing as though the result saved.
  async function handleSaveResult(order, updates) {
    await labOrdersApi.update(order.id, updates);
    setResultTarget(null);
    await load();
  }

  async function handleInProgress(order) {
    try {
      await labOrdersApi.update(order.id, { status: 'in_progress' });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update lab order');
    }
  }

  return (
    <div>
      <PageHeader title="Lab Orders" subtitle="Track ordered tests, their bills, and results across all patients" />

      <div className="mb-4 flex items-center gap-2">
        <Filter size={15} className="text-slate-400" />
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ordered">Ordered</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Ordered</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Fee</th>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No lab orders found.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-1.5"><FlaskConical size={14} className="text-purple-500" /> {o.testName}</td>
                  <td className="px-4 py-3">
                    <Link to={`/patients/${o.patientId}`} className="text-indigo-600 hover:underline">{o.Patient?.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.Doctor?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.orderedDate}</td>
                  <td className="px-4 py-3">
                    {o.priority === 'urgent' ? <span className="badge bg-rose-100 text-rose-700">Urgent</span> : <span className="badge bg-slate-100 text-slate-600">Routine</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-right text-slate-800">{formatMoney(o.price)}</td>
                  <td className="px-4 py-3">
                    {o.Invoice ? (
                      <Link to="/billing" className="inline-flex items-center gap-1.5 hover:underline">
                        <span className="font-mono text-xs text-slate-500">{o.Invoice.invoiceNumber}</span>
                        <StatusBadge status={o.Invoice.status} />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">No charge</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canWorkOrders && isBlockedByPayment(o) && o.status !== 'completed' && o.status !== 'cancelled' ? (
                      <span className="badge bg-rose-50 text-rose-700" title="Reception has not collected this test's fee yet">
                        Awaiting payment
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {canWorkOrders && o.status === 'ordered' && (
                          <button
                            onClick={() => handleInProgress(o)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Play size={12} /> Start
                          </button>
                        )}
                        {canWorkOrders && (o.status === 'ordered' || o.status === 'in_progress') && (
                          <button
                            onClick={() => setResultTarget(o)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            <ClipboardCheck size={12} /> Enter Result
                          </button>
                        )}
                        {o.status === 'completed' && (
                          <button
                            onClick={() => setResultTarget(o)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <ClipboardCheck size={12} /> View
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <LabResultModal
        order={resultTarget}
        onClose={() => setResultTarget(null)}
        onSubmit={handleSaveResult}
      />
    </div>
  );
}
