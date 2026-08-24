export const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@easyryde.com',
  role: 'admin',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  tenant_id: 'tenant-1',
  phone_number: '+27123456789',
};

export const mockDashboardData = {
  total_users: 1250,
  total_drivers: 340,
  total_rides: 15800,
  active_rides: 42,
  total_revenue: 2450000,
  rides_today: 185,
  completed_today: 162,
  revenue_today: 28500,
  active_pool_rides: 8,
  total_pool_passengers: 24,
  fleet_online: 120,
  fleet_offline: 80,
  fleet_on_ride: 140,
  active_rides_list: [
    { id: 'ride-1', passenger: 'John Doe', pickup: 'Main St', dropoff: 'Oak Ave', fare: 85, progress: 0.6 },
    { id: 'ride-2', passenger: 'Jane Smith', pickup: 'Broadway', dropoff: 'Elm St', fare: 120, progress: 0.3 },
  ],
  hourly: [
    { hour: '06:00', rides: 12 },
    { hour: '07:00', rides: 28 },
  ],
  top_drivers: [
    { id: 'd1', name: 'Mike Driver', trips: 145, status: 'online' as const },
    { id: 'd2', name: 'Sarah Driver', trips: 132, status: 'busy' as const },
  ],
  recent_activity: [
    { type: 'ride_completed', message: 'Ride #1234 completed', time: '2 min ago' },
    { type: 'driver_approved', message: 'New driver John approved', time: '5 min ago' },
  ],
};

export const mockRidesData = {
  data: [
    {
      id: 'ride-1', status: 'in_progress' as const, category: 'economy',
      pickup_address: '45 Selati Road', dropoff_address: 'Mall of the North',
      pickup_lat: -23.94, pickup_lng: 31.08, dropoff_lat: -23.88, dropoff_lng: 31.08,
      total_fare: 145, distance_km: 8.2, duration_minutes: 15,
      created_at: '2025-01-15T10:30:00Z', completed_at: null, cancelled_at: null,
      rider: { id: 'r1', name: 'John Rider', email: 'john@test.com', phone: '+27123456789' },
      driver: { id: 'd1', name: 'Mike Driver', email: 'mike@test.com', phone: '+27987654321',
        vehicle: { make: 'Toyota', model: 'Corolla', color: 'White', license_plate: 'ABC 123 GP' } },
      payment: { method: 'cash', status: 'pending', amount: 145 },
      rating: null,
    },
  ],
  current_page: 1,
  last_page: 1,
  total: 1,
  per_page: 15,
};

export const mockDriversData = {
  data: [
    {
      id: 'd1', name: 'Mike Driver', email: 'mike@test.com', phone: '+27987654321',
      is_online: true, created_at: '2024-06-01T00:00:00Z',
      driverProfile: {
        id: 'dp1', is_approved: true, is_verified: true, rating: 4.8,
        total_trips: 234, total_earnings: 45000, license_number: 'DL123456',
        license_expiry: '2027-01-01', background_check: true,
        approved_at: '2024-06-15T00:00:00Z', approved_by: 'admin-1',
        latitude: -23.94, longitude: 31.08, current_zone: 'Phalaborwa',
      },
      vehicle: {
        id: 'v1', make: 'Toyota', model: 'Corolla', year: 2023,
        color: 'White', license_plate: 'ABC 123 GP', vehicle_type: 'sedan',
      },
    },
  ],
  current_page: 1,
  last_page: 1,
  total: 1,
  per_page: 15,
};

export const mockUsersData = {
  data: [
    { id: 'u1', name: 'John Rider', email: 'john@test.com', phone: '+27123456789',
      role: 'rider', is_active: true, created_at: '2024-01-15T00:00:00Z', last_login_at: '2025-06-10T08:30:00Z' },
    { id: 'u2', name: 'Jane Rider', email: 'jane@test.com', phone: '+27123456780',
      role: 'driver', is_active: true, created_at: '2024-02-20T00:00:00Z', last_login_at: '2025-06-09T14:00:00Z' },
  ],
  current_page: 1,
  last_page: 1,
  total: 2,
  per_page: 15,
};

export const mockSettingsData = {
  base_fare: { value: '25', type: 'number', description: 'Base fare for economy rides' },
  per_km_rate: { value: '8', type: 'number', description: 'Per kilometer rate' },
  per_minute_rate: { value: '1.5', type: 'number', description: 'Per minute rate' },
  surge_multiplier: { value: '1', type: 'number', description: 'Default surge multiplier' },
  max_surge: { value: '2.5', type: 'number', description: 'Maximum surge multiplier' },
  push_notifications: { value: '1', type: 'boolean', description: 'Enable push notifications' },
  email_notifications: { value: '1', type: 'boolean', description: 'Enable email notifications' },
  sms_notifications: { value: '0', type: 'boolean', description: 'Enable SMS notifications' },
};

export const mockSurgeZonesData = {
  data: [
    { id: 'sz-1', tenant_id: null, name: 'CBD Zone', center_lat: -23.94, center_lng: 31.08,
      radius_meters: 2000, multiplier: 1.5, is_active: true,
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  ],
  current_page: 1,
  last_page: 1,
  total: 1,
  per_page: 50,
};

export const mockPeakHoursData = {
  data: [
    { id: 'ph-1', tenant_id: null, name: 'Morning Rush', day_of_week: 1,
      start_time: '06:00', end_time: '09:00', multiplier: 1.3, is_active: true,
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  ],
  current_page: 1,
  last_page: 1,
  total: 1,
  per_page: 50,
};
