import React, { useState, useEffect } from 'react';
import StatCard from '@/components/StatCard';
import client from '@/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/Toast';

interface DashboardData {
  total_users: number;
  total_drivers: number;
  total_rides: number;
  active_rides: number;
  total_revenue: number;
  rides_today: number;
  completed_today: number;
  revenue_today: number;
}

interface RevenuePoint {
  date: string;
  revenue: number;
  rides: number;
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [dashboardRes, revenueRes] = await Promise.all([
          client.get('/admin/dashboard'),
          client.get('/reports/revenue', { params: { days: 14 } }),
        ]);
        setData(dashboardRes.data);
        setRevenueChart(revenueRes.data?.daily || []);
      } catch (err) {
        console.error('[Dashboard] Failed to load:', err);
        if (!data) toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="card-flat p-6">
          <div className="skeleton h-4 w-32 mb-3" />
          <div className="skeleton h-8 w-64" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-flat p-5">
              <div className="skeleton h-3 w-20 mb-3" />
              <div className="skeleton h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-950 to-primary-950 p-6 sm:p-8 text-white">
        <div className="absolute inset-0 bg-mesh-dark opacity-50" aria-hidden />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-2xs uppercase tracking-wider text-ink-200 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
              Live · Phalaborwa
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              {greeting}, Operator.
            </h1>
            <p className="text-ink-300 mt-1.5 text-sm sm:text-base">
              {data.active_rides > 0
                ? <><span className="font-semibold text-white">{data.active_rides}</span> rides in progress · <span className="font-semibold text-white">R{data.revenue_today.toLocaleString()}</span> earned today</>
                : <>Quiet on the road. <span className="font-semibold text-white">R{data.revenue_today.toLocaleString()}</span> earned today.</>
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/map" className="btn-secondary !bg-white/10 !border-white/15 !text-white hover:!bg-white/15">
              Live map
            </Link>
            <Link to="/rides" className="btn-primary !bg-primary-500 hover:!bg-primary-400">
              View rides →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data.total_users} icon={<IconUsers />} tone="primary" />
        <StatCard
          label="Active Rides"
          value={data.active_rides}
          icon={<IconRide />}
          tone="accent"
          sub={`${data.rides_today} today`}
          pulse
        />
        <StatCard
          label="Total Revenue"
          value={`R${data.total_revenue.toLocaleString()}`}
          icon={<IconCash />}
          tone="warn"
          sub={`R${data.revenue_today.toLocaleString()} today`}
        />
        <StatCard
          label="Total Rides"
          value={data.total_rides}
          icon={<IconList />}
          tone="neutral"
          sub={`${data.completed_today} completed today`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-flat p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">Revenue trend</h3>
              <p className="text-xs text-ink-500 mt-0.5">Last 14 days</p>
            </div>
            <span className="badge-info">ZAR</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3563ff" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3563ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => dayjs(v).format('D MMM')} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `R${v}`} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 32px -4px rgba(15,23,42,0.12)' }}
                formatter={(v: number) => [`R${v.toLocaleString()}`, 'Revenue']}
                labelFormatter={(v) => dayjs(v).format('ddd, D MMM')}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3563ff" strokeWidth={2.5} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card-flat p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">Rides per day</h3>
              <p className="text-xs text-ink-500 mt-0.5">Last 14 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => dayjs(v).format('D')} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                labelFormatter={(v) => dayjs(v).format('ddd, D MMM')}
              />
              <Bar dataKey="rides" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <QuickPanel title="Today">
          <Row label="Rides today" value={data.rides_today} />
          <Row label="Completed" value={data.completed_today} />
          <Row label="Revenue" value={`R${data.revenue_today.toLocaleString()}`} highlight />
        </QuickPanel>

        <QuickPanel title="Platform">
          <Row label="Total drivers" value={data.total_drivers} />
          <Row label="Total users" value={data.total_users} />
          <Row label="Active rides" value={data.active_rides} />
        </QuickPanel>

        <QuickPanel title="Quick actions">
          <Link to="/drivers" className="block px-3 py-2.5 -mx-1 rounded-lg hover:bg-ink-50 text-sm text-ink-700 hover:text-primary-700 transition-colors">
            → Review pending drivers
          </Link>
          <Link to="/rides" className="block px-3 py-2.5 -mx-1 rounded-lg hover:bg-ink-50 text-sm text-ink-700 hover:text-primary-700 transition-colors">
            → View ride activity
          </Link>
          <Link to="/payments" className="block px-3 py-2.5 -mx-1 rounded-lg hover:bg-ink-50 text-sm text-ink-700 hover:text-primary-700 transition-colors">
            → Manage payments
          </Link>
          <Link to="/map" className="block px-3 py-2.5 -mx-1 rounded-lg hover:bg-ink-50 text-sm text-ink-700 hover:text-primary-700 transition-colors">
            → Open live map
          </Link>
        </QuickPanel>
      </div>
    </div>
  );
}

function QuickPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-flat p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-ink-600">{label}</span>
      <span className={highlight ? 'font-semibold text-accent-700' : 'font-medium text-ink-900'}>{value}</span>
    </div>
  );
}

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconRide = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17h14l-1.5-5h-11L5 17Z" /><circle cx="7.5" cy="17" r="1.5" fill="currentColor" /><circle cx="16.5" cy="17" r="1.5" fill="currentColor" /><path d="M6 12l2-6h8l2 6" />
  </svg>
);
const IconCash = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" />
  </svg>
);
const IconList = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
