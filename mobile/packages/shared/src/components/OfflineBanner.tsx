import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>You're offline. Showing cached data.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
