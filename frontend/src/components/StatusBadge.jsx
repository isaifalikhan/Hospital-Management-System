const STYLES = {
  scheduled: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  'no-show': 'bg-slate-200 text-slate-600',
  paid: 'bg-emerald-100 text-emerald-700',
  unpaid: 'bg-rose-100 text-rose-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  admitted: 'bg-amber-100 text-amber-700',
  discharged: 'bg-slate-200 text-slate-600',
  outpatient: 'bg-sky-100 text-sky-700',
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-200 text-slate-600',
  ordered: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-amber-100 text-amber-700',
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || 'bg-slate-100 text-slate-600';
  const label = (status || '').replace(/_/g, ' ').replace(/-/g, ' ');
  return <span className={`badge capitalize ${cls}`}>{label}</span>;
}
