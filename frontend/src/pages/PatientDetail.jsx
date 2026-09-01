import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { patientsApi, medicalRecordsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const emptyRecord = { diagnosis: '', treatment: '', prescription: '', notes: '', vitals: '' };

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAddRecord = ['admin', 'doctor'].includes(user?.role);

  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyRecord);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await patientsApi.get(id);
      setPatient(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patient');
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function handleAddRecord(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await medicalRecordsApi.create({ ...form, patientId: id });
      setModalOpen(false);
      setForm(emptyRecord);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medical record');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!patient) return <div className="text-slate-500">Loading...</div>;

  const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob)) / 3.15576e10) : null;

  return (
    <div>
      <button onClick={() => navigate('/patients')} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to Patients
      </button>

      <PageHeader
        title={patient.name}
        subtitle={`${patient.mrn} ${age !== null ? `• ${age} years` : ''} ${patient.gender ? `• ${patient.gender}` : ''}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Patient Info</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Status"><StatusBadge status={patient.status} /></Row>
            <Row label="Blood Group">{patient.bloodGroup || '—'}</Row>
            <Row label="Phone">{patient.phone || '—'}</Row>
            <Row label="Email">{patient.email || '—'}</Row>
            <Row label="Address">{patient.address || '—'}</Row>
            <Row label="Allergies">{patient.allergies || 'None known'}</Row>
            <Row label="Emergency Contact">
              {patient.emergencyContactName ? `${patient.emergencyContactName} (${patient.emergencyContactPhone || 'n/a'})` : '—'}
            </Row>
          </dl>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Appointments</h2>
          {patient.Appointments?.length ? (
            <ul className="divide-y divide-slate-100">
              {patient.Appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{a.date} at {a.time}</p>
                    <p className="text-xs text-slate-500">Dr. {a.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'Unassigned'} • {a.reason || 'No reason given'}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No appointments yet.</p>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Medical Records</h2>
            {canAddRecord && (
              <button className="btn-primary" onClick={() => setModalOpen(true)}>
                <Plus size={16} /> Add Record
              </button>
            )}
          </div>
          {patient.MedicalRecords?.length ? (
            <ul className="space-y-3">
              {patient.MedicalRecords.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium text-slate-800 flex items-center gap-1.5"><FileText size={14} /> {r.date}</p>
                    <span className="text-xs text-slate-500">Dr. {r.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'N/A'}</span>
                  </div>
                  {r.vitals && <p className="text-xs text-slate-500 mb-1">Vitals: {r.vitals}</p>}
                  <p><span className="font-medium">Diagnosis:</span> {r.diagnosis || '—'}</p>
                  {r.treatment && <p><span className="font-medium">Treatment:</span> {r.treatment}</p>}
                  {r.prescription && <p><span className="font-medium">Prescription:</span> {r.prescription}</p>}
                  {r.notes && <p className="text-slate-500 mt-1">{r.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No medical records yet.</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Invoices</h2>
          {patient.Invoices?.length ? (
            <ul className="divide-y divide-slate-100">
              {patient.Invoices.map((inv) => (
                <li key={inv.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">{inv.invoiceNumber}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-slate-500">${Number(inv.total).toFixed(2)} • {inv.date}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No invoices yet.</p>
          )}
          <Link to="/billing" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">Go to Billing</Link>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Medical Record" wide>
        <form onSubmit={handleAddRecord} className="space-y-4">
          <div>
            <label className="label">Vitals</label>
            <input className="input" value={form.vitals} onChange={(e) => setForm({ ...form, vitals: e.target.value })} placeholder="e.g. BP:120/80, Temp:98.6F, Pulse:72" />
          </div>
          <div>
            <label className="label">Diagnosis</label>
            <textarea className="input" rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
          </div>
          <div>
            <label className="label">Treatment</label>
            <textarea className="input" rows={2} value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} />
          </div>
          <div>
            <label className="label">Prescription</label>
            <textarea className="input" rows={2} value={form.prescription} onChange={(e) => setForm({ ...form, prescription: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Record'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{children}</dd>
    </div>
  );
}
