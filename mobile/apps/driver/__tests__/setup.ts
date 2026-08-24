jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => React.createElement('Ionicons', props),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: (props: any) => React.createElement('LinearGradient', props),
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) =>
      React.createElement('MapView', { ...props, ref })
    ),
    Marker: (props: any) => React.createElement('Marker', props),
    Polyline: (props: any) => React.createElement('Polyline', props),
  };
});

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: -23.9, longitude: 29.4 },
  }),
  Accuracy: { High: 6, Balanced: 3 },
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///test.jpg' }] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photo.jpg' }] }),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-localization', () => ({
  getLocales: jest.fn().mockReturnValue([{ languageCode: 'en', regionCode: 'ZA' }]),
  locale: 'en-ZA',
  getLocalesAsync: jest.fn().mockResolvedValue([{ languageCode: 'en', regionCode: 'ZA' }]),
}));

jest.mock('expo-device', () => ({
  isDevice: false,
  DeviceType: {},
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  NavigationContainer: (props: any) => props.children,
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn().mockReturnValue({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

const mockAuth = {
  user: {
    id: 'driver-1',
    name: 'Test Driver',
    email: 'driver@easyryde.com',
    vehicle: {
      make: 'Toyota',
      model: 'Corolla',
      year: 2023,
      color: 'White',
      license_plate: 'ABC 123 GP',
    },
  },
  token: 'test-token-123',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn(),
};

const mockSocket = {
  isConnected: true,
  isReconnecting: false,
  emit: jest.fn(),
  on: jest.fn().mockReturnValue(jest.fn()),
  socket: { on: jest.fn(), off: jest.fn() },
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
};

jest.mock('@easyryde/shared', () => {
  const mockTheme = {
    colors: {
      bg: '#1c1c1e',
      surface: '#242426',
      surfaceLight: '#2c2c2e',
      border: '#3a3a3c',
      text: '#ffffff',
      textMuted: '#98989d',
      success: '#16a34a',
      danger: '#dc2626',
      warning: '#f59e0b',
      white: '#ffffff',
      brand: '#FF6A00',
      brandStrong: '#e05e00',
      brandSoft: 'rgba(255,106,0,0.14)',
      brandContrast: '#ffffff',
    },
    radius: { xs: 4, sm: 6, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, sheet: 28, full: 9999 },
    spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24 },
    shadows: { brand: {}, card: {}, raised: {} },
  };
  return {
    useAuth: jest.fn(() => mockAuth),
    useTheme: jest.fn(() => mockTheme),
    useSocket: jest.fn(() => mockSocket),
    useNotifications: jest.fn(),
    ErrorBoundary: ({ children }: any) => children,
    ThemeProvider: ({ children }: any) => children,
    AuthProvider: ({ children }: any) => children,
    COLORS: {
      primary: '#FFAD7A',
      primaryDark: '#e89b6a',
      primaryLight: '#FFAD7A',
      success: '#16a34a',
      successLight: '#22c55e',
      successGlow: 'rgba(22,163,74,0.15)',
      error: '#dc2626',
      errorLight: '#ef4444',
      errorGlow: 'rgba(220,38,38,0.15)',
      warning: '#f59e0b',
      blue: '#3b82f6',
      bg: '#1c1c1e',
      surface: '#1c1c1e',
      surfaceElevated: '#242426',
      surfaceLight: '#2c2c2e',
      surfaceBorder: '#3a3a3c',
      white: '#fff',
      textMuted: '#98989d',
      textDim: '#666',
      ink: '#0F1713',
      card: '#FFFFFF',
      line: '#E5EAE4',
      brandLightBg: '#E7F5EE',
      amber: '#F5A524',
      red: '#E5484D',
      overlay: 'rgba(8, 12, 10, 0.5)',
      muted: '#8A978F',
      primaryGlow: 'rgba(10, 124, 78, 0.25)',
    },
    SPACING: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24 },
    RADIUS: { sm: 6, md: 12, lg: 16, xl: 20, '2xl': 24, full: 9999 },
    GRADIENTS: { primary: ['#0B3B2A', '#0A7C4E'] },
    SHADOWS: {
      subtle: {
        shadowColor: '#0F1713',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
      },
      moderate: {
        shadowColor: '#0F1713',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 18,
        elevation: 4,
      },
      elevated: {
        shadowColor: '#0F1713',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 44,
        elevation: 8,
      },
      glow: {
        shadowColor: '#0A7C4E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 8,
      },
      glowSuccess: {
        shadowColor: '#0A7C4E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
      },
      glowError: {
        shadowColor: '#E5484D',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
      },
    },
    COLORS_DARK: { primary: '#FFAD7A', primaryDark: '#e89b6a', primaryLight: '#FFAD7A', success: '#16a34a', successLight: '#22c55e', error: '#dc2626', errorLight: '#ef4444', warning: '#f59e0b', blue: '#3b82f6', bg: '#1c1c1e', surface: '#1c1c1e', surfaceElevated: '#242426', surfaceLight: '#2c2c2e', surfaceBorder: '#3a3a3c', white: '#fff', textMuted: '#98989d', textDim: '#666', appBg: '#1c1c1e', cardBg: '#2c2c2e', cardBorder: '#3a3a3c' },
    SPACING_DARK: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24 },
    RADIUS_DARK: { sm: 6, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, full: 9999 },
    SHADOWS_DARK: { sm: {}, md: {}, lg: {}, xl: {} },
    GLASS_DARK: { background: 'rgba(44,44,46,0.8)', border: 'rgba(255,255,255,0.1)', blur: 20 },
    ANIMATION_DARK: { spring: {}, timing: {} },
    AnimatedNumber: (props: any) => null,
    GlassCard: (props: any) => null,
    Avatar: (props: any) => null,
    ProgressBar: (props: any) => null,
    Input: ({ label, placeholder, ...props }: any) => {
      const React = require('react');
      const { TextInput } = require('react-native');
      const placeholderText = label || placeholder || '';
      return React.createElement(TextInput, { placeholder: placeholderText, ...props });
    },
    Button: ({ title, ...props }: any) => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, null, title);
    },
    Typography: ({ children, ...props }: any) => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, null, children);
    },
    GradientText: ({ children, ...props }: any) => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, null, children);
    },
    decodePolyline: jest.fn().mockReturnValue([]),
    scheduleLocalNotification: jest.fn(),
    drivers: {
      get: jest.fn().mockResolvedValue({
        rating: 4.8,
        total_trips: 1847,
        acceptance_rate: 96,
        driver_rating: 4.8,
        completed_rides: 1847,
      }),
      earnings: jest.fn().mockResolvedValue({
        today_earnings: 450,
        week_earnings: 2800,
        month_earnings: 12000,
        total_earnings: 56000,
        total_trips: 245,
        rating: 4.8,
        hours_online: 6.5,
        pending_payout: 1200,
        recent_transactions: [],
      }),
      toggleOnline: jest.fn().mockResolvedValue({ is_online: true }),
      updateLocation: jest.fn().mockResolvedValue(undefined),
      trips: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'trip-1',
            pickup_address: '123 Main St',
            dropoff_address: '456 Oak Ave',
            total_fare: 85,
            distance_km: 5.2,
            duration_minutes: 15,
            status: 'completed',
            created_at: '2025-01-15T10:30:00Z',
            rider: { name: 'John Rider' },
          },
        ],
      }),
      registerVehicle: jest.fn().mockResolvedValue(undefined),
    },
    rides: {
      get: jest.fn().mockResolvedValue({
        id: 'ride-1',
        status: 'to_pickup',
        pickup_address: '123 Main St',
        dropoff_address: '456 Oak Ave',
        pickup_latitude: -23.9,
        pickup_longitude: 29.4,
        dropoff_latitude: -23.95,
        dropoff_longitude: 29.45,
        distance_km: 5.2,
        duration_minutes: 15,
        total_fare: 85,
        route_polyline: '',
        rider: { name: 'Jane Rider', rating: 4.9 },
      }),
      updateLocation: jest.fn().mockResolvedValue(undefined),
    },
    foodDelivery: {
      getOrder: jest.fn().mockResolvedValue({
        id: 'order-123',
        status: 'preparing',
        restaurant: { name: 'Test Restaurant' },
        items: [{ id: 'i1', name: 'Test Item', quantity: 1, line_total: 50 }],
        total_amount: 50,
        delivery_address: '123 Test St',
        customer: { name: 'Test Customer', phone_number: '+27123456789' },
      }),
      availableOrders: jest.fn().mockResolvedValue([
        {
          id: 'order-1',
          status: 'pending',
          driver_id: null,
          restaurant: { name: 'Pizza Palace' },
          items: [
            { id: 'i1', name: 'Margherita Pizza', quantity: 1 },
            { id: 'i2', name: 'Coke', quantity: 2 },
          ],
          total_amount: 120,
          delivery_address: '789 Pine Rd',
        },
      ]),
      driverOrders: jest.fn().mockResolvedValue([]),
      acceptOrder: jest.fn().mockResolvedValue(undefined),
    },
    kyc: {
      myVerifications: jest.fn().mockResolvedValue({
        verifications: [
          {
            verification_type: 'license',
            status: 'approved',
            document_number: 'DL123456',
            expires_at: '2027-01-01',
            created_at: '2025-01-01',
          },
          {
            verification_type: 'vehicle',
            status: 'pending',
            document_number: '',
            created_at: '2025-01-10',
          },
        ],
      }),
      submit: jest.fn().mockResolvedValue(undefined),
    },
    sos: {
      trigger: jest.fn().mockResolvedValue(undefined),
    },
    DriverNav: {} as any,
    DriverRoute: {} as any,
  };
});
