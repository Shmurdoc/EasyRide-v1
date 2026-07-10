import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
  subtitle?: string;
}

export default function EmptyState({ icon = 'car', message, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color="rgba(255,255,255,0.12)" />
      <Text style={styles.message}>{message}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 6,
    textAlign: 'center',
  },
});
