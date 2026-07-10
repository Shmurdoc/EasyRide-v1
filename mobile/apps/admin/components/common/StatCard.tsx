import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ADMIN_COLORS } from '../../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon?: string;
}

export function StatCard({ label, value, trend, icon }: StatCardProps) {
  return (
    <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.card}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={styles.value}>{typeof value === 'number' && label.toLowerCase().includes('revenue') ? `R${(value ?? 0).toLocaleString()}` : (value ?? 0)}</Text>
      {trend && (
        <Text style={styles.trend}>{trend}</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  trend: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
