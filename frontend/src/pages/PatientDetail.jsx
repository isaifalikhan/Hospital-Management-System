import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, FileText, FlaskConical, BedDouble, Receipt, CalendarClock,
  Trash2, CheckCircle2, LogOut as LogOutIcon,
} from 'lucide-react';
import { patientsApi, medicalRecordsApi, labOrdersApi, admissionsApi, medicinesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const emptyRecord = { diagnosis: '', treatment: '', prescription: '', notes: '', vitals: '' };
const emptyPrescriptionItem = { medicineId: '', medicineName: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' };
const emptyLabOrder = { testName: '', priority: 'routine', notes: '' };
const emptyAdmission = { ward: '', bedNumber: '', reason: '' };

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAddRecord = ['admin', 'doctor'].includes(user?.role);
  const canOrderLab = ['admin', 'doctor'].includes(user?.role);
  const canAdmit = ['admin', 'doctor', 'receptionist'].includes(user?.role);
  const canDispense = ['admin', 'pharmacist'].includes(user?.role);

  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState(emptyRecord);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [savingRecord, setSavingRecord] = useState(false);
  const [medicines, setMedicines] = useState([]);

  const [labModalOpen, setLabModalOpen] = useState(false);
  const [labForm, setLabForm] = useState(emptyLabOrder);
  const [savingLab, setSavingLab] = useState(false);

  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState(emptyAdmission);
  const [savingAdmit, setSavingAdmit] = useState(false);

  const [showTimeline, setShowTimeline] = useState(true);

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

  async function handleDischarge(admission) {
    if (!confirm('Discharge this patient from ' + admission.ward + '?')) return;
    try {
      await admissionsApi.discharge(admission.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to discharge patient');
    }
  }

  if (error) return <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!patient) return <div className="text-slate-500">Loading...</div>;

  const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob)) / 3.15576e10) : null;

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
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

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
                    <span className="text-xs text-slate-500">Dr. {r.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'N/A'}</span>
                  </div>
                  {r.vitals && <p className="text-xs text-slate-500 mb-1">Vitals: {r.vitals}</p>}
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
                  {canAdmit && a.status === 'admitted' && (
                    <button onClick={() => handleDischarge(a)} className="mt-1 text-xs text-rose-600 hover:underline flex items-center gap-1">
                      <LogOutIcon size={13} /> Discharge
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No admission history.</p>
          )}
        </div>
      </div>

      <Modal open={recordModalOpen} onClose={() => setRecordModalOpen(false)} title="Add Medical Record" wide>
        <form onSubmit={handleAddRecord} className="space-y-4">
          <div>
            <label className="label">Vitals</label>
            <input className="input" value={recordForm.vitals} onChange={(e) => setRecordForm({ ...recordForm, vitals: e.target.value })} placeholder="e.g. BP:120/80, Temp:98.6F, Pulse:72" />
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
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} />
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
