import { useState, useEffect, useCallback } from 'react';
import { getAdminSettings, updateAdminSetting } from '../api/admin';
import type { AdminSetting } from '../api/types';

interface FlatSettings {
  base_fare?: number;
  per_km_rate?: number;
  per_minute_rate?: number;
  surge_multiplier?: number;
  max_surge?: number;
  push_notifications?: boolean;
  email_notifications?: boolean;
  sms_notifications?: boolean;
}

export function useAdminSettings() {
  const [raw, setRaw] = useState<Record<string, AdminSetting>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      const result = await getAdminSettings();
      setRaw(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    try {
      const type = typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string';
      await updateAdminSetting({ key, value: String(value), type, description: raw[key]?.description ?? undefined });
      setRaw(prev => ({ ...prev, [key]: { value: String(value), type, description: raw[key]?.description ?? null } }));
    } catch (err: any) {
      throw err;
    }
  }, [raw]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const settings: FlatSettings = {
    base_fare: Number(raw.base_fare?.value ?? 25),
    per_km_rate: Number(raw.per_km_rate?.value ?? 8),
    per_minute_rate: Number(raw.per_minute_rate?.value ?? 1.5),
    surge_multiplier: Number(raw.surge_multiplier?.value ?? 1),
    max_surge: Number(raw.max_surge?.value ?? 2.5),
    push_notifications: raw.push_notifications?.value === '1' || raw.push_notifications?.value === 'true',
    email_notifications: raw.email_notifications?.value === '1' || raw.email_notifications?.value === 'true',
    sms_notifications: raw.sms_notifications?.value === '1' || raw.sms_notifications?.value === 'true',
  };

  return { settings, loading, error, refreshing, refresh, updateSetting };
}
