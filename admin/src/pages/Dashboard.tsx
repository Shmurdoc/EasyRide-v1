import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface DashboardStats {
  total_users: number;
  active_drivers: number;
  rides_today: number;
  revenue_today: number;
  pending_withdrawals: number;
  pending_disputes: number;
  completed_today: number;
  cancelled_today: number;
  avg_fare_today: number;
}

interface StatCard {
  key: keyof DashboardStats;
  label: string;
  color: string;
  format?: 'currency';
}

const statCards: StatCard[] = [
  { key: 'total_users', label: 'Total Users', color: 'bg-blue-500' },
  { key: 'active_drivers', label: 'Active Drivers', color: 'bg-green-500' },
  { key: 'rides_today', label: 'Rides Today', color: 'bg-purple-500' },
  { key: 'completed_today', label: 'Completed Today', color: 'bg-teal-500' },
  { key: 'cancelled_today', label: 'Cancelled Today', color: 'bg-red-500' },
  { key: 'revenue_today', label: 'Revenue Today', color: 'bg-yellow-500', format: 'currency' },
  { key: 'avg_fare_today', label: 'Avg Fare', color: 'bg-indigo-500', format: 'currency' },
  { key: 'pending_withdrawals', label: 'Pending Withdrawals', color: 'bg-orange-500', format: 'currency' },
  { key: 'pending_disputes', label: 'Pending Disputes', color: 'bg-pink-500' },
];

function formatValue(value: number, format?: 'currency') {
  if (format === 'currency') {
    return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return value.toLocaleString();
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard');
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Failed to load dashboard data.</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.key} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${card.color}`} />
              <span className="text-sm text-gray-500">{card.label}</span>
            </div>
            <div className="mt-3 text-3xl font-bold text-gray-900">
              {data ? formatValue(data[card.key], card.format) : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
