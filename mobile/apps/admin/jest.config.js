module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@easyryde/.*|react-native-maps|expo-location|expo-task-manager|expo-image-picker|expo-notifications|expo-linear-gradient|@expo/vector-icons|react-native-safe-area-context|react-native-screens|react-native-chart-kit|expo-secure-store|expo-linking)',
  ],
  setupFiles: ['./__tests__/setup.ts'],
  moduleNameMapper: {
    '^@easyryde/shared$': '<rootDir>/../../packages/shared/src',
    '^@easyryde/api-client$': '<rootDir>/../../packages/api-client/src',
    '^react-native$': '<rootDir>/../../node_modules/react-native',
  },
  testPathIgnorePatterns: ['/node_modules/', '__tests__/setup\\.ts$', '__tests__/mocks\\.ts$', '__tests__/test-utils\\.tsx$'],
};
