import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import {
  ArrowLeft, Plus, FileText, FlaskConical, BedDouble, Receipt, CalendarClock,
  Trash2, CheckCircle2, LogOut as LogOutIcon, Eye, Printer, Video, Sparkles, Syringe,
} from 'lucide-react';
import { patientsApi, medicalRecordsApi, labOrdersApi, admissionsApi, medicinesApi, aiApi, immunizationsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import SignaturePad from '../components/SignaturePad';
import DischargeModal from '../components/DischargeModal';
import AttachmentList from '../components/AttachmentList';

const emptyRecord = {
  diagnosis: '', treatment: '', prescription: '', notes: '', vitals: '', signatureData: null,
  bpSystolic: '', bpDiastolic: '', temperature: '', pulse: '', weight: '',
};

// Shared by the visit list, the print/view modal, and the AI summary prompt
// so all three describe a record's vitals the same way.
function formatVitals(r) {
  const parts = [];
  if (r.bpSystolic && r.bpDiastolic) parts.push(`BP ${r.bpSystolic}/${r.bpDiastolic}`);
  if (r.temperature) parts.push(`Temp ${r.temperature}°F`);
  if (r.pulse) parts.push(`Pulse ${r.pulse} bpm`);
  if (r.weight) parts.push(`Weight ${r.weight} lbs`);
  if (r.vitals) parts.push(r.vitals);
  return parts.join(' · ');
}
const emptyPrescriptionItem = { medicineId: '', medicineName: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' };
const emptyLabOrder = { testName: '', priority: 'routine', notes: '' };
const emptyAdmission = { ward: '', bedNumber: '', reason: '' };
const emptyImmunization = { vaccineName: '', doseNumber: '', dateGiven: '', nextDueDate: '', administeredBy: '', batchNumber: '', notes: '' };

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAddRecord = ['admin', 'doctor'].includes(user?.role);
  const canOrderLab = ['admin', 'doctor'].includes(user?.role);
  const canAdmit = ['admin', 'doctor', 'receptionist'].includes(user?.role);
  const canDispense = ['admin', 'pharmacist'].includes(user?.role);
  const canManagePortalAccess = ['admin', 'receptionist'].includes(user?.role);

  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState(emptyRecord);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [savingRecord, setSavingRecord] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [generatingNotes, setGeneratingNotes] = useState(false);

  const [labModalOpen, setLabModalOpen] = useState(false);
  const [labForm, setLabForm] = useState(emptyLabOrder);
  const [savingLab, setSavingLab] = useState(false);

  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState(emptyAdmission);
  const [savingAdmit, setSavingAdmit] = useState(false);
  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [viewAdmission, setViewAdmission] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);

  const [immModalOpen, setImmModalOpen] = useState(false);
  const [immForm, setImmForm] = useState(emptyImmunization);
  const [savingImm, setSavingImm] = useState(false);

  const [showTimeline, setShowTimeline] = useState(true);

  const [pin, setPin] = useState('');
  const [portalEmail, setPortalEmail] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState('');

  async function load() {
    try {
      const res = await patientsApi.get(id);
      setPatient(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patient');
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // --- Medical record + structured prescription ---
  function openRecordModal() {
    setRecordForm(emptyRecord);
    setPrescriptionItems([]);
    setRecordModalOpen(true);
    if (!medicines.length) {
      medicinesApi.list().then((res) => setMedicines(res.data)).catch(() => {});
    }
  }

  function addPrescriptionRow() {
    setPrescriptionItems((prev) => [...prev, { ...emptyPrescriptionItem }]);
  }

  function updatePrescriptionRow(idx, field, value) {
    setPrescriptionItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  // Selecting a medicine from inventory links medicineId (so allergy/expiry
  // checks and dispense-time stock deduction can find it) and pre-fills the
  // free-text name, which stays editable for medicines outside inventory.
  function selectPrescriptionMedicine(idx, medicineId) {
    const medicine = medicines.find((m) => m.id === Number(medicineId));
    setPrescriptionItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, medicineId, medicineName: medicine ? medicine.name : it.medicineName } : it))
    );
  }

  function removePrescriptionRow(idx) {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function showWarnings(warnings) {
    if (warnings?.length) {
      alert(`Warning:\n\n${warnings.map((w) => `- ${w.message}`).join('\n')}`);
    }
  }

  async function handleAddRecord(e) {
    e.preventDefault();
    setSavingRecord(true);
    try {
      const res = await medicalRecordsApi.create({
        ...recordForm,
        bpSystolic: recordForm.bpSystolic ? Number(recordForm.bpSystolic) : null,
        bpDiastolic: recordForm.bpDiastolic ? Number(recordForm.bpDiastolic) : null,
        temperature: recordForm.temperature ? Number(recordForm.temperature) : null,
        pulse: recordForm.pulse ? Number(recordForm.pulse) : null,
        weight: recordForm.weight ? Number(recordForm.weight) : null,
        patientId: id,
        prescriptionItems: prescriptionItems
          .filter((it) => it.medicineName.trim())
          .map((it) => ({ ...it, medicineId: it.medicineId ? Number(it.medicineId) : null })),
      });
      setRecordModalOpen(false);
      await load();
      showWarnings(res.data.warnings);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medical record');
    } finally {
      setSavingRecord(false);
    }
  }

  // Drafts visit notes from the diagnosis/treatment/vitals already entered
  // in this form. Uses AI_API_KEY server-side if configured, otherwise a
  // built-in template — either way it only pre-fills the (still editable)
  // Notes textarea; nothing is saved until the doctor reviews and submits.
  async function handleGenerateNotes() {
    setGeneratingNotes(true);
    try {
      const res = await aiApi.generateSummary({
        title: 'Visit Notes',
        patientName: patient?.name,
        fields: {
          Diagnosis: recordForm.diagnosis,
          Treatment: recordForm.treatment,
          Vitals: formatVitals(recordForm),
        },
      });
      setRecordForm((f) => ({ ...f, notes: res.data.summary }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setGeneratingNotes(false);
    }
  }

  async function handleDispense(itemId) {
    try {
      const res = await medicalRecordsApi.dispensePrescriptionItem(itemId);
      await load();
      showWarnings(res.data.warnings);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispense item');
    }
  }

  // --- Lab orders ---
  async function handleAddLabOrder(e) {
    e.preventDefault();
    setSavingLab(true);
    try {
      await labOrdersApi.create({ ...labForm, patientId: id });
      setLabModalOpen(false);
      setLabForm(emptyLabOrder);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to order lab test');
    } finally {
      setSavingLab(false);
    }
  }

  async function handleUpdateLabOrder(order, updates) {
    try {
      await labOrdersApi.update(order.id, updates);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update lab order');
    }
  }

  // --- Admissions ---
  async function handleAdmit(e) {
    e.preventDefault();
    setSavingAdmit(true);
    try {
      await admissionsApi.create({ ...admitForm, patientId: id });
      setAdmitModalOpen(false);
      setAdmitForm(emptyAdmission);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to admit patient');
    } finally {
      setSavingAdmit(false);
    }
  }

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
      patientName: patient?.name,
      fields: {
        Ward: `${admission.ward} (bed ${admission.bedNumber})`,
        'Reason for admission': admission.reason,
        'Admission date': admission.admissionDate,
        'Attending doctor': admission.Doctor?.name,
      },
    });
    return res.data.summary;
  }

  // --- Immunizations ---
  function openImmunizationModal() {
    setImmForm(emptyImmunization);
    setImmModalOpen(true);
  }

  async function handleAddImmunization(e) {
    e.preventDefault();
    setSavingImm(true);
    try {
      await immunizationsApi.create({
        ...immForm,
        patientId: id,
        doseNumber: immForm.doseNumber ? Number(immForm.doseNumber) : null,
        nextDueDate: immForm.nextDueDate || null,
      });
      setImmModalOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record immunization');
    } finally {
      setSavingImm(false);
    }
  }

  async function handleDeleteImmunization(immId) {
    if (!confirm('Remove this immunization record?')) return;
    try {
      await immunizationsApi.remove(immId);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete immunization record');
    }
  }

  // --- Patient portal access ---
  async function handleSetPin(e) {
    e.preventDefault();
    setSavingPin(true);
    setPinMessage('');
    try {
      const res = await patientsApi.setPortalPin(id, { pin, portalEmail: portalEmail || undefined });
      setPin('');
      setPinMessage(res.data.warning || 'Portal PIN set. Share it with the patient along with the phone number on file.');
    } catch (err) {
      setPinMessage(err.response?.data?.message || 'Failed to set portal PIN');
    } finally {
      setSavingPin(false);
    }
  }

  if (error) return <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!patient) return <div className="text-slate-500">Loading...</div>;

  const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob)) / 3.15576e10) : null;

  const vitalsTrend = (patient.MedicalRecords || [])
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => ({
      date: r.date,
      bpSystolic: r.bpSystolic, bpDiastolic: r.bpDiastolic,
      temperature: r.temperature, pulse: r.pulse, weight: r.weight,
    }));
  const hasVitalsTrend = vitalsTrend.some((v) => v.bpSystolic || v.temperature || v.pulse || v.weight);

  // Build a unified, chronological timeline from every clinical event we have.
  const timelineEvents = [
    ...(patient.Appointments || []).map((a) => ({
      date: a.date, type: 'appointment', icon: CalendarClock, tone: 'text-sky-600 bg-sky-50',
      title: `Appointment with Dr. ${a.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'Unassigned'}`,
      detail: a.reason || 'No reason given', status: a.status,
    })),
    ...(patient.MedicalRecords || []).map((r) => ({
      date: r.date, type: 'record', icon: FileText, tone: 'text-emerald-600 bg-emerald-50',
      title: `Medical record by Dr. ${r.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'N/A'}`,
      detail: r.diagnosis || 'No diagnosis recorded',
    })),
    ...(patient.LabOrders || []).map((l) => ({
      date: l.orderedDate, type: 'lab', icon: FlaskConical, tone: 'text-purple-600 bg-purple-50',
      title: `Lab order: ${l.testName}`, detail: l.result || 'Awaiting result', status: l.status,
    })),
    ...(patient.Admissions || []).map((a) => ({
      date: a.admissionDate, type: 'admission', icon: BedDouble, tone: 'text-amber-600 bg-amber-50',
      title: `Admitted to ${a.ward} (bed ${a.bedNumber})`, detail: a.reason || '', status: a.status,
    })),
    ...(patient.Invoices || []).map((inv) => ({
      date: inv.date, type: 'invoice', icon: Receipt, tone: 'text-rose-600 bg-rose-50',
      title: `Invoice ${inv.invoiceNumber}`, detail: `$${Number(inv.total).toFixed(2)}`, status: inv.status,
    })),
    ...(patient.Immunizations || []).map((v) => ({
      date: v.dateGiven, type: 'immunization', icon: Syringe, tone: 'text-teal-600 bg-teal-50',
      title: `${v.vaccineName}${v.doseNumber ? ` (dose ${v.doseNumber})` : ''}`,
      detail: v.administeredBy ? `Given by ${v.administeredBy}` : '',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const upcomingImmunizations = (patient.Immunizations || [])
    .filter((v) => v.nextDueDate && new Date(v.nextDueDate) >= new Date(new Date().toISOString().slice(0, 10)))
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

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

        {canManagePortalAccess && (
          <div className="card p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Patient Portal Access</h2>
            <p className="mb-3 text-xs text-slate-500">
              Set a PIN so this patient can sign in at /portal/login with their phone number ({patient.phone || 'no phone on file'}) to view appointments, records &amp; bills.
            </p>
            <form onSubmit={handleSetPin} className="space-y-2">
              <input
                className="input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="New 4-6 digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
              />
              <input
                className="input"
                type="email"
                placeholder="Portal email (optional)"
                value={portalEmail}
                onChange={(e) => setPortalEmail(e.target.value)}
              />
              <button type="submit" className="btn-secondary w-full" disabled={savingPin || pin.length < 4}>
                {savingPin ? 'Saving...' : 'Set PIN'}
              </button>
              {pinMessage && <p className="text-xs text-slate-600">{pinMessage}</p>}
            </form>
          </div>
        )}

        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Visit Timeline</h2>
            <button onClick={() => setShowTimeline((s) => !s)} className="text-xs text-indigo-600 hover:underline">
              {showTimeline ? 'Hide' : 'Show'}
            </button>
          </div>
          {showTimeline && (
            timelineEvents.length ? (
              <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {timelineEvents.map((ev, i) => {
                  const Icon = ev.icon;
                  return (
                    <li key={i} className="flex gap-3 text-sm">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ev.tone}`}>
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">{ev.title}</p>
                          <span className="shrink-0 text-xs text-slate-400">{ev.date}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{ev.detail}</p>
                      </div>
                      {ev.status && <StatusBadge status={ev.status} />}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No clinical activity recorded yet.</p>
            )
          )}
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
                    {a.isVideoConsult && a.videoLink && (
                      <a href={a.videoLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                        <Video size={12} /> Join Video Call
                      </a>
                    )}
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No appointments yet.</p>
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

        {hasVitalsTrend && (
          <div className="card p-5 lg:col-span-3">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Vitals Trend</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Blood Pressure</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={vitalsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="bpSystolic" name="Systolic" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line type="monotone" dataKey="bpDiastolic" name="Diastolic" stroke="#f43f5e" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Temperature (°F)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={vitalsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Pulse (bpm)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={vitalsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="pulse" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Weight (lbs)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={vitalsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="card p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Medical Records &amp; Prescriptions</h2>
            {canAddRecord && (
              <button className="btn-primary" onClick={openRecordModal}>
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Dr. {r.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'N/A'}</span>
                      <button onClick={() => setViewRecord(r)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="View / Print">
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                  {formatVitals(r) && <p className="text-xs text-slate-500 mb-1">Vitals: {formatVitals(r)}</p>}
                  <p><span className="font-medium">Diagnosis:</span> {r.diagnosis || '—'}</p>
                  {r.treatment && <p><span className="font-medium">Treatment:</span> {r.treatment}</p>}
                  {r.prescription && <p><span className="font-medium">Notes on prescription:</span> {r.prescription}</p>}
                  {r.notes && <p className="text-slate-500 mt-1">{r.notes}</p>}

                  {r.PrescriptionItems?.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-left text-slate-500">
                          <tr>
                            <th className="py-1 pr-2">Medicine</th>
                            <th className="py-1 pr-2">Dosage</th>
                            <th className="py-1 pr-2">Frequency</th>
                            <th className="py-1 pr-2">Duration</th>
                            <th className="py-1 pr-2">Qty</th>
                            <th className="py-1 pr-2">Status</th>
                            {canDispense && <th className="py-1 pr-2"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {r.PrescriptionItems.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1 pr-2 font-medium text-slate-800">{item.medicineName}</td>
                              <td className="py-1 pr-2">{item.dosage || '—'}</td>
                              <td className="py-1 pr-2">{item.frequency || '—'}</td>
                              <td className="py-1 pr-2">{item.duration || '—'}</td>
                              <td className="py-1 pr-2">{item.quantity}</td>
                              <td className="py-1 pr-2">
                                {item.dispensed ? (
                                  <span className="badge bg-emerald-100 text-emerald-700">Dispensed</span>
                                ) : (
                                  <span className="badge bg-amber-100 text-amber-700">Pending</span>
                                )}
                              </td>
                              {canDispense && (
                                <td className="py-1 pr-2">
                                  {!item.dispensed && (
                                    <button onClick={() => handleDispense(item.id)} className="text-indigo-600 hover:underline flex items-center gap-1">
                                      <CheckCircle2 size={13} /> Dispense
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-3 border-t border-slate-100 pt-2">
                    <AttachmentList entityType="MedicalRecord" entityId={r.id} canEdit={canAddRecord} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No medical records yet.</p>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Lab Orders</h2>
            {canOrderLab && (
              <button className="btn-primary" onClick={() => setLabModalOpen(true)}>
                <Plus size={16} /> Order Test
              </button>
            )}
          </div>
          {patient.LabOrders?.length ? (
            <ul className="divide-y divide-slate-100">
              {patient.LabOrders.map((l) => (
                <li key={l.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-slate-800 flex items-center gap-1.5"><FlaskConical size={14} /> {l.testName}</p>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Ordered {l.orderedDate} by Dr. {l.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'N/A'} {l.priority === 'urgent' && <span className="text-rose-600 font-medium">(urgent)</span>}</p>
                  {l.result && <p className="text-xs text-slate-600">Result: {l.result}</p>}
                  {canOrderLab && l.status !== 'completed' && l.status !== 'cancelled' && (
                    <div className="mt-1 flex gap-2">
                      {l.status === 'ordered' && (
                        <button onClick={() => handleUpdateLabOrder(l, { status: 'in_progress' })} className="text-xs text-indigo-600 hover:underline">Mark In Progress</button>
                      )}
                      <button
                        onClick={() => {
                          const result = prompt('Enter result for ' + l.testName + ':');
                          if (result !== null) {
                            handleUpdateLabOrder(l, { status: 'completed', result, resultDate: new Date().toISOString().slice(0, 10) });
                          }
                        }}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Enter Result
                      </button>
                    </div>
                  )}

                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <AttachmentList entityType="LabOrder" entityId={l.id} canEdit={canOrderLab} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No lab orders yet.</p>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Admissions</h2>
            {canAdmit && (
              <button className="btn-primary" onClick={() => setAdmitModalOpen(true)}>
                <Plus size={16} /> Admit
              </button>
            )}
          </div>
          {patient.Admissions?.length ? (
            <ul className="divide-y divide-slate-100">
              {patient.Admissions.map((a) => (
                <li key={a.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-slate-800 flex items-center gap-1.5"><BedDouble size={14} /> {a.ward}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-slate-500">Bed {a.bedNumber} • Admitted {a.admissionDate}</p>
                  {a.dischargeDate && <p className="text-xs text-slate-500">Discharged {a.dischargeDate}</p>}
                  <div className="mt-1 flex items-center gap-3">
                    {canAdmit && a.status === 'admitted' && (
                      <button onClick={() => setDischargeTarget(a)} className="text-xs text-rose-600 hover:underline flex items-center gap-1">
                        <LogOutIcon size={13} /> Discharge
                      </button>
                    )}
                    {a.status === 'discharged' && (
                      <button onClick={() => setViewAdmission(a)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                        <Eye size={13} /> Summary
                      </button>
                    )}
                  </div>

                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <AttachmentList entityType="Admission" entityId={a.id} canEdit={canAdmit} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No admission history.</p>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Immunizations</h2>
            {canAddRecord && (
              <button className="btn-primary" onClick={openImmunizationModal}>
                <Plus size={16} /> Add Immunization
              </button>
            )}
          </div>
          {upcomingImmunizations.length > 0 && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Next due: {upcomingImmunizations.map((v) => `${v.vaccineName} on ${v.nextDueDate}`).join(' · ')}
            </p>
          )}
          {patient.Immunizations?.length ? (
            <ul className="divide-y divide-slate-100">
              {patient.Immunizations
                .slice()
                .sort((a, b) => new Date(b.dateGiven) - new Date(a.dateGiven))
                .map((v) => (
                  <li key={v.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Syringe size={14} /> {v.vaccineName}{v.doseNumber ? ` — dose ${v.doseNumber}` : ''}
                      </p>
                      {canAddRecord && (
                        <button onClick={() => handleDeleteImmunization(v.id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Given {v.dateGiven}{v.administeredBy ? ` by ${v.administeredBy}` : ''}{v.batchNumber ? ` · Batch ${v.batchNumber}` : ''}
                    </p>
                    {v.nextDueDate && <p className="text-xs text-amber-600">Next due {v.nextDueDate}</p>}
                    {v.notes && <p className="text-xs text-slate-500 mt-0.5">{v.notes}</p>}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No immunization records yet.</p>
          )}
        </div>
      </div>

      <Modal open={recordModalOpen} onClose={() => setRecordModalOpen(false)} title="Add Medical Record" wide>
        <form onSubmit={handleAddRecord} className="space-y-4">
          <div>
            <label className="label">Vitals</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="col-span-2 flex items-center gap-1">
                <input type="number" className="input" placeholder="Systolic" value={recordForm.bpSystolic} onChange={(e) => setRecordForm({ ...recordForm, bpSystolic: e.target.value })} />
                <span className="text-slate-400">/</span>
                <input type="number" className="input" placeholder="Diastolic" value={recordForm.bpDiastolic} onChange={(e) => setRecordForm({ ...recordForm, bpDiastolic: e.target.value })} />
              </div>
              <input type="number" step="0.1" className="input" placeholder="Temp (°F)" value={recordForm.temperature} onChange={(e) => setRecordForm({ ...recordForm, temperature: e.target.value })} />
              <input type="number" className="input" placeholder="Pulse (bpm)" value={recordForm.pulse} onChange={(e) => setRecordForm({ ...recordForm, pulse: e.target.value })} />
              <input type="number" step="0.1" className="input" placeholder="Weight (lbs)" value={recordForm.weight} onChange={(e) => setRecordForm({ ...recordForm, weight: e.target.value })} />
            </div>
            <input
              className="input mt-2"
              value={recordForm.vitals}
              onChange={(e) => setRecordForm({ ...recordForm, vitals: e.target.value })}
              placeholder="Other vitals or notes (e.g. SpO2, respiratory rate)"
            />
          </div>
          <div>
            <label className="label">Diagnosis</label>
            <textarea className="input" rows={2} value={recordForm.diagnosis} onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })} />
          </div>
          <div>
            <label className="label">Treatment</label>
            <textarea className="input" rows={2} value={recordForm.treatment} onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })} />
          </div>

          <div>
            <label className="label">Prescription Items</label>
            <div className="space-y-2">
              {prescriptionItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    className="input col-span-2"
                    value={item.medicineId}
                    onChange={(e) => selectPrescriptionMedicine(idx, e.target.value)}
                    title="Link to inventory (optional)"
                  >
                    <option value="">From inventory…</option>
                    {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input className="input col-span-2" placeholder="Medicine" value={item.medicineName} onChange={(e) => updatePrescriptionRow(idx, 'medicineName', e.target.value)} />
                  <input className="input col-span-2" placeholder="Dosage" value={item.dosage} onChange={(e) => updatePrescriptionRow(idx, 'dosage', e.target.value)} />
                  <input className="input col-span-2" placeholder="Frequency" value={item.frequency} onChange={(e) => updatePrescriptionRow(idx, 'frequency', e.target.value)} />
                  <input className="input col-span-1" placeholder="Duration" value={item.duration} onChange={(e) => updatePrescriptionRow(idx, 'duration', e.target.value)} />
                  <input type="number" min="1" className="input col-span-2" placeholder="Qty" value={item.quantity} onChange={(e) => updatePrescriptionRow(idx, 'quantity', e.target.value)} />
                  <button type="button" onClick={() => removePrescriptionRow(idx)} className="col-span-1 rounded p-1.5 text-rose-500 hover:bg-rose-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addPrescriptionRow} className="mt-2 text-sm text-indigo-600 hover:underline">+ Add medicine</button>
          </div>

          <div>
            <label className="label">Additional prescription notes</label>
            <textarea className="input" rows={2} value={recordForm.prescription} onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0">Notes</label>
              <button
                type="button"
                onClick={handleGenerateNotes}
                disabled={generatingNotes || (!recordForm.diagnosis && !recordForm.treatment && !formatVitals(recordForm))}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                title="Draft notes from the diagnosis/treatment/vitals above — review before saving"
              >
                <Sparkles size={13} /> {generatingNotes ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>
            <textarea className="input" rows={3} value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} placeholder="Add or generate a summary, then edit as needed" />
          </div>
          <div>
            <label className="label">Doctor's Signature</label>
            <SignaturePad onChange={(signatureData) => setRecordForm((f) => ({ ...f, signatureData }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setRecordModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingRecord}>{savingRecord ? 'Saving...' : 'Save Record'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={labModalOpen} onClose={() => setLabModalOpen(false)} title="Order Lab Test">
        <form onSubmit={handleAddLabOrder} className="space-y-4">
          <div>
            <label className="label">Test Name *</label>
            <input required className="input" value={labForm.testName} onChange={(e) => setLabForm({ ...labForm, testName: e.target.value })} placeholder="e.g. Complete Blood Count" />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={labForm.priority} onChange={(e) => setLabForm({ ...labForm, priority: e.target.value })}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={labForm.notes} onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setLabModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingLab}>{savingLab ? 'Ordering...' : 'Order Test'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={admitModalOpen} onClose={() => setAdmitModalOpen(false)} title="Admit Patient">
        <form onSubmit={handleAdmit} className="space-y-4">
          <div>
            <label className="label">Ward *</label>
            <input required className="input" value={admitForm.ward} onChange={(e) => setAdmitForm({ ...admitForm, ward: e.target.value })} placeholder="e.g. General Ward, ICU" />
          </div>
          <div>
            <label className="label">Bed Number *</label>
            <input required className="input" value={admitForm.bedNumber} onChange={(e) => setAdmitForm({ ...admitForm, bedNumber: e.target.value })} placeholder="e.g. B-12" />
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input" rows={2} value={admitForm.reason} onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setAdmitModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingAdmit}>{savingAdmit ? 'Admitting...' : 'Admit Patient'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={immModalOpen} onClose={() => setImmModalOpen(false)} title="Add Immunization">
        <form onSubmit={handleAddImmunization} className="space-y-4">
          <div>
            <label className="label">Vaccine *</label>
            <input required className="input" value={immForm.vaccineName} onChange={(e) => setImmForm({ ...immForm, vaccineName: e.target.value })} placeholder="e.g. Influenza, Tetanus, COVID-19" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dose Number</label>
              <input type="number" min="1" className="input" value={immForm.doseNumber} onChange={(e) => setImmForm({ ...immForm, doseNumber: e.target.value })} />
            </div>
            <div>
              <label className="label">Date Given *</label>
              <input required type="date" className="input" value={immForm.dateGiven} onChange={(e) => setImmForm({ ...immForm, dateGiven: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Next Due Date</label>
              <input type="date" className="input" value={immForm.nextDueDate} onChange={(e) => setImmForm({ ...immForm, nextDueDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Batch Number</label>
              <input className="input" value={immForm.batchNumber} onChange={(e) => setImmForm({ ...immForm, batchNumber: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Administered By</label>
            <input className="input" value={immForm.administeredBy} onChange={(e) => setImmForm({ ...immForm, administeredBy: e.target.value })} placeholder="e.g. Nurse Patel" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={immForm.notes} onChange={(e) => setImmForm({ ...immForm, notes: e.target.value })} placeholder="Any reactions or special notes" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setImmModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingImm}>{savingImm ? 'Saving...' : 'Save Immunization'}</button>
          </div>
        </form>
      </Modal>

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
            <div className="mb-4 flex items-center justify-between print:mb-6">
              <div>
                <p className="hidden text-lg font-semibold text-slate-900 print:block">MediCare HMS — Discharge Summary</p>
                <p className="font-medium text-slate-900">{patient.name}</p>
                <p className="text-sm text-slate-500">
                  {viewAdmission.ward} · Bed {viewAdmission.bedNumber} · Admitted {viewAdmission.admissionDate}
                </p>
              </div>
              <button onClick={() => window.print()} className="btn-secondary print:hidden" title="Print or save as PDF">
                <Printer size={16} /> Print / PDF
              </button>
            </div>
            <dl className="space-y-2 text-sm">
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

      <Modal open={!!viewRecord} onClose={() => setViewRecord(null)} title="Medical Record" wide>
        {viewRecord && (
          <div className="print-area">
            <div className="mb-4 flex items-center justify-between print:mb-6">
              <div>
                <p className="hidden text-lg font-semibold text-slate-900 print:block">MediCare HMS — Medical Record</p>
                <p className="font-medium text-slate-900">{patient.name}</p>
                <p className="text-sm text-slate-500">
                  {viewRecord.date} · Dr. {viewRecord.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'N/A'}
                </p>
              </div>
              <button onClick={() => window.print()} className="btn-secondary print:hidden" title="Print or save as PDF">
                <Printer size={16} /> Print / PDF
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              {formatVitals(viewRecord) && <div className="flex justify-between gap-3"><dt className="text-slate-500">Vitals</dt><dd className="text-slate-800">{formatVitals(viewRecord)}</dd></div>}
              <div><dt className="mb-1 text-slate-500">Diagnosis</dt><dd className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{viewRecord.diagnosis || '—'}</dd></div>
              {viewRecord.treatment && <div><dt className="mb-1 text-slate-500">Treatment</dt><dd className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{viewRecord.treatment}</dd></div>}
              {viewRecord.prescription && <div><dt className="mb-1 text-slate-500">Prescription Notes</dt><dd className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{viewRecord.prescription}</dd></div>}
              {viewRecord.notes && <div><dt className="mb-1 text-slate-500">Notes</dt><dd className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{viewRecord.notes}</dd></div>}
            </dl>

            {viewRecord.PrescriptionItems?.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-1 pr-2">Medicine</th>
                      <th className="py-1 pr-2">Dosage</th>
                      <th className="py-1 pr-2">Frequency</th>
                      <th className="py-1 pr-2">Duration</th>
                      <th className="py-1 pr-2">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewRecord.PrescriptionItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1 pr-2 font-medium text-slate-800">{item.medicineName}</td>
                        <td className="py-1 pr-2">{item.dosage || '—'}</td>
                        <td className="py-1 pr-2">{item.frequency || '—'}</td>
                        <td className="py-1 pr-2">{item.duration || '—'}</td>
                        <td className="py-1 pr-2">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Doctor's Signature</p>
              {viewRecord.signatureData ? (
                <img src={viewRecord.signatureData} alt="Doctor's signature" className="h-20 border-b border-slate-300" />
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

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{children}</dd>
    </div>
  );
}
