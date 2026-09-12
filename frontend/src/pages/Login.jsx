import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { HeartPulse, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'Admin', username: 'admin' },
  { role: 'Doctor', username: 'sjohnson' },
  { role: 'Receptionist', username: 'reception' },
  { role: 'Pharmacist', username: 'pharmacist' },
  { role: 'Lab', username: 'lab' },
];

// Shown on every build, local and deployed — the owner explicitly wants the
// one-click demo login visible on the live site (revisit if that changes).
// It's still a real liability if the demo accounts' passwords are never
// rotated: password123 for admin/sjohnson/reception/pharmacist is written
// in this repo's public README regardless of whether this panel is shown —
// see the "Deploying" section for changing/deleting them.
const SHOW_DEMO_ACCOUNTS = true;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(user) {
    setUsername(user);
    setPassword('password123');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="tone-indigo mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl">
            <HeartPulse size={27} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">MediCare HMS</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage the hospital</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200/70 bg-rose-50 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Just a patient? <Link to="/book" className="font-medium text-indigo-600 hover:underline">Book an appointment without an account</Link>
          </p>
        </div>

        {SHOW_DEMO_ACCOUNTS && (
          <div className="card mt-4 p-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Demo accounts (password: password123)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  onClick={() => fillDemo(acc.username)}
                  className="chip-button"
                >
                  <span className="block text-xs font-bold text-slate-700">{acc.role}</span>
                  <span className="block text-xs text-slate-400">{acc.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          Patient? <a href="/portal/login" className="text-indigo-600 hover:underline">Sign in to the patient portal</a>.
        </p>
      </div>
    </div>
  );
}
