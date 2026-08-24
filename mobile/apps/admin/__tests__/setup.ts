jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => React.createElement('Ionicons', props),
    MaterialIcons: (props: any) => React.createElement('MaterialIcons', props),
    MaterialCommunityIcons: (props: any) => React.createElement('MaterialCommunityIcons', props),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: (props: any) => React.createElement('LinearGradient', props) };
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
    PROVIDER_DEFAULT: 'default',
  };
});

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: -23.9, longitude: 29.4 },
  }),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'test-token' }),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeNotificationSubscription: jest.fn(),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('test-token'),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn().mockReturnValue([{ languageTag: 'en-US' }]),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    default: {
      getItem: jest.fn(async (key: string) => store[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn(async (key: string) => { delete store[key]; }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiRemove: jest.fn(async (keys: string[]) => { keys.forEach(k => delete store[k]); }),
      clear: jest.fn(async () => { Object.keys(store).forEach(k => delete store[k]); }),
    },
  };
});

jest.mock('socket.io-client', () => ({
  io: jest.fn().mockReturnValue({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    removeAllListeners: jest.fn(),
  }),
}));

jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  return {
    LineChart: (props: any) => React.createElement('LineChart', props),
    BarChart: (props: any) => React.createElement('BarChart', props),
    PieChart: (props: any) => React.createElement('PieChart', props),
    ContributionGraph: (props: any) => React.createElement('ContributionGraph', props),
    ProgressChart: (props: any) => React.createElement('ProgressChart', props),
  };
});

jest.mock('../components/common/LoadingSpinner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: () => React.createElement(Text, null, 'Loading...') };
});

jest.mock('../components/common/ErrorState', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ message }: any) => React.createElement(Text, null, message) };
});

jest.mock('../components/common/EmptyState', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ message }: any) => React.createElement(Text, null, message) };
});

const mockAuth = {
  user: {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@easyryde.com',
    role: 'admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    tenant_id: 'tenant-1',
    phone_number: '+27123456789',
  },
  token: 'admin-token-123',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn(),
  register: jest.fn(),
  refreshUser: jest.fn(),
  refreshToken: jest.fn().mockResolvedValue('admin-token-123'),
};

jest.mock('@easyryde/shared', () => {
  return {
    useAuth: jest.fn(() => mockAuth),
    useBusinessTheme: jest.fn(() => ({
      activeTheme: {
        id: 'biz-admin',
        name: 'EasyRyde Admin',
        slug: 'admin',
        colors: {
          primary: '#6366f1',
          primaryLight: '#818cf8',
          primaryDark: '#4f46e5',
          accent: '#6366f1',
          accentLight: '#a5b4fc',
          gradient: ['#4f46e5', '#6366f1'],
          gradientLight: ['#4f46e5', '#6366f1', '#818cf8'],
          gradientDark: ['#3730a3', '#4f46e5'],
          glow: 'rgba(99, 102, 241, 0.35)',
          tabActive: '#6366f1',
          tabInactive: '#6b7280',
          badge: '#6366f1',
          badgeText: '#FFFFFF',
          marker: '#6366f1',
          sos: '#dc2626',
          earn: '#6366f1',
          surface: '#1a1a1e',
          surfaceLight: '#252529',
          surfaceBorder: '#2a2a2e',
          text: '#ffffff',
          textSecondary: '#d1d5db',
          textMuted: '#9ca3af',
          bg: '#0f0f11',
        },
        logo: { icon: '\u2699\ufe0f', text: 'EasyRyde', mark: 'EA', full: 'EasyRyde Admin' },
        branding: { tagline: 'Manage your fleet', keywords: ['admin', 'manage', 'fleet', 'analytics', 'oversight'] },
      },
      business: null,
      isPlatformTheme: false,
      slug: 'admin',
    })),
    BusinessThemeProvider: ({ children }: any) => children,
    useSocket: jest.fn(() => ({
      isConnected: true,
      isReconnecting: false,
      emit: jest.fn(),
      on: jest.fn().mockReturnValue(jest.fn()),
      socket: { on: jest.fn(), off: jest.fn() },
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
    })),
    useNotifications: jest.fn(),
    ErrorBoundary: ({ children }: any) => children,
    ThemeProvider: ({ children }: any) => children,
    AuthProvider: ({ children }: any) => children,
    COLORS: { primary: '#6366f1', background: '#0f0f11', surface: '#1a1a1e', text: '#ffffff', textMuted: '#9ca3af', green: '#16a34a', orange: '#FFAD7A', red: '#dc2626', blue: '#3b82f6', yellow: '#eab308', white: '#ffffff' },
    ADMIN_COLORS: { primary: '#6366f1', primaryLight: '#818cf8', background: '#0f0f11', surface: '#1a1a1e', surfaceElevated: '#252529', surfaceLight: '#2c2c2e', text: '#ffffff', textSecondary: '#9ca3af', textMuted: '#71717a', green: '#16a34a', greenLight: '#22c55e', orange: '#FFAD7A', red: '#dc2626', redLight: '#ef4444', blue: '#3b82f6', yellow: '#eab308', border: '#2c2c2e', white: '#ffffff', card: '#1a1a1e', cardBorder: '#2c2c2e', headerBg: '#0f0f11', sidebarBg: '#111113', sidebarActive: 'rgba(99,102,241,0.15)', success: '#16a34a', warning: '#f59e0b', danger: '#dc2626', info: '#3b82f6' },
    ADMIN_GRADIENTS: { header: ['#4f46e5', '#6366f1'], primary: ['#6366f1', '#4f46e5'], card: ['#1a1a1e', '#252529'], sidebar: ['#111113', '#0f0f11'], success: ['#16a34a', '#22c55e'], danger: ['#dc2626', '#ef4444'], warning: ['#f59e0b', '#fbbf24'] },
    ADMIN_RADIUS: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, full: 9999 },
    GRADIENTS: { primary: ['#6366f1', '#4f46e5'], header: ['#1a1a1e', '#0f0f11'] },
    SPACING: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
    RADIUS: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    SHADOWS: { sm: {}, md: {}, lg: {}, xl: {} },
    FONTS: {},
    TYPOGRAPHY: { h1: 28, h2: 24, h3: 20, body: 15, caption: 12, label: 10 },
    formatCurrency: (c: number) => `R${c.toFixed(2)}`,
    formatDate: (d: string) => d,
    formatDistance: (d: number) => `${d.toFixed(1)} km`,
    formatDuration: (d: number) => `${d} min`,
    formatZAR: (c: number) => `R${c.toFixed(2)}`,
    decodePolyline: () => [],
    COLORS_DARK: { primary: '#6366f1', background: '#0f0f11', surface: '#1a1a1e', text: '#ffffff', textMuted: '#9ca3af', green: '#16a34a', orange: '#FFAD7A', red: '#dc2626', blue: '#3b82f6' },
    SPACING_DARK: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
    RADIUS_DARK: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    SHADOWS_DARK: { sm: {}, md: {}, lg: {}, xl: {} },
    GLASS_DARK: { background: 'rgba(44,44,46,0.8)', border: 'rgba(255,255,255,0.1)', blur: 20 },
    TYPOGRAPHY_DARK: { h1: 28, h2: 22, h3: 18, body: 15, caption: 12, label: 10 },
    AdminNav: {} as any,
    AdminRoute: {} as any,
  };
});
