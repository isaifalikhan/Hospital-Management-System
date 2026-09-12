// Filled gradient chips (see the .tone-* rules in index.css) rather than the
// flat bg-*-50 / text-*-600 pair — same 44px box, same five tones.
const TONES = {
  indigo: 'tone-indigo',
  emerald: 'tone-emerald',
  amber: 'tone-amber',
  rose: 'tone-rose',
  sky: 'tone-sky',
};

export default function StatCard({ icon: Icon, label, value, tone = 'indigo' }) {
  // Money tiles carry a full formatMoney string ("Rs. 412300.00"), which
  // overflows a quarter-width card at text-2xl. Step those down rather than
  // truncating — a clipped amount is worse than a smaller one.
  const long = String(value ?? '').length > 8;

  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p
          className={`font-extrabold tracking-tight text-slate-900 tabular-nums ${
            long ? 'text-xl' : 'text-2xl'
          }`}
        >
          {value}
        </p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
