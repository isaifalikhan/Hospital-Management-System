import { useEffect, useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { publicApi } from '../api';

const REFRESH_MS = 5000;

// Public, no-login waiting-room queue board — meant to run full-screen on a
// lobby TV/kiosk. Polls GET /api/public/queue, which deliberately returns
// token numbers and doctor names only, never patient names (see
// backend/controllers/publicController.js#queue) — safe for anyone walking
// past to see. Staff call/complete tokens from the separate, authenticated
// Queue page (frontend/src/pages/Queue.jsx).
export default function QueueDisplay() {
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    function load() {
      publicApi.queue()
        .then((res) => { if (!cancelled) { setQueue(res.data); setError(''); } })
        .catch(() => { if (!cancelled) setError('Unable to load queue.'); });
    }
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 px-8 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
              <HeartPulse size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">MediCare HMS</h1>
              <p className="text-sm text-slate-400">Today's Queue</p>
            </div>
          </div>
          <p className="font-mono text-3xl tabular-nums text-slate-300">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>

        {error && <p className="mb-4 text-rose-400">{error}</p>}

        {queue.length === 0 ? (
          <p className="mt-24 text-center text-2xl text-slate-500">No walk-in patients queued right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {queue.map((q) => (
              <div key={q.doctorId} className="rounded-2xl bg-slate-800 p-6">
                <p className="text-lg font-semibold text-slate-200">{q.doctorName}</p>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-sm font-medium uppercase tracking-wide text-emerald-400">Now Serving</span>
                  <span className="font-mono text-6xl font-bold tabular-nums text-emerald-400">
                    {q.nowServing != null ? `#${q.nowServing}` : '—'}
                  </span>
                </div>
                {q.nextTokens.length > 0 && (
                  <p className="mt-4 text-sm text-slate-400">
                    Next up: {q.nextTokens.map((t) => `#${t}`).join(', ')}
                    {q.waitingCount > q.nextTokens.length && ` (+${q.waitingCount - q.nextTokens.length} more)`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
