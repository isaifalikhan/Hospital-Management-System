export default function StatCard({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  };
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
