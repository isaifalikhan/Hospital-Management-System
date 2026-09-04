import { useEffect, useState } from 'react';
import { TrendingUp, BedDouble, Percent, Download, Filter, DollarSign } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi, reportsApi } from '../api';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';

const PIE_COLORS = ['#6366f1', '#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6'];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: isoDate(start), end: isoDate(end) };
}

export default function Insights() {
  const { start: defaultStart, end: defaultEnd } = defaultRange();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardApi.ownerInsights({ startDate, endDate });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [startDate, endDate]);

  async function handleExport() {
    try {
      await reportsApi.downloadCsv(
        `/reports/owner-insights.csv?startDate=${startDate}&endDate=${endDate}`,
        `owner-insights-${startDate}-to-${endDate}.csv`
      );
    } catch {
      alert('Failed to export owner insights');
    }
  }

  const totalRevenue = data ? data.revenueByDoctor.reduce((sum, d) => sum + d.revenue, 0) : 0;
  const avgUtilization = data && data.doctorUtilization.length
    ? data.doctorUtilization.reduce((sum, d) => sum + (d.utilizationPct ?? 0), 0) / data.doctorUtilization.length
    : 0;

  return (
    <div>
      <PageHeader
        title="Owner Insights"
        subtitle="Revenue by doctor and department, doctor utilization, and ward occupancy"
        action={
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={16} /> Export CSV
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter size={15} className="text-slate-400" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          From
          <input type="date" className="input w-auto" value={startDate} max={endDate}
            onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          To
          <input type="date" className="input w-auto" value={endDate} min={startDate}
            onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {loading && !data ? (
        <div className="text-slate-500">Loading insights...</div>
      ) : data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={DollarSign} label="Revenue in Range" value={`$${totalRevenue.toFixed(2)}`} tone="emerald" />
            <StatCard icon={Percent} label="Avg. Doctor Utilization" value={`${avgUtilization.toFixed(1)}%`} tone="indigo" />
            <StatCard icon={BedDouble} label="Active Admissions" value={data.bedOccupancySummary.totalActiveAdmissions} tone="sky" />
            <StatCard
              icon={TrendingUp}
              label="Bed Occupancy"
              value={`${data.bedOccupancySummary.occupancyPct}% (${data.bedOccupancySummary.totalActiveAdmissions}/${data.bedOccupancySummary.totalBedsEverUsed})`}
              tone="amber"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Revenue by Doctor</h2>
              {data.revenueByDoctor.length === 0 ? (
                <p className="text-sm text-slate-500">No billed revenue attributed to a doctor in this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.revenueByDoctor} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                      interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Revenue by Department</h2>
              {data.revenueByDepartment.length === 0 ? (
                <p className="text-sm text-slate-500">No revenue data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.revenueByDepartment}
                      dataKey="revenue"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {data.revenueByDepartment.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Doctor Utilization</h2>
                <p className="text-xs text-slate-500">Completed appointments vs. configured available slots in the selected range</p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Slots</th>
                    <th className="px-4 py-3">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.doctorUtilization.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No active doctors.</td></tr>
                  ) : (
                    data.doctorUtilization.map((d) => (
                      <tr key={d.doctorId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{d.doctorName}</p>
                          <p className="text-xs text-slate-500">{d.department}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{d.completedAppointments}</td>
                        <td className="px-4 py-3 text-slate-600">{d.availableSlots}</td>
                        <td className="px-4 py-3">
                          {d.utilizationPct === null ? (
                            <span className="text-xs text-slate-400">No availability set</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${Math.min(d.utilizationPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-700">{d.utilizationPct}%</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Ward / Bed Occupancy</h2>
                <p className="text-xs text-slate-500">
                  Active admissions vs. distinct beds ever used per ward (all-time — the schema has no
                  configured bed capacity, so this is a proxy rather than a hard limit)
                </p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ward</th>
                    <th className="px-4 py-3">Beds Used</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Occupancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.wardOccupancy.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No admissions recorded yet.</td></tr>
                  ) : (
                    data.wardOccupancy.map((w) => (
                      <tr key={w.ward} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{w.ward}</td>
                        <td className="px-4 py-3 text-slate-600">{w.bedsEverUsed}</td>
                        <td className="px-4 py-3 text-slate-600">{w.activeAdmissions}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(w.occupancyPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{w.occupancyPct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
