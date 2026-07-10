import { useState, useEffect, useCallback } from 'react';
import {
  getPeakHours, createPeakHour, updatePeakHour,
  deletePeakHour, togglePeakHour,
} from '../api/admin';
import type { PeakHour, PaginatedResponse } from '../api/types';

export function usePeakHours() {
  const [data, setData] = useState<PaginatedResponse<PeakHour> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dayFilter, setDayFilter] = useState<number | undefined>(undefined);

  const fetchHours = useCallback(async (day?: number) => {
    try {
      setError(null);
      const result = await getPeakHours({ per_page: 50, day_of_week: day });
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load peak hours');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHours(dayFilter);
  }, [fetchHours, dayFilter]);

  const add = useCallback(async (hour: { name: string; day_of_week: number; start_time: string; end_time: string; multiplier: number }) => {
    const created = await createPeakHour(hour);
    setData(prev => prev
      ? { ...prev, data: [created, ...prev.data], total: prev.total + 1 }
      : { data: [created], current_page: 1, last_page: 1, total: 1, per_page: 50 }
    );
    return created;
  }, []);

  const update = useCallback(async (id: string, hour: { name?: string; day_of_week?: number; start_time?: string; end_time?: string; multiplier?: number }) => {
    const updated = await updatePeakHour(id, hour);
    setData(prev => prev
      ? { ...prev, data: prev.data.map(h => h.id === id ? updated : h) }
      : prev
    );
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deletePeakHour(id);
    setData(prev => prev
      ? { ...prev, data: prev.data.filter(h => h.id !== id), total: prev.total - 1 }
      : prev
    );
  }, []);

  const toggle = useCallback(async (id: string) => {
    const updated = await togglePeakHour(id);
    setData(prev => prev
      ? { ...prev, data: prev.data.map(h => h.id === id ? updated : h) }
      : prev
    );
    return updated;
  }, []);

  useEffect(() => { fetchHours(dayFilter); }, [dayFilter, fetchHours]);

  const hours = data?.data ?? [];

  return { hours, loading, error, refreshing, refresh, add, update, remove, toggle, dayFilter, setDayFilter };
}
