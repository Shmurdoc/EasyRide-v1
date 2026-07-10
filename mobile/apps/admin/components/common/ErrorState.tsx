import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../../constants/theme';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={56} color={ADMIN_COLORS.red} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
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
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: ADMIN_COLORS.accent,
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
