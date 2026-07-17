import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import api from '../lib/api';

const PHALABORWA_CENTER = { lat: -23.9468, lng: 29.4726 };

interface DriverLocation {
  id: string;
  name: string;
  is_online: boolean;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  last_location_update: string | null;
  current_ride_id: string | null;
  ride_status: string | null;
  rating: number | null;
  total_trips: number;
  vehicle: {
    make: string;
    model: string;
    category: string;
    color: string;
    license_plate: string;
  } | null;
}

interface DriverSummary {
  total: number;
  online: number;
  busy: number;
  offline: number;
}

interface LiveMapData {
  drivers: DriverLocation[];
  summary: DriverSummary;
}

const VEHICLE_TYPES = ['standard', 'comfort', 'xl', 'bike', 'delivery'];

function getMarkerColor(driver: DriverLocation): string {
  if (!driver.is_online) return '#9CA3AF';
  if (driver.current_ride_id) return '#EF4444';
  return '#22C55E';
}

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatRideStatus(status: string | null): string {
  if (!status) return '';
  const labels: Record<string, string> = {
    searching: 'Searching',
    accepted: 'En Route',
    arrived: 'Arrived',
    in_progress: 'On Ride',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

function getMarkerLabel(driver: DriverLocation): string {
  if (!driver.is_online) return 'Offline';
  if (driver.current_ride_id) return formatRideStatus(driver.ride_status) || 'Busy';
  return 'Available';
}

function getMarkerBgColor(driver: DriverLocation): string {
  if (!driver.is_online) return 'bg-gray-100';
  if (driver.current_ride_id) return 'bg-red-100';
  return 'bg-green-100';
}

function getMarkerTextColor(driver: DriverLocation): string {
  if (!driver.is_online) return 'text-gray-600';
  if (driver.current_ride_id) return 'text-red-700';
  return 'text-green-700';
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export default function LiveMap() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const [showOffline, setShowOffline] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { data, isLoading, isError } = useQuery<LiveMapData>({
    queryKey: ['admin-live-map', { showOffline, vehicleFilter, searchQuery }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (!showOffline) params.online_only = '1';
      if (vehicleFilter) params.vehicle_type = vehicleFilter;
      if (searchQuery) params.search = searchQuery;
      const { data } = await api.get('/admin/live-map/drivers', { params });
      return data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  const drivers = data?.drivers ?? [];
  const summary = data?.summary ?? { total: 0, online: 0, busy: 0, offline: 0 };

  const filteredDrivers = drivers.filter((d) => {
    if (!showOffline && !d.is_online) return false;
    if (vehicleFilter && d.vehicle?.category !== vehicleFilter) return false;
    return true;
  });

  const mapDrivers = filteredDrivers.filter(
    (d) => d.latitude != null && d.longitude != null,
  );

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const panToDriver = useCallback(
    (driver: DriverLocation) => {
      if (driver.latitude && driver.longitude && mapRef.current) {
        mapRef.current.panTo({ lat: driver.latitude, lng: driver.longitude });
        mapRef.current.setZoom(15);
        setSelectedDriver(driver);
      }
    },
    [],
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6 bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Sidebar */}
      <div
        className={`bg-white border-r flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Live Map</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              title="Collapse sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-medium">Online</div>
              <div className="text-xl font-bold text-blue-700">{summary.online}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-red-600 font-medium">Busy</div>
              <div className="text-xl font-bold text-red-700">{summary.busy}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 font-medium">Offline</div>
              <div className="text-xl font-bold text-gray-700">{summary.offline}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-green-600 font-medium">Available</div>
              <div className="text-xl font-bold text-green-700">
                {summary.online - summary.busy}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <div className="flex gap-2">
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">All Vehicles</option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showOffline}
                  onChange={(e) => setShowOffline(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Offline
              </label>
            </div>
          </div>
        </div>

        {/* Driver List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && drivers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Loading drivers...</div>
          ) : isError ? (
            <div className="p-6 text-center text-red-500">Failed to load drivers.</div>
          ) : filteredDrivers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No drivers found.</div>
          ) : (
            <div className="divide-y">
              {filteredDrivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => panToDriver(driver)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedDriver?.id === driver.id ? 'bg-primary-50 border-l-2 border-primary-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {driver.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMarkerBgColor(driver)} ${getMarkerTextColor(driver)}`}
                        >
                          {getMarkerLabel(driver)}
                        </span>
                        {driver.vehicle && (
                          <span className="text-xs text-gray-500">
                            {driver.vehicle.make} {driver.vehicle.model}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        {driver.rating != null && (
                          <span className="flex items-center gap-0.5">
                            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {driver.rating}
                          </span>
                        )}
                        <span>{driver.total_trips} trips</span>
                        <span>{formatTimeAgo(driver.last_location_update)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Toggle */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-l-0 rounded-r-lg shadow-md p-2 text-gray-600 hover:text-gray-900"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={PHALABORWA_CENTER}
          zoom={13}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {mapDrivers.map((driver) => (
            <Marker
              key={driver.id}
              position={{ lat: driver.latitude!, lng: driver.longitude! }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: getMarkerColor(driver),
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              onClick={() => setSelectedDriver(driver)}
            />
          ))}

          {selectedDriver && selectedDriver.latitude && selectedDriver.longitude && (
            <InfoWindow
              position={{ lat: selectedDriver.latitude, lng: selectedDriver.longitude }}
              onCloseClick={() => setSelectedDriver(null)}
            >
              <div className="p-2 min-w-[200px]">
                <div className="font-bold text-gray-900">{selectedDriver.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedDriver.vehicle
                    ? `${selectedDriver.vehicle.color} ${selectedDriver.vehicle.make} ${selectedDriver.vehicle.model}`
                    : 'No vehicle'}
                </div>
                {selectedDriver.vehicle && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {selectedDriver.vehicle.license_plate}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMarkerBgColor(selectedDriver)} ${getMarkerTextColor(selectedDriver)}`}
                  >
                    {getMarkerLabel(selectedDriver)}
                  </span>
                  {selectedDriver.rating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-600">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {selectedDriver.rating}
                    </span>
                  )}
                </div>
                {selectedDriver.current_ride_id && (
                  <div className="text-xs text-red-600 font-medium mt-1.5">
                    Ride: {formatRideStatus(selectedDriver.ride_status)}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Last update: {formatTimeAgo(selectedDriver.last_location_update)}
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Auto-refresh indicator */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 flex items-center gap-2 text-xs text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Auto-refreshing every 10s
        </div>
      </div>
    </div>
  );
}
