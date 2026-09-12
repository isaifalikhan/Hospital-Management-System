// Read-only rendering of a lab report's measured rows. Kept separate from the
// entry form (LabResultModal) because the doctor reading a result and the
// technician typing one want different things: this one highlights what's out
// of range and stays compact enough to sit inline on the patient chart.
const FLAG_STYLES = {
  low: 'text-amber-700 bg-amber-50',
  high: 'text-amber-700 bg-amber-50',
  abnormal: 'text-rose-700 bg-rose-50',
};

const FLAG_LABELS = { low: 'Low', high: 'High', abnormal: 'Abnormal' };

export default function LabResultTable({ order, compact }) {
  const rows = order?.LabResultItems || [];
  const hasNarrative = !!order?.result && rows.length === 0;

  if (!rows.length && !order?.result) return null;

  // A test with no measured rows (imaging) only ever has the narrative, and
  // that text carries its own line breaks — hence whitespace-pre-line.
  if (hasNarrative) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="whitespace-pre-line text-sm text-slate-700">{order.result}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Parameter</th>
            <th className="px-3 py-2 text-right">Result</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2">Reference</th>
            {!compact && <th className="px-3 py-2">Flag</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const abnormal = r.flag && r.flag !== 'normal';
            return (
              <tr key={r.id ?? r.parameter} className={abnormal ? 'bg-rose-50/40' : ''}>
                <td className="px-3 py-1.5 text-slate-700">{r.parameter}</td>
                <td className={`px-3 py-1.5 text-right font-semibold ${abnormal ? 'text-rose-700' : 'text-slate-900'}`}>
                  {r.value || '—'}
                </td>
                <td className="px-3 py-1.5 text-slate-500">{r.unit || '—'}</td>
                <td className="px-3 py-1.5 text-slate-500">{r.referenceRange || '—'}</td>
                {!compact && (
                  <td className="px-3 py-1.5">
                    {abnormal ? (
                      <span className={`badge ${FLAG_STYLES[r.flag] || 'bg-rose-50 text-rose-700'}`}>
                        {FLAG_LABELS[r.flag] || r.flag}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Normal</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {order.result && rows.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Impression</p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{order.result}</p>
        </div>
      )}
    </div>
  );
}
