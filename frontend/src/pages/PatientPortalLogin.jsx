import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, AlertCircle } from 'lucide-react';
import { usePatientPortal } from '../context/PatientPortalContext';

export default function PatientPortalLogin() {
  const { login } = usePatientPortal();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(phone, pin);
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <HeartPulse size={26} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">MediCare Patient Portal</h1>
          <p className="text-sm text-slate-500">View your appointments, records &amp; bills</p>
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
              <label className="label">Phone Number</label>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="The phone number on file with the hospital"
                autoFocus
              />
            </div>
            <div>
              <label className="label">PIN</label>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-6 digit PIN"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Don't have a PIN yet? Ask the front desk to set one up for you on your next visit.
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          Hospital staff — <a href="/login" className="text-indigo-600 hover:underline">sign in here instead</a>.
        </p>
      </div>
    </div>
  );
}
