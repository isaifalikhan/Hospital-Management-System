import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Filter } from 'lucide-react';
import { labOrdersApi } from '../api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function LabOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await labOrdersApi.list(statusFilter ? { status: statusFilter } : {});
    setOrders(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  async function handleResult(order) {
    const result = prompt(`Enter result for ${order.testName}:`);
    if (result === null) return;
    try {
      await labOrdersApi.update(order.id, { status: 'completed', result, resultDate: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update lab order');
    }
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
      <PageHeader title="Lab Orders" subtitle="Track ordered tests and enter results across all patients" />

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
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No lab orders found.</td></tr>
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
                  <td className="px-4 py-3 text-right">
                    {o.status === 'ordered' && (
                      <button onClick={() => handleInProgress(o)} className="text-xs text-indigo-600 hover:underline mr-2">In Progress</button>
                    )}
                    {(o.status === 'ordered' || o.status === 'in_progress') && (
                      <button onClick={() => handleResult(o)} className="text-xs text-emerald-600 hover:underline">Enter Result</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
