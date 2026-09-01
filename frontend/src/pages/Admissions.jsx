import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Filter } from 'lucide-react';
import { admissionsApi } from '../api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function Admissions() {
  const [admissions, setAdmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await admissionsApi.list(statusFilter ? { status: statusFilter } : {});
    setAdmissions(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  async function handleDischarge(admission) {
    const dischargeNotes = prompt(`Discharge notes for ${admission.Patient?.name} (optional):`);
    if (dischargeNotes === null) return;
    try {
      await admissionsApi.discharge(admission.id, { dischargeNotes });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to discharge patient');
    }
  }

  const activeCount = admissions.filter((a) => a.status === 'admitted').length;

  return (
    <div>
      <PageHeader title="Admissions" subtitle="Inpatient ward overview across all patients" />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="admitted">Currently Admitted</option>
            <option value="discharged">Discharged</option>
          </select>
        </div>
        {statusFilter === 'admitted' && (
          <span className="text-sm text-slate-500">{activeCount} patient{activeCount === 1 ? '' : 's'} currently admitted</span>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Ward / Bed</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Admitted</th>
              <th className="px-4 py-3">Discharged</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : admissions.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No admissions found.</td></tr>
            ) : (
              admissions.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-1.5">
                    <BedDouble size={14} className="text-sky-500" />
                    <Link to={`/patients/${a.patientId}`} className="text-indigo-600 hover:underline">{a.Patient?.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.ward} · {a.bedNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{a.Doctor?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={a.reason}>{a.reason}</td>
                  <td className="px-4 py-3 text-slate-600">{a.admissionDate}</td>
                  <td className="px-4 py-3 text-slate-600">{a.dischargeDate || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {a.status === 'admitted' && (
                      <button onClick={() => handleDischarge(a)} className="text-xs text-rose-600 hover:underline">Discharge</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
