import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS, ADMIN_RADIUS } from '../../constants/theme';

interface Props {
  stats: {
    total_requests: number;
    avg_response_time_ms: number;
    error_rate_pct: number;
  } | null;
}

export default function ApiHealthCard({ stats }: Props) {
  if (!stats) return null;

  const totalRequests = stats.total_requests ?? 0;
  const avgResponseTime = stats.avg_response_time_ms ?? 0;
  const errorRate = stats.error_rate_pct ?? 0;

  const getHealthColor = (errorRate: number) => {
    if (errorRate < 1) return ADMIN_COLORS.green;
    if (errorRate < 5) return ADMIN_COLORS.orange;
    return ADMIN_COLORS.red;
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>API Health</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.value}>{totalRequests.toLocaleString()}</Text>
          <Text style={styles.label}>Requests</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: avgResponseTime > 500 ? ADMIN_COLORS.orange : ADMIN_COLORS.green }]}>
            {Math.round(avgResponseTime)}ms
          </Text>
          <Text style={styles.label}>Avg Response</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: getHealthColor(errorRate) }]}>
            {errorRate}%
          </Text>
          <Text style={styles.label}>Error Rate</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  value: { color: ADMIN_COLORS.text, fontSize: 18, fontWeight: '700' },
  label: { color: ADMIN_COLORS.textMuted, fontSize: 12, marginTop: 4 },
});
