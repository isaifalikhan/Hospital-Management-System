import { useEffect, useState } from 'react';
import { UserPlus, Search, CheckCircle2, Ticket, AlertCircle } from 'lucide-react';
import { patientsApi, doctorsApi, appointmentsApi } from '../api';
import PageHeader from '../components/PageHeader';

const emptyNewPatient = {
  name: '', dob: '', gender: 'male', bloodGroup: '', phone: '', email: '',
  address: '', emergencyContactName: '', emergencyContactPhone: '', allergies: '', status: 'outpatient',
};

// Front-desk walk-in check-in: find (or register) a patient, pick a doctor,
// and submit — the server assigns today's date, the check-in time, and a
// per-doctor daily queue token automatically (see
// backend/controllers/appointmentController.js#create, visitType:
// 'walk-in'). No date/time picker here; that's the scheduled-booking flow
// on the Appointments page.
export default function CheckIn() {
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [reason, setReason] = useState('');

  const [mode, setMode] = useState('search'); // 'search' | 'new'
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [newPatient, setNewPatient] = useState(emptyNewPatient);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    doctorsApi.list().then((res) => setDoctors(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== 'search' || !search.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      patientsApi.list({ search })
        .then((res) => { if (!cancelled) setSearchResults(res.data); })
        .catch(() => { if (!cancelled) setSearchResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, mode]);

  function switchMode(next) {
    setMode(next);
    setSelectedPatient(null);
    setSearch('');
    setSearchResults([]);
    setNewPatient(emptyNewPatient);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!doctorId) { setError('Please select a doctor.'); return; }
    if (mode === 'search' && !selectedPatient) { setError('Please search for and select a patient, or switch to "New Patient".'); return; }
    if (mode === 'new' && !newPatient.name.trim()) { setError('Patient name is required.'); return; }

    setSubmitting(true);
    try {
      let patientId = selectedPatient?.id;
      let patientName = selectedPatient?.name;
      if (mode === 'new') {
        const res = await patientsApi.create(newPatient);
        patientId = res.data.id;
        patientName = res.data.name;
      }
      const apptRes = await appointmentsApi.create({ patientId, doctorId, reason, visitType: 'walk-in' });
      const doctor = doctors.find((d) => String(d.id) === String(doctorId));
      setConfirmation({
        tokenNumber: apptRes.data.tokenNumber,
        patientName: patientName || apptRes.data.Patient?.name,
        doctorName: doctor?.name || apptRes.data.Doctor?.name,
      });
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to check in patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function checkInAnother() {
    setConfirmation(null);
    switchMode('search');
    setDoctorId('');
    setReason('');
  }

  return (
    <div>
      <PageHeader title="Check-In" subtitle="Register a walk-in patient, pick a doctor, and get a queue token" />

      {confirmation ? (
        <div className="card mx-auto max-w-md p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={26} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Checked in!</h2>
          <p className="mt-1 text-sm text-slate-500">
            {confirmation.patientName} is queued to see {confirmation.doctorName}.
          </p>
          <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-3 rounded-xl bg-indigo-50 px-5 py-4">
            <Ticket size={22} className="text-indigo-600" />
            <div className="text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Token Number</p>
              <p className="text-2xl font-bold text-indigo-700">#{confirmation.tokenNumber}</p>
            </div>
          </div>
          <button className="btn-primary mt-5" onClick={checkInAnother}>Check in another patient</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="card p-5">
            <div className="mb-3 flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchMode('search')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Search size={14} /> Existing Patient
              </button>
              <button
                type="button"
                onClick={() => switchMode('new')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <UserPlus size={14} /> New Patient
              </button>
            </div>

            {mode === 'search' ? (
              <div>
                <label className="label">Search by name, MRN, or phone *</label>
                <input
                  className="input"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedPatient(null); }}
                  placeholder="Start typing..."
                />
                {selectedPatient ? (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm">
                    <span><strong>{selectedPatient.name}</strong> · {selectedPatient.mrn} · {selectedPatient.phone || 'no phone'}</span>
                    <button type="button" onClick={() => setSelectedPatient(null)} className="text-xs text-indigo-600 hover:underline">Change</button>
                  </div>
                ) : searching ? (
                  <p className="mt-2 text-xs text-slate-400">Searching...</p>
                ) : searchResults.length > 0 ? (
                  <ul className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                    {searchResults.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(p)}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-800">{p.name}</span>
                          <span className="ml-2 text-xs text-slate-400">{p.mrn} · {p.phone || 'no phone'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : search.trim() ? (
                  <p className="mt-2 text-xs text-slate-400">No matching patients — switch to "New Patient" to register them.</p>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Full Name *</label>
                  <input required className="input" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select className="input" value={newPatient.gender} onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" className="input" value={newPatient.dob} onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })} />
                </div>
                <div>
                  <label className="label">Blood Group</label>
                  <input className="input" value={newPatient.bloodGroup} onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value })} placeholder="e.g. O+" />
                </div>
                <p className="text-xs text-slate-400 sm:col-span-2">
                  Full profile (address, allergies, emergency contact) can be filled in later from the Patients page.
                </p>
              </div>
            )}
          </div>

          <div className="card p-5">
            <label className="label">Doctor *</label>
            <select required className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Select a doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.specialization ? ` — ${d.specialization}` : ''}</option>
              ))}
            </select>

            <label className="label mt-3">Reason for visit</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fever, follow-up" />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Checking in...' : 'Check In & Generate Token'}
          </button>
        </form>
      )}
    </div>
  );
}
