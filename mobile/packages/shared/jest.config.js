module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@easyryde/.*|react-native-maps|expo-location|expo-task-manager|expo-image-picker|expo-notifications|expo-linear-gradient|@expo/vector-icons|react-native-safe-area-context|react-native-screens|socket.io-client)',
  ],
  moduleNameMapper: {
    '^@easyryde/shared$': '<rootDir>/src',
  },
  testPathIgnorePatterns: ['/node_modules/'],
};
