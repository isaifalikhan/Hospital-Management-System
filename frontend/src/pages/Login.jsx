import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HeartPulse, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'Admin', username: 'admin' },
  { role: 'Doctor', username: 'sjohnson' },
  { role: 'Receptionist', username: 'reception' },
  { role: 'Pharmacist', username: 'pharmacist' },
];

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <HeartPulse size={26} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">MediCare HMS</h1>
          <p className="text-sm text-slate-500">Sign in to manage the hospital</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
        </div>

        <div className="card mt-4 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Demo accounts (password: password123)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                onClick={() => fillDemo(acc.username)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50"
              >
                <p className="font-medium text-slate-700">{acc.role}</p>
                <p className="text-slate-500">{acc.username}</p>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Patient? <a href="/portal/login" className="text-indigo-600 hover:underline">Sign in to the patient portal</a>.
        </p>
      </div>
    </div>
  );
}
