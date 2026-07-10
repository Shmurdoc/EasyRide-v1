import { useState, useEffect, useCallback } from 'react';
import { getAdminDashboard } from '../api/admin';
import type { AdminDashboardData } from '../api/types';

export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapResponse = (raw: any): AdminDashboardData => ({
    totalUsers: raw.total_users ?? 0,
    totalDrivers: raw.total_drivers ?? 0,
    totalRides: raw.total_rides ?? 0,
    activeRides: raw.active_rides ?? 0,
    totalRevenue: raw.total_revenue ?? 0,
    ridesToday: raw.rides_today ?? 0,
    completedToday: raw.completed_today ?? 0,
    revenueToday: raw.revenue_today ?? 0,
    activePoolRides: raw.active_pool_rides ?? 0,
    totalPoolPassengers: raw.total_pool_passengers ?? 0,
    fleetStatus: {
      online: raw.fleet_online ?? 0,
      offline: raw.fleet_offline ?? 0,
      onRide: raw.fleet_on_ride ?? 0,
      total: raw.total_drivers ?? 0,
    },
    activeRidesList: Array.isArray(raw.active_rides_list) ? raw.active_rides_list : [],
    hourly: Array.isArray(raw.hourly) ? raw.hourly : [],
    topDrivers: Array.isArray(raw.top_drivers) ? raw.top_drivers : [],
    recentActivity: Array.isArray(raw.recent_activity) ? raw.recent_activity : [],
  });

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await getAdminDashboard();
      setData(mapResponse(result));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const result = await getAdminDashboard();
      setData(mapResponse(result));
    } catch {
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { data, loading, refreshing, error, refresh };
}
