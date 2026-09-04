import { useState } from 'react';
import { DatabaseBackup, ShieldCheck, BellRing } from 'lucide-react';
import { adminApi } from '../api';
import PageHeader from '../components/PageHeader';

export default function Backup() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [lastDownloadedAt, setLastDownloadedAt] = useState(null);

  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestError, setDigestError] = useState('');
  const [digestResult, setDigestResult] = useState(null);

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      await adminApi.downloadBackup();
      setLastDownloadedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download backup');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSendDigest() {
    setSendingDigest(true);
    setDigestError('');
    setDigestResult(null);
    try {
      const res = await adminApi.sendAlertDigestNow();
      setDigestResult(res.data);
    } catch (err) {
      setDigestError(err.response?.data?.message || 'Failed to send alert digest');
    } finally {
      setSendingDigest(false);
    }
  }

  return (
    <div>
      <PageHeader title="Data Backup" subtitle="Download a full snapshot of the system's data" />

      <div className="card max-w-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <DatabaseBackup size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Full system backup</h2>
            <p className="mt-1 text-sm text-slate-500">
              Downloads every patient, appointment, medical record, invoice, and other record
              in the system as of right now. On a local/LAN installation this is a copy of the
              SQLite database file; when running against hosted Postgres it's a JSON export of
              every table instead. Keep the downloaded file somewhere secure — it contains
              protected health information.
            </p>
            <button className="btn-primary mt-4" onClick={handleDownload} disabled={downloading}>
              <DatabaseBackup size={16} /> {downloading ? 'Preparing backup…' : 'Download Backup'}
            </button>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            {lastDownloadedAt && !error && (
              <p className="mt-3 text-sm text-emerald-600">
                Backup downloaded at {lastDownloadedAt.toLocaleTimeString()}.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <p>
            This action is restricted to Admin accounts and is recorded in the Audit Log.
            Backups are generated on demand and are not stored on the server after download.
          </p>
        </div>
      </div>

      <div className="card max-w-2xl p-6 mt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <BellRing size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Low-stock &amp; overdue-invoice digest</h2>
            <p className="mt-1 text-sm text-slate-500">
              Emails every active admin a summary of medicines at or below their reorder level
              and invoices more than 3 days overdue. Runs automatically once a day; use this to
              send it right now instead of waiting for the schedule. Nothing is sent if there's
              currently nothing to report.
            </p>
            <button className="btn-primary mt-4" onClick={handleSendDigest} disabled={sendingDigest}>
              <BellRing size={16} /> {sendingDigest ? 'Sending…' : 'Send Digest Now'}
            </button>
            {digestError && <p className="mt-3 text-sm text-rose-600">{digestError}</p>}
            {digestResult && !digestError && (
              <p className="mt-3 text-sm text-emerald-600">
                {digestResult.sent
                  ? `Sent to ${digestResult.sentTo} admin(s): ${digestResult.lowStockCount} low stock, ${digestResult.overdueCount} overdue invoice(s).`
                  : `Nothing sent — ${digestResult.reason}.`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
