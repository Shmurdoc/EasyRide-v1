import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ReconnectionBannerProps {
  isReconnecting: boolean;
  reconnectAttempt: number;
}

export function ReconnectionBanner({ isReconnecting, reconnectAttempt }: ReconnectionBannerProps) {
  if (!isReconnecting) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Reconnecting{reconnectAttempt > 0 ? ` (attempt ${reconnectAttempt})` : ''}...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
});
