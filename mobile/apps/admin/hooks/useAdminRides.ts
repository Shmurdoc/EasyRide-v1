import { useState, useEffect, useCallback } from 'react';
import { getAdminRides } from '../api/admin';
import type { AdminRide, PaginatedResponse } from '../api/types';

export function useAdminRides() {
  const [data, setData] = useState<PaginatedResponse<AdminRide> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchRides = useCallback(async (pageNum: number, status: string, query: string) => {
    try {
      setError(null);
      const statusParam = status === 'all' ? undefined : status;
      const result = await getAdminRides({ page: pageNum, per_page: 15, status: statusParam, search: query || undefined });
      if (pageNum === 1) {
        setData(result);
      } else {
        setData(prev => prev ? { ...prev, data: [...prev.data, ...result.data], current_page: result.current_page } : result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchRides(1, filter, search);
  }, [fetchRides, filter, search]);

  const loadMore = useCallback(async () => {
    if (data && data.current_page < data.last_page) {
      const next = page + 1;
      setPage(next);
      await fetchRides(next, filter, search);
    }
  }, [page, data, fetchRides, filter, search]);

  useEffect(() => {
    setPage(1);
    fetchRides(1, filter, search);
  }, [filter, search, fetchRides]);

  const rides = data?.data ?? [];
  const hasMore = data ? data.current_page < data.last_page : false;

  return { rides, loading, error, refreshing, refresh, loadMore, filter, setFilter, search, setSearch, hasMore };
}
