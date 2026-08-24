const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDXcaUumZ7RJkaXpqUa2IYhSU3xxJSLvAw'

export default ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      googleMapsApiKey: GOOGLE_MAPS_KEY,
    },
  },
  android: {
    ...config.android,
    usesCleartextTraffic: true,
    config: {
      googleMaps: {
        apiKey: GOOGLE_MAPS_KEY,
      },
    },
  },
})
