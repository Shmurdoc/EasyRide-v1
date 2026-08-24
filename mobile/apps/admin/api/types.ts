export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface AdminDashboardData {
  total_users?: number;
  total_drivers?: number;
  total_rides?: number;
  active_rides?: number;
  total_revenue?: number;
  rides_today?: number;
  completed_today?: number;
  revenue_today?: number;
  active_pool_rides?: number;
  total_pool_passengers?: number;
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  activeRides: number;
  totalRevenue: number;
  ridesToday: number;
  completedToday: number;
  revenueToday: number;
  activePoolRides: number;
  totalPoolPassengers: number;
  fleetStatus: { online: number; offline: number; onRide: number; total: number };
  activeRidesList: { id: string; passenger: string; pickup: string; dropoff: string; fare: number; progress: number }[];
  hourly: { hour: string; rides: number }[];
  topDrivers: { id: string; name: string; trips: number; status: 'online' | 'busy' | 'offline' }[];
  recentActivity: { type: string; message: string; time: string }[];
}

export interface AdminDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_online: boolean;
  created_at: string;
  driverProfile: {
    id: string;
    is_approved: boolean;
    is_verified: boolean;
    rating: number;
    total_trips: number;
    total_earnings: number;
    license_number: string;
    license_expiry: string;
    background_check: boolean;
    approved_at: string | null;
    approved_by: string | null;
    latitude: number | null;
    longitude: number | null;
    current_zone: string | null;
  } | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    license_plate: string;
    vehicle_type: string;
  } | null;
}

export interface AdminRide {
  id: string;
  status: 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  total_fare: number;
  distance_km: number;
  duration_minutes: number;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  rider: { id: string; name: string; email: string; phone: string };
  driver: {
    id: string; name: string; email: string; phone: string;
    vehicle?: { make: string; model: string; color: string; license_plate: string };
  } | null;
  payment: { method: string; status: string; amount: number } | null;
  rating: { score: number; comment: string } | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminSetting {
  value: string;
  type: string;
  description: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user: { name: string };
  created_at: string;
}

export interface SurgeZone {
  id: string;
  tenant_id: string | null;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PeakHour {
  id: string;
  tenant_id: string | null;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RideQuery {
  status?: string;
  category?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface DriverQuery {
  status?: string;
  is_online?: boolean;
  is_approved?: boolean;
  is_verified?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface UserQuery {
  status?: string;
  role?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}
