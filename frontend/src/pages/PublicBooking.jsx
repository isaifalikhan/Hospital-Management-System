import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, AlertCircle, CheckCircle2, CalendarClock, ArrowLeft } from 'lucide-react';
import { publicApi } from '../api';

const today = new Date().toISOString().slice(0, 10);
const emptyForm = { doctorId: '', date: today, time: '', name: '', phone: '', email: '', reason: '' };

// Public, no-login appointment booking for walk-in web visitors. This page
// is intentionally NOT behind ProtectedRoute (see frontend/src/App.jsx) and
// only ever talks to the unauthenticated /api/public/* endpoints.
export default function PublicBooking() {
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    publicApi.listDoctors()
      .then((res) => setDoctors(res.data))
      .catch(() => setError('Could not load the list of doctors. Please refresh and try again.'))
      .finally(() => setDoctorsLoading(false));
  }, []);

  useEffect(() => {
    if (!form.doctorId || !form.date) {
      setSlots([]);
      setSlotsMessage('');
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    publicApi.availableSlots(form.doctorId, form.date)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.data.slots || []);
        setSlotsMessage(res.data.reason || (res.data.slots?.length ? '' : 'No open slots for this date — please try another date.'));
        setForm((f) => (res.data.slots?.includes(f.time) ? f : { ...f, time: '' }));
      })
      .catch(() => { if (!cancelled) { setSlots([]); setSlotsMessage('Could not check availability. Please try again.'); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.doctorId, form.date]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.doctorId || !form.date || !form.time) {
      setError('Please choose a doctor, date, and time slot.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await publicApi.book(form);
      setConfirmation(res.data.appointment);
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to book appointment. Please try again.');
      if (err.response?.status === 409) {
        // Someone else took the slot — refresh availability so they can pick another.
        publicApi.availableSlots(form.doctorId, form.date).then((res) => {
          setSlots(res.data.slots || []);
          setForm((f) => ({ ...f, time: '' }));
        }).catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  }

  function bookAnother() {
    setForm(emptyForm);
    setConfirmation(null);
    setError('');
  }

  const selectedDoctor = doctors.find((d) => String(d.id) === String(form.doctorId));

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <HeartPulse size={26} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">MediCare HMS</h1>
          <p className="text-sm text-slate-500">Book an appointment — no account needed</p>
        </div>

        {confirmation ? (
          <div className="card p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={26} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">You're booked!</h2>
            <p className="mt-1 text-sm text-slate-500">
              {confirmation.patientName}, your appointment with Dr. {confirmation.doctorName} is confirmed.
            </p>
            <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <CalendarClock size={16} className="text-indigo-600" />
              {confirmation.date} at {confirmation.time}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Please arrive a few minutes early. Contact the hospital if you need to reschedule or cancel.
            </p>
            <button className="btn-secondary mt-5" onClick={bookAnother}>Book another appointment</button>
          </div>
        ) : (
          <div className="card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="label">Doctor *</label>
                <select
                  required
                  className="input"
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value, time: '' })}
                  disabled={doctorsLoading}
                >
                  <option value="">{doctorsLoading ? 'Loading doctors...' : 'Select a doctor'}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.specialization ? ` — ${d.specialization}` : ''}
                    </option>
                  ))}
                </select>
                {selectedDoctor?.consultationFee > 0 && (
                  <p className="mt-1 text-xs text-slate-400">Consultation fee: ${Number(selectedDoctor.consultationFee).toFixed(2)}</p>
                )}
              </div>

              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  required
                  min={today}
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value, time: '' })}
                />
              </div>

              <div>
                <label className="label">Available time slots *</label>
                {slotsLoading ? (
                  <p className="text-sm text-slate-400">Checking availability...</p>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, time: s })}
                        className={`rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors ${
                          form.time === s
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    {form.doctorId ? (slotsMessage || 'Select a date to see available times.') : 'Select a doctor and date to see available times.'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Your name *</label>
                  <input
                    required
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Jane Smith"
                  />
                </div>
                <div>
                  <label className="label">Phone number *</label>
                  <input
                    required
                    type="tel"
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 555-0100"
                  />
                </div>
              </div>

              <div>
                <label className="label">Email (optional)</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="label">Reason for visit (optional)</label>
                <input
                  className="input"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. Annual check-up"
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Booking...' : 'Book Appointment'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
            <ArrowLeft size={14} /> Staff login
          </Link>
        </div>
      </div>
    </div>
  );
}
