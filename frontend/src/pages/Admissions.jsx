import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Filter, Eye, Printer } from 'lucide-react';
import { admissionsApi, aiApi } from '../api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import DischargeModal from '../components/DischargeModal';

export default function Admissions() {
  const [admissions, setAdmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [loading, setLoading] = useState(true);
  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [viewAdmission, setViewAdmission] = useState(null);

  async function load() {
    setLoading(true);
    const res = await admissionsApi.list(statusFilter ? { status: statusFilter } : {});
    setAdmissions(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  async function handleDischargeSubmit(data) {
    try {
      await admissionsApi.discharge(dischargeTarget.id, data);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to discharge patient');
      throw err;
    }
  }

  // Drafts a discharge summary from this admission's own ward/reason/dates —
  // AI_API_KEY-backed if configured, otherwise a built-in template (see
  // backend/utils/aiSummaryService.js). Passed to DischargeModal, which only
  // pre-fills its notes textarea; nothing is saved until submit.
  async function generateDischargeSummary(admission) {
    const res = await aiApi.generateSummary({
      title: 'Discharge Summary',
      patientName: admission.Patient?.name,
      fields: {
        Ward: `${admission.ward} (bed ${admission.bedNumber})`,
        'Reason for admission': admission.reason,
        'Admission date': admission.admissionDate,
        'Attending doctor': admission.Doctor?.name,
      },
    });
    return res.data.summary;
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
        <div className="overflow-x-auto">
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
                    <div className="flex items-center justify-end gap-3">
                      {a.status === 'admitted' ? (
                        <button onClick={() => setDischargeTarget(a)} className="text-xs text-rose-600 hover:underline">Discharge</button>
                      ) : (
                        <button onClick={() => setViewAdmission(a)} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                          <Eye size={13} /> Summary
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
      </div>

      <DischargeModal
        open={!!dischargeTarget}
        admission={dischargeTarget}
        onClose={() => setDischargeTarget(null)}
        onSubmit={handleDischargeSubmit}
        onGenerateSummary={generateDischargeSummary}
      />

      <Modal open={!!viewAdmission} onClose={() => setViewAdmission(null)} title="Discharge Summary">
        {viewAdmission && (
          <div className="print-area">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:mb-6">
              <div>
                <p className="hidden text-lg font-semibold text-slate-900 print:block">MediCare HMS — Discharge Summary</p>
                <p className="font-medium text-slate-900">{viewAdmission.Patient?.name}</p>
                <p className="text-sm text-slate-500">
                  {viewAdmission.ward} · Bed {viewAdmission.bedNumber} · Admitted {viewAdmission.admissionDate}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <StatusBadge status={viewAdmission.status} />
                <button onClick={() => window.print()} className="btn-secondary" title="Print or save as PDF">
                  <Printer size={16} /> Print / PDF
                </button>
              </div>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Attending Doctor</dt><dd className="text-slate-800">{viewAdmission.Doctor?.name || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Reason for Admission</dt><dd className="text-right text-slate-800">{viewAdmission.reason || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Discharge Date</dt><dd className="text-slate-800">{viewAdmission.dischargeDate || '—'}</dd></div>
              <div>
                <dt className="mb-1 text-slate-500">Discharge Notes</dt>
                <dd className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{viewAdmission.dischargeNotes || 'None recorded.'}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Doctor's Signature</p>
              {viewAdmission.signatureData ? (
                <img src={viewAdmission.signatureData} alt="Discharging doctor's signature" className="h-20 border-b border-slate-300" />
              ) : (
                <p className="text-sm text-slate-400">No signature on file.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
