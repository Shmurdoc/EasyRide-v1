import { useState, useEffect, useCallback } from 'react';
import {
  getSurgeZones, createSurgeZone, updateSurgeZone,
  deleteSurgeZone, toggleSurgeZone,
} from '../api/admin';
import type { SurgeZone, PaginatedResponse } from '../api/types';

export function useSurgeZones() {
  const [data, setData] = useState<PaginatedResponse<SurgeZone> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchZones = useCallback(async () => {
    try {
      setError(null);
      const result = await getSurgeZones({ per_page: 50 });
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load surge zones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchZones();
  }, [fetchZones]);

  const add = useCallback(async (zone: { name: string; center_lat: number; center_lng: number; radius_meters: number; multiplier: number }) => {
    const created = await createSurgeZone(zone);
    setData(prev => prev
      ? { ...prev, data: [created, ...prev.data], total: prev.total + 1 }
      : { data: [created], current_page: 1, last_page: 1, total: 1, per_page: 50 }
    );
    return created;
  }, []);

  const update = useCallback(async (id: string, zone: { name?: string; center_lat?: number; center_lng?: number; radius_meters?: number; multiplier?: number }) => {
    const updated = await updateSurgeZone(id, zone);
    setData(prev => prev
      ? { ...prev, data: prev.data.map(z => z.id === id ? updated : z) }
      : prev
    );
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteSurgeZone(id);
    setData(prev => prev
      ? { ...prev, data: prev.data.filter(z => z.id !== id), total: prev.total - 1 }
      : prev
    );
  }, []);

  const toggle = useCallback(async (id: string) => {
    const updated = await toggleSurgeZone(id);
    setData(prev => prev
      ? { ...prev, data: prev.data.map(z => z.id === id ? updated : z) }
      : prev
    );
    return updated;
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const zones = data?.data ?? [];

  return { zones, loading, error, refreshing, refresh, add, update, remove, toggle };
}
