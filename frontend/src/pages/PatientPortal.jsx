import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse, LogOut, Plus, CalendarClock, FileText, Receipt, Video, XCircle,
} from 'lucide-react';
import { patientPortalApi } from '../api';
import { usePatientPortal } from '../context/PatientPortalContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const today = new Date().toISOString().slice(0, 10);
const emptyBooking = { doctorId: '', date: today, time: '', reason: '', isVideoConsult: false };

export default function PatientPortal() {
  const { patient, logout } = usePatientPortal();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [bookOpen, setBookOpen] = useState(false);
  const [form, setForm] = useState(emptyBooking);
  const [slots, setSlots] = useState([]);
  const [slotsMessage, setSlotsMessage] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [aRes, rRes, iRes] = await Promise.all([
        patientPortalApi.appointments(),
        patientPortalApi.medicalRecords(),
        patientPortalApi.invoices(),
      ]);
      setAppointments(aRes.data);
      setRecords(rRes.data);
      setInvoices(iRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your portal data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleLogout() {
    logout();
    navigate('/portal/login');
  }

  function openBooking() {
    setForm(emptyBooking);
    setBookOpen(true);
    if (!doctors.length) {
      patientPortalApi.doctors().then((res) => setDoctors(res.data)).catch(() => {});
    }
  }

  useEffect(() => {
    if (!bookOpen || !form.doctorId || !form.date) {
      setSlots([]);
      setSlotsMessage('');
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    patientPortalApi.availableSlots(form.doctorId, form.date)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.data.slots || []);
        setSlotsMessage(res.data.reason || (res.data.slots?.length ? '' : 'No open slots for this date.'));
      })
      .catch(() => { if (!cancelled) { setSlots([]); setSlotsMessage(''); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [bookOpen, form.doctorId, form.date]);

  async function handleBook(e) {
    e.preventDefault();
    if (!form.doctorId || !form.time) return alert('Please choose a doctor and a time slot');
    setSaving(true);
    try {
      await patientPortalApi.bookAppointment(form);
      setBookOpen(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(appt) {
    if (!confirm(`Cancel your appointment on ${appt.date} at ${appt.time}?`)) return;
    try {
      await patientPortalApi.cancelAppointment(appt.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment');
    }
  }

  const upcoming = appointments.filter((a) => a.status === 'scheduled');
  const past = appointments.filter((a) => a.status !== 'scheduled');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <HeartPulse size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">MediCare Patient Portal</p>
              <p className="text-xs text-slate-500">{patient?.name} {patient?.mrn ? `• ${patient.mrn}` : ''}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Your appointments</h1>
          <button className="btn-primary" onClick={openBooking}>
            <Plus size={16} /> Book Appointment
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <CalendarClock size={16} /> Upcoming
            </h2>
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming appointments.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-medium text-slate-800">{a.date} at {a.time}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Dr. {a.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'Unassigned'}
                      {a.Doctor?.specialization ? ` • ${a.Doctor.specialization}` : ''}
                    </p>
                    {a.reason && <p className="mt-1 text-xs text-slate-500">{a.reason}</p>}
                    <div className="mt-2 flex items-center gap-3">
                      {a.isVideoConsult && a.videoLink && (
                        <a href={a.videoLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                          <Video size={13} /> Join Video Call
                        </a>
                      )}
                      <button onClick={() => handleCancel(a)} className="flex items-center gap-1 text-xs text-rose-600 hover:underline">
                        <XCircle size={13} /> Cancel
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <CalendarClock size={16} /> Past &amp; Cancelled
            </h2>
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : past.length === 0 ? (
              <p className="text-sm text-slate-500">No past appointments yet.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto divide-y divide-slate-100">
                {past.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="text-slate-800">{a.date} at {a.time}</p>
                      <p className="text-xs text-slate-500">Dr. {a.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'Unassigned'}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <FileText size={16} /> Medical Record Summaries
            </h2>
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : records.length === 0 ? (
              <p className="text-sm text-slate-500">No medical records yet.</p>
            ) : (
              <ul className="space-y-3">
                {records.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-medium text-slate-800">{r.date}</p>
                      <span className="text-xs text-slate-500">Dr. {r.Doctor?.name?.replace(/^Dr\.?\s*/, '') || 'N/A'}</span>
                    </div>
                    <p><span className="font-medium">Diagnosis:</span> {r.diagnosis || '—'}</p>
                    {r.treatment && <p><span className="font-medium">Treatment:</span> {r.treatment}</p>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-400">
              This is a summary view. For full clinical details, please contact the hospital.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Receipt size={16} /> Invoices
            </h2>
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-slate-500">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <li key={inv.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-800">{inv.invoiceNumber}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-xs text-slate-500">${Number(inv.total).toFixed(2)} • {inv.date}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book an Appointment">
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="label">Doctor *</label>
            <select required className="input" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value, time: '' })}>
              <option value="">Select doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" required min={today} className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: '' })} />
          </div>
          <div>
            <label className="label">Time *</label>
            {slots.length > 0 ? (
              <select required className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
                <option value="">Select a slot</option>
                {slots.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input className="input" value="No slots to choose from yet" disabled />
            )}
            {slotsLoading && <p className="mt-1 text-xs text-slate-400">Checking availability...</p>}
            {!slotsLoading && slotsMessage && <p className="mt-1 text-xs text-amber-600">{slotsMessage}</p>}
          </div>
          <div>
            <label className="label">Reason for visit</label>
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Follow-up, annual checkup" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isVideoConsult}
              onChange={(e) => setForm({ ...form, isVideoConsult: e.target.checked })}
            />
            Request a video consultation instead of an in-person visit
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setBookOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Booking...' : 'Book Appointment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
