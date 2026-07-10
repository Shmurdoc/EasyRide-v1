import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS, ADMIN_RADIUS } from '../../constants/theme';

interface Props {
  stats: {
    searching: number;
    accepted: number;
    in_progress: number;
    completed_today: number;
    cancelled_today: number;
    completion_rate_pct: number;
    avg_completion_time_minutes: number;
  } | null;
}

export default function RideFlowCard({ stats }: Props) {
  if (!stats) return null;

  const statuses = [
    { label: 'Searching', count: stats.searching, color: ADMIN_COLORS.yellow },
    { label: 'Accepted', count: stats.accepted, color: ADMIN_COLORS.primary },
    { label: 'In Progress', count: stats.in_progress, color: ADMIN_COLORS.green },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ride Flow</Text>
      <View style={styles.statusRow}>
        {statuses.map((s) => (
          <View key={s.label} style={styles.statusItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.statusCount}>{s.count}</Text>
            <Text style={styles.statusLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.completed_today}</Text>
          <Text style={styles.summaryLabel}>Completed Today</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: stats.completion_rate_pct > 80 ? ADMIN_COLORS.green : ADMIN_COLORS.orange }]}>
            {stats.completion_rate_pct}%
          </Text>
          <Text style={styles.summaryLabel}>Completion Rate</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.round(stats.avg_completion_time_minutes)}m</Text>
          <Text style={styles.summaryLabel}>Avg Duration</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADIUS.lg,
    padding: 16,
    marginBottom: 16,
  },
  title: { color: ADMIN_COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statusItem: { alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  statusCount: { color: ADMIN_COLORS.text, fontSize: 20, fontWeight: '700' },
  statusLabel: { color: ADMIN_COLORS.textMuted, fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: ADMIN_COLORS.surfaceLight, marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { color: ADMIN_COLORS.text, fontSize: 16, fontWeight: '600' },
  summaryLabel: { color: ADMIN_COLORS.textMuted, fontSize: 11, marginTop: 4 },
});
