import { useEffect, useState } from 'react';
import { PhoneCall, CheckCircle2, RotateCcw, UserX, Tv } from 'lucide-react';
import { appointmentsApi } from '../api';
import PageHeader from '../components/PageHeader';

const today = new Date().toISOString().slice(0, 10);
const REFRESH_MS = 10000;

// Staff-side control for today's walk-in queue: call the next token,
// mark one done, undo an accidental call, or mark a no-show. The
// unauthenticated, patient-name-free waiting-room board this drives is a
// separate page (QueueDisplay.jsx, route /queue-display) meant for a lobby
// TV — this page is the one with names and the actual controls.
export default function Queue() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const res = await appointmentsApi.list({ date: today, visitType: 'walk-in' });
      setAppointments(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(appt, updates) {
    setBusyId(appt.id);
    try {
      await appointmentsApi.update(appt.id, updates);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update queue');
    } finally {
      setBusyId(null);
    }
  }

  const byDoctor = new Map();
  for (const a of appointments) {
    if (a.status === 'cancelled') continue;
    if (!byDoctor.has(a.doctorId)) byDoctor.set(a.doctorId, { doctorName: a.Doctor?.name, tokens: [] });
    byDoctor.get(a.doctorId).tokens.push(a);
  }
  for (const group of byDoctor.values()) {
    group.tokens.sort((x, y) => (x.tokenNumber || 0) - (y.tokenNumber || 0));
  }

  return (
    <div>
      <PageHeader
        title="Queue"
        subtitle="Call and manage today's walk-in queue, per doctor"
        action={
          <a href="/queue-display" target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <Tv size={16} /> Open Waiting-Room Display
          </a>
        }
      />

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : byDoctor.size === 0 ? (
        <p className="text-slate-400">No walk-in patients checked in today.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from(byDoctor.entries()).map(([doctorId, group]) => (
            <div key={doctorId} className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">{group.doctorName}</h2>
              <ul className="divide-y divide-slate-100">
                {group.tokens.map((t) => {
                  const isDone = t.status === 'completed' || t.status === 'no-show';
                  const isServing = !!t.calledAt && !isDone;
                  return (
                    <li key={t.id} className={`flex items-center justify-between py-2.5 ${isDone ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                            isServing ? 'bg-emerald-100 text-emerald-700' : isDone ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          #{t.tokenNumber}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{t.Patient?.name}</p>
                          <p className="text-xs text-slate-400">
                            {isDone ? (t.status === 'no-show' ? 'No-show' : 'Completed') : isServing ? 'Now serving' : 'Waiting'}
                            {t.reason ? ` · ${t.reason}` : ''}
                          </p>
                        </div>
                      </div>
                      {!isDone && (
                        <div className="flex items-center gap-1">
                          {isServing ? (
                            <>
                              <button
                                disabled={busyId === t.id}
                                onClick={() => act(t, { status: 'completed' })}
                                className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                title="Mark done"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                disabled={busyId === t.id}
                                onClick={() => act(t, { calledAt: null })}
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                title="Undo call"
                              >
                                <RotateCcw size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={busyId === t.id}
                              onClick={() => act(t, { calledAt: new Date().toISOString() })}
                              className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              <PhoneCall size={13} /> Call
                            </button>
                          )}
                          <button
                            disabled={busyId === t.id}
                            onClick={() => act(t, { status: 'no-show' })}
                            className="rounded p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                            title="Mark no-show"
                          >
                            <UserX size={16} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
