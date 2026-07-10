import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../packages/shared/src/api/client';

interface ApiStats {
  total_requests: number;
  avg_response_time_ms: number;
  error_count: number;
  error_rate_pct: number;
  top_endpoints: Record<string, number>;
}

interface RideFlowStats {
  searching: number;
  accepted: number;
  arrived: number;
  in_progress: number;
  completed_today: number;
  cancelled_today: number;
  total_today: number;
  avg_completion_time_minutes: number;
  completion_rate_pct: number;
}

interface QueueHealth {
  queues: Record<string, { size: number; status: string }>;
  failed_jobs: number;
  pending_jobs: number;
  horizon_status: string;
}

export function useInspectorStats(refreshInterval = 30000) {
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [rideFlow, setRideFlow] = useState<RideFlowStats | null>(null);
  const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const [apiRes, rideRes, queueRes] = await Promise.all([
        api.get('/inspector/api-stats'),
        api.get('/inspector/ride-flow'),
        api.get('/inspector/queue-health'),
      ]);

      setApiStats(apiRes as unknown as ApiStats);
      setRideFlow(rideRes as unknown as RideFlowStats);
      setQueueHealth(queueRes as unknown as QueueHealth);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inspector stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  return { apiStats, rideFlow, queueHealth, loading, error, refresh: fetchStats };
}
