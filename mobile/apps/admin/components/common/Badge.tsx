import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

type BadgeVariant = 'online' | 'offline' | 'busy' | 'active' | 'pending';

const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  online: { bg: 'rgba(22,163,74,0.2)', text: '#4ade80' },
  offline: { bg: 'rgba(220,38,38,0.2)', text: '#f87171' },
  busy: { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  active: { bg: 'rgba(99,102,241,0.2)', text: '#818cf8' },
  pending: { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
};

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
}

export function Badge({ variant, label }: BadgeProps) {
  const colors = BADGE_COLORS[variant] || BADGE_COLORS.active;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
