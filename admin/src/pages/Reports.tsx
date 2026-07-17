import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

type ReportTab = 'revenue' | 'rides' | 'drivers' | 'users' | 'cancellations';

interface DailyRevenue {
  date: string;
  rides: number;
  revenue: number;
}

interface RevenuePeriod {
  period: string;
  total_rides: number;
  total_revenue: number;
  avg_fare: number;
  total_distance: number;
}

interface RevenueReport {
  period: string;
  totals: {
    total_rides: number;
    total_revenue: number;
    avg_fare: number;
  };
  breakdown: RevenuePeriod[];
}

interface RideStatsReport {
  period: string;
  totals: {
    total_rides: number;
    completed: number;
    cancelled: number;
    avg_fare: number;
    completion_rate: number;
  };
  breakdown: {
    period: string;
    total: number;
    completed: number;
    cancelled: number;
    total_revenue: number;
    avg_fare: number;
  }[];
}

interface DashboardReport {
  period: string;
  rides: {
    total: number;
    completed: number;
    cancelled: number;
    revenue: number;
    avg_fare: number;
    avg_distance: number;
    avg_duration: number;
  };
  deliveries: {
    total: number;
    delivered: number;
  };
  payments: {
    total: number;
    completed: number;
    total_amount: number;
  };
  wallet: {
    total_deposits: number;
    total_pending: number;
  };
  users: {
    total_users: number;
    total_riders: number;
    total_drivers: number;
  };
  daily_revenue: DailyRevenue[];
}

interface DriverStat {
  id: number;
  name: string;
  email: string;
  is_online: boolean;
  avg_rating: number;
  total_rides: number;
}

interface Ride {
  id: number;
  status: string;
  total_fare: number;
  distance_km: number;
  duration_minutes: number;
  created_at: string;
}

const tabs: { key: ReportTab; label: string }[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'rides', label: 'Ride Statistics' },
  { key: 'drivers', label: 'Driver Performance' },
  { key: 'users', label: 'User Analytics' },
  { key: 'cancellations', label: 'Cancellations' },
];

function formatCurrency(value: number) {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function exportToCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function BarChart({ data, labelKey, valueKey, color = 'bg-primary-500', maxValue }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  maxValue?: number;
}) {
  const max = useMemo(() => {
    if (maxValue) return maxValue;
    return Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  }, [data, valueKey, maxValue]);

  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const value = Number(item[valueKey]) || 0;
        const pct = max > 0 ? (value / max) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 truncate text-right">{String(item[labelKey])}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className={`${color} h-full rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-24">{formatCurrency(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, color, sub }: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function DateRangeFilter({ from, to, onChange }: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex gap-3 items-center">
      <label className="text-sm text-gray-500">From</label>
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      <label className="text-sm text-gray-500">To</label>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}

function RevenueReportSection() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueReport>({
    queryKey: ['admin-reports-revenue', from, to, groupBy],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports/revenue', {
        params: { from, to, group_by: groupBy },
      });
      return data;
    },
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardReport>({
    queryKey: ['admin-reports-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports/dashboard');
      return data;
    },
  });

  const isLoading = revenueLoading || dashboardLoading;

  const handleExport = () => {
    if (!revenueData?.breakdown) return;
    const headers = ['Period', 'Rides', 'Revenue', 'Avg Fare', 'Total Distance'];
    const rows = revenueData.breakdown.map((r) => [
      r.period,
      r.total_rides,
      r.total_revenue.toFixed(2),
      r.avg_fare.toFixed(2),
      r.total_distance?.toFixed(1) ?? '0',
    ]);
    exportToCSV(headers, rows, `revenue-report-${from}-to-${to}.csv`);
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading revenue data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangeFilter
          from={from}
          to={to}
          onChange={(f, t) => { setFrom(f); setTo(t); }}
        />
        <div className="flex gap-2 items-center">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(revenueData?.totals.total_revenue ?? 0)}
          color="bg-green-500"
        />
        <StatCard
          label="Total Rides"
          value={(revenueData?.totals.total_rides ?? 0).toLocaleString()}
          color="bg-blue-500"
        />
        <StatCard
          label="Avg Fare"
          value={formatCurrency(revenueData?.totals.avg_fare ?? 0)}
          color="bg-purple-500"
        />
        <StatCard
          label="Deliveries"
          value={(dashboardData?.deliveries.delivered ?? 0).toLocaleString()}
          color="bg-orange-500"
          sub={`${dashboardData?.deliveries.total ?? 0} total`}
        />
      </div>

      {dashboardData?.daily_revenue && dashboardData.daily_revenue.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Over Time (Last 30 Days)</h3>
          <div className="flex items-end gap-1 h-40">
            {dashboardData.daily_revenue.map((day, i) => {
              const maxRev = Math.max(...dashboardData.daily_revenue.map((d) => d.revenue), 1);
              const height = (day.revenue / maxRev) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {day.date}: {formatCurrency(day.revenue)}
                  </div>
                  <div
                    className="w-full bg-primary-500 rounded-t transition-all duration-300 hover:bg-primary-600"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">{dashboardData.daily_revenue[0]?.date}</span>
            <span className="text-xs text-gray-400">{dashboardData.daily_revenue[dashboardData.daily_revenue.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {revenueData?.breakdown && revenueData.breakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Period</h3>
          <BarChart
            data={revenueData.breakdown as unknown as Record<string, unknown>[]}
            labelKey="period"
            valueKey="total_revenue"
            color="bg-green-500"
          />
        </div>
      )}

      {dashboardData && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Ride vs Delivery Breakdown</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">Rides</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-medium">{dashboardData.rides.completed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cancelled</span>
                  <span className="font-medium">{dashboardData.rides.cancelled.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-medium">{formatCurrency(dashboardData.rides.revenue)}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">Food Deliveries</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">{dashboardData.deliveries.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivered</span>
                  <span className="font-medium">{dashboardData.deliveries.delivered.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Volume</span>
                  <span className="font-medium">{formatCurrency(dashboardData.payments.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RideStatsSection() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  const days = useMemo(() => {
    const diff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 1);
  }, [from, to]);

  const { data: ridesData, isLoading } = useQuery<RideStatsReport>({
    queryKey: ['admin-reports-rides-stats', from, to],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/rides/day', {
        params: { from, to },
      });
      return data;
    },
  });

  const { data: allRides } = useQuery<Ride[]>({
    queryKey: ['admin-reports-all-rides', days],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports/rides', { params: { days } });
      return data;
    },
  });

  const peakHours = useMemo(() => {
    if (!allRides) return [];
    const hours: Record<number, number> = {};
    allRides.forEach((ride) => {
      if (ride.status === 'completed') {
        const h = new Date(ride.created_at).getHours();
        hours[h] = (hours[h] || 0) + 1;
      }
    });
    return Object.entries(hours)
      .map(([h, count]) => ({ hour: parseInt(h), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [allRides]);

  const handleExport = () => {
    if (!ridesData?.breakdown) return;
    const headers = ['Period', 'Total', 'Completed', 'Cancelled', 'Revenue', 'Avg Fare'];
    const rows = ridesData.breakdown.map((r) => [
      r.period,
      r.total,
      r.completed,
      r.cancelled,
      r.total_revenue.toFixed(2),
      (r.avg_fare ?? 0).toFixed(2),
    ]);
    exportToCSV(headers, rows, `ride-stats-${from}-to-${to}.csv`);
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading ride statistics...</div>;

  const totals = ridesData?.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangeFilter
          from={from}
          to={to}
          onChange={(f, t) => { setFrom(f); setTo(t); }}
        />
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Rides"
          value={(totals?.total_rides ?? 0).toLocaleString()}
          color="bg-blue-500"
        />
        <StatCard
          label="Completed"
          value={(totals?.completed ?? 0).toLocaleString()}
          color="bg-green-500"
          sub={`${totals?.completion_rate ?? 0}% rate`}
        />
        <StatCard
          label="Cancelled"
          value={(totals?.cancelled ?? 0).toLocaleString()}
          color="bg-red-500"
        />
        <StatCard
          label="Avg Fare"
          value={formatCurrency(totals?.avg_fare ?? 0)}
          color="bg-purple-500"
        />
        <StatCard
          label="Failed"
          value={((totals?.total_rides ?? 0) - (totals?.completed ?? 0) - (totals?.cancelled ?? 0)).toLocaleString()}
          color="bg-orange-500"
        />
      </div>

      {peakHours.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Peak Hours (Top 6)</h3>
          <div className="space-y-2">
            {peakHours.map(({ hour, count }) => {
              const maxCount = peakHours[0]?.count || 1;
              const pct = (count / maxCount) * 100;
              return (
                <div key={hour} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-16">{count} rides</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ridesData?.breakdown && ridesData.breakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Completed</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cancelled</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Revenue</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Avg Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ridesData.breakdown.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{row.period}</td>
                  <td className="px-4 py-3 text-right">{row.total}</td>
                  <td className="px-4 py-3 text-right text-green-600">{row.completed}</td>
                  <td className="px-4 py-3 text-right text-red-600">{row.cancelled}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.total_revenue)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.avg_fare ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DriverPerformanceSection() {
  const { data: drivers, isLoading } = useQuery<DriverStat[]>({
    queryKey: ['admin-reports-drivers'],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports/drivers');
      return data;
    },
  });

  const handleExport = () => {
    if (!drivers) return;
    const headers = ['Name', 'Email', 'Online', 'Avg Rating', 'Total Rides'];
    const rows = drivers.map((d) => [
      d.name,
      d.email,
      d.is_online ? 'Yes' : 'No',
      d.avg_rating.toFixed(2),
      d.total_rides,
    ]);
    exportToCSV(headers, rows, 'driver-performance.csv');
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading driver data...</div>;

  const topDrivers = [...(drivers ?? [])].sort((a, b) => b.total_rides - a.total_rides).slice(0, 10);
  const onlineCount = drivers?.filter((d) => d.is_online).length ?? 0;
  const avgRating = drivers?.length
    ? (drivers.reduce((sum, d) => sum + d.avg_rating, 0) / drivers.length).toFixed(2)
    : '0.00';
  const totalRides = drivers?.reduce((sum, d) => sum + d.total_rides, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Driver Performance</h3>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Drivers"
          value={(drivers?.length ?? 0).toLocaleString()}
          color="bg-blue-500"
          sub={`${onlineCount} online`}
        />
        <StatCard
          label="Avg Rating"
          value={`${avgRating} / 5.0`}
          color="bg-yellow-500"
        />
        <StatCard
          label="Total Completed Rides"
          value={totalRides.toLocaleString()}
          color="bg-green-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Rating</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total Rides</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {topDrivers.map((driver, i) => (
              <tr key={driver.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{driver.name}</td>
                <td className="px-4 py-3 text-gray-600">{driver.email}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      driver.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {driver.is_online ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-yellow-500 mr-1">★</span>
                  {driver.avg_rating.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-medium">{driver.total_rides}</td>
              </tr>
            ))}
            {topDrivers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  No driver data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {drivers && drivers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Driver Utilization (Top 10)</h3>
          <div className="space-y-2">
            {topDrivers.map((d) => {
              const maxRides = topDrivers[0]?.total_rides || 1;
              const pct = (d.total_rides / maxRides) * 100;
              return (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 truncate text-right">{d.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-20 text-right">{d.total_rides} rides</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function UserAnalyticsSection() {
  const { data: dashboardData, isLoading } = useQuery<DashboardReport>({
    queryKey: ['admin-reports-dashboard-users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports/dashboard');
      return data;
    },
  });

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading user analytics...</div>;

  const users = dashboardData?.users;
  const dailyRevenue = dashboardData?.daily_revenue ?? [];

  const activeDaysCount = dailyRevenue.filter((d) => d.rides > 0).length;
  const avgRidesPerActiveDay = activeDaysCount > 0
    ? (dailyRevenue.reduce((sum, d) => sum + d.rides, 0) / activeDaysCount).toFixed(1)
    : '0';

  const signupTrend = useMemo(() => {
    if (dailyRevenue.length < 2) return 'stable';
    const recent = dailyRevenue.slice(-7).reduce((sum, d) => sum + d.rides, 0);
    const prior = dailyRevenue.slice(-14, -7).reduce((sum, d) => sum + d.rides, 0);
    if (prior === 0) return 'stable';
    const change = ((recent - prior) / prior) * 100;
    if (change > 10) return 'growing';
    if (change < -10) return 'declining';
    return 'stable';
  }, [dailyRevenue]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={(users?.total_users ?? 0).toLocaleString()}
          color="bg-blue-500"
        />
        <StatCard
          label="Riders"
          value={(users?.total_riders ?? 0).toLocaleString()}
          color="bg-green-500"
        />
        <StatCard
          label="Drivers"
          value={(users?.total_drivers ?? 0).toLocaleString()}
          color="bg-purple-500"
        />
        <StatCard
          label="Avg Rides/Day"
          value={avgRidesPerActiveDay}
          color="bg-indigo-500"
          sub={`${activeDaysCount} active days`}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Trend (Last 30 Days)</h3>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-gray-500">Trend:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              signupTrend === 'growing'
                ? 'bg-green-100 text-green-700'
                : signupTrend === 'declining'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {signupTrend === 'growing' ? '📈 Growing' : signupTrend === 'declining' ? '📉 Declining' : '➡️ Stable'}
          </span>
        </div>
        <div className="flex items-end gap-1 h-32">
          {dailyRevenue.map((day, i) => {
            const maxRides = Math.max(...dailyRevenue.map((d) => d.rides), 1);
            const height = (day.rides / maxRides) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative">
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {day.date}: {day.rides} rides
                </div>
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">{dailyRevenue[0]?.date}</span>
          <span className="text-xs text-gray-400">{dailyRevenue[dailyRevenue.length - 1]?.date}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">User Distribution</h3>
        <div className="space-y-3">
          {[
            { label: 'Riders', value: users?.total_riders ?? 0, total: users?.total_users ?? 1, color: 'bg-green-500' },
            { label: 'Drivers', value: users?.total_drivers ?? 0, total: users?.total_users ?? 1, color: 'bg-blue-500' },
          ].map((item) => {
            const pct = item.total > 0 ? (item.value / item.total) * 100 : 0;
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium">{item.value.toLocaleString()} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${item.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CancellationAnalysisSection() {
  const [days, setDays] = useState(30);

  const { data: allRides, isLoading } = useQuery<Ride[]>({
    queryKey: ['admin-reports-cancellations', days],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports/rides', { params: { days } });
      return data;
    },
  });

  const analysis = useMemo(() => {
    if (!allRides) return null;
    const total = allRides.length;
    const cancelled = allRides.filter((r) => r.status === 'cancelled');
    const completed = allRides.filter((r) => r.status === 'completed');
    const failed = allRides.filter((r) => r.status === 'failed');
    const cancellationRate = total > 0 ? ((cancelled.length / total) * 100).toFixed(1) : '0';
    const lostRevenue = cancelled.reduce((sum, r) => sum + (r.total_fare || 0), 0);

    const byHour: Record<number, number> = {};
    cancelled.forEach((r) => {
      const h = new Date(r.created_at).getHours();
      byHour[h] = (byHour[h] || 0) + 1;
    });
    const hourlyBreakdown = Object.entries(byHour)
      .map(([h, count]) => ({ hour: parseInt(h), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const avgFareCancelled = cancelled.length > 0
      ? cancelled.reduce((sum, r) => sum + (r.total_fare || 0), 0) / cancelled.length
      : 0;

    return {
      total,
      cancelled: cancelled.length,
      completed: completed.length,
      failed: failed.length,
      cancellationRate,
      lostRevenue,
      hourlyBreakdown,
      avgFareCancelled,
    };
  }, [allRides]);

  const handleExport = () => {
    if (!allRides) return;
    const cancelled = allRides.filter((r) => r.status === 'cancelled');
    const headers = ['Ride ID', 'Fare', 'Distance (km)', 'Duration (min)', 'Date'];
    const rows = cancelled.map((r) => [
      r.id,
      (r.total_fare || 0).toFixed(2),
      (r.distance_km || 0).toFixed(1),
      (r.duration_minutes || 0).toFixed(0),
      new Date(r.created_at).toISOString().split('T')[0],
    ]);
    exportToCSV(headers, rows, `cancellations-report-${days}days.csv`);
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading cancellation data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <label className="text-sm text-gray-500">Period</label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cancellation Rate"
          value={`${analysis?.cancellationRate ?? 0}%`}
          color="bg-red-500"
          sub={`${analysis?.cancelled ?? 0} of ${analysis?.total ?? 0}`}
        />
        <StatCard
          label="Total Cancelled"
          value={(analysis?.cancelled ?? 0).toLocaleString()}
          color="bg-orange-500"
        />
        <StatCard
          label="Lost Revenue"
          value={formatCurrency(analysis?.lostRevenue ?? 0)}
          color="bg-red-500"
        />
        <StatCard
          label="Avg Fare (Cancelled)"
          value={formatCurrency(analysis?.avgFareCancelled ?? 0)}
          color="bg-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Distribution</h3>
          {analysis && (
            <div className="space-y-4">
              {[
                { label: 'Completed', value: analysis.completed, color: 'bg-green-500', total: analysis.total },
                { label: 'Cancelled', value: analysis.cancelled, color: 'bg-red-500', total: analysis.total },
                { label: 'Failed', value: analysis.failed, color: 'bg-orange-500', total: analysis.total },
              ].map((item) => {
                const pct = item.total > 0 ? (item.value / item.total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium">{item.value} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Cancellations by Hour (Top 5)</h3>
          {analysis?.hourlyBreakdown && analysis.hourlyBreakdown.length > 0 ? (
            <div className="space-y-2">
              {analysis.hourlyBreakdown.map(({ hour, count }) => {
                const maxCount = analysis.hourlyBreakdown[0]?.count || 1;
                const pct = (count / maxCount) * 100;
                return (
                  <div key={hour} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14 text-right">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-red-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-16">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">No cancellation data</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
      </div>

      <div className="flex gap-1 border-b mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'revenue' && <RevenueReportSection />}
      {activeTab === 'rides' && <RideStatsSection />}
      {activeTab === 'drivers' && <DriverPerformanceSection />}
      {activeTab === 'users' && <UserAnalyticsSection />}
      {activeTab === 'cancellations' && <CancellationAnalysisSection />}
    </div>
  );
}
