import { useEffect, useState } from 'react';
import { ScrollText, Filter } from 'lucide-react';
import { auditLogsApi } from '../api';
import PageHeader from '../components/PageHeader';

const ACTION_COLORS = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-rose-100 text-rose-700',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = {};
    if (entityType) params.entityType = entityType;
    if (action) params.action = action;
    const res = await auditLogsApi.list(params);
    setLogs(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entityType, action]);

  const entityTypes = ['Patient', 'Appointment', 'MedicalRecord', 'Invoice', 'Medicine', 'LabOrder', 'Admission'];

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="System-wide record of create, update, and delete actions" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Filter size={15} className="text-slate-400" />
        <select className="input w-auto" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">All entity types</option>
          {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input w-auto" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit entries found.</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{l.userName} <span className="text-xs text-slate-400 capitalize">({l.userRole})</span></td>
                  <td className="px-4 py-3"><span className={`badge capitalize ${ACTION_COLORS[l.action] || 'bg-slate-100 text-slate-600'}`}>{l.action}</span></td>
                  <td className="px-4 py-3 text-slate-600 flex items-center gap-1.5"><ScrollText size={13} className="text-slate-400" /> {l.entityType}{l.entityId ? ` #${l.entityId}` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">{l.summary || '—'}</td>
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
