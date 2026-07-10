export default ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...config.android,
    usesCleartextTraffic: true,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
})
