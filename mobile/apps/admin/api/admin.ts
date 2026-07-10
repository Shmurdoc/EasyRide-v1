import { admin as sharedAdmin, api } from '../../../packages/shared/src/api/index';
import type {
  AdminDashboardData, PaginatedResponse, AdminDriver,
  AdminRide, AdminUser, AdminSetting, AuditLog,
  RideQuery, DriverQuery, UserQuery,
  SurgeZone, PeakHour,
} from './types';

function toParams(obj?: Record<string, any>): Record<string, string> | undefined {
  if (!obj) return undefined;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      params[k] = String(v);
    }
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

export const getAdminDashboard = (): Promise<AdminDashboardData> =>
  sharedAdmin.dashboard() as Promise<AdminDashboardData>;

export const getAdminRides = (params: RideQuery): Promise<PaginatedResponse<AdminRide>> =>
  sharedAdmin.rides(toParams(params as any)) as unknown as Promise<PaginatedResponse<AdminRide>>;

export const getAdminDrivers = (params: DriverQuery): Promise<PaginatedResponse<AdminDriver>> =>
  sharedAdmin.drivers(toParams(params as any)) as unknown as Promise<PaginatedResponse<AdminDriver>>;

export const approveDriver = (id: string): Promise<{ message: string }> =>
  sharedAdmin.approveDriver(id) as Promise<{ message: string }>;

export const rejectDriver = (id: string): Promise<{ message: string }> =>
  sharedAdmin.rejectDriver(id) as Promise<{ message: string }>;

export const getAdminUsers = (params: UserQuery): Promise<PaginatedResponse<AdminUser>> =>
  sharedAdmin.users(toParams(params as any)) as unknown as Promise<PaginatedResponse<AdminUser>>;

export const getAdminSettings = (): Promise<Record<string, AdminSetting>> =>
  sharedAdmin.settings() as Promise<Record<string, AdminSetting>>;

export const updateAdminSetting = (data: { key: string; value: string; type: string; description?: string }): Promise<{ id: string }> =>
  sharedAdmin.updateSettings(data) as Promise<{ id: string }>;

export const getRevenueReport = (params: { period?: string; from_date?: string; to_date?: string }): Promise<any> =>
  (sharedAdmin as any).reports?.revenue?.(toParams(params)) ?? Promise.resolve(null);

export const getAuditLogs = (params: { per_page?: number; page?: number }): Promise<PaginatedResponse<AuditLog>> =>
  (sharedAdmin as any).auditLogs?.(toParams(params as any)) ?? Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 15 });

// Surge Zones
export const getSurgeZones = (params?: { is_active?: boolean; per_page?: number; page?: number }): Promise<PaginatedResponse<SurgeZone>> =>
  api.get('/admin/surge-zones', toParams(params as any)) as unknown as Promise<PaginatedResponse<SurgeZone>>;

export const getSurgeZone = (id: string): Promise<SurgeZone> =>
  api.get(`/admin/surge-zones/${id}`) as unknown as Promise<SurgeZone>;

export const createSurgeZone = (data: { name: string; center_lat: number; center_lng: number; radius_meters: number; multiplier: number }): Promise<SurgeZone> =>
  api.post('/admin/surge-zones', data) as unknown as Promise<SurgeZone>;

export const updateSurgeZone = (id: string, data: { name?: string; center_lat?: number; center_lng?: number; radius_meters?: number; multiplier?: number }): Promise<SurgeZone> =>
  api.put(`/admin/surge-zones/${id}`, data) as unknown as Promise<SurgeZone>;

export const deleteSurgeZone = (id: string): Promise<void> =>
  api.delete(`/admin/surge-zones/${id}`) as unknown as Promise<void>;

export const toggleSurgeZone = (id: string): Promise<SurgeZone> =>
  api.patch(`/admin/surge-zones/${id}/toggle`) as unknown as Promise<SurgeZone>;

// Peak Hours
export const getPeakHours = (params?: { day_of_week?: number; is_active?: boolean; per_page?: number; page?: number }): Promise<PaginatedResponse<PeakHour>> =>
  api.get('/admin/peak-hours', toParams(params as any)) as unknown as Promise<PaginatedResponse<PeakHour>>;

export const getPeakHour = (id: string): Promise<PeakHour> =>
  api.get(`/admin/peak-hours/${id}`) as unknown as Promise<PeakHour>;

export const createPeakHour = (data: { name: string; day_of_week: number; start_time: string; end_time: string; multiplier: number }): Promise<PeakHour> =>
  api.post('/admin/peak-hours', data) as unknown as Promise<PeakHour>;

export const updatePeakHour = (id: string, data: { name?: string; day_of_week?: number; start_time?: string; end_time?: string; multiplier?: number }): Promise<PeakHour> =>
  api.put(`/admin/peak-hours/${id}`, data) as unknown as Promise<PeakHour>;

export const deletePeakHour = (id: string): Promise<void> =>
  api.delete(`/admin/peak-hours/${id}`) as unknown as Promise<void>;

export const togglePeakHour = (id: string): Promise<PeakHour> =>
  api.patch(`/admin/peak-hours/${id}/toggle`) as unknown as Promise<PeakHour>;
