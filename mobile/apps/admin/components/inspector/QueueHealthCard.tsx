import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS, ADMIN_RADIUS } from '../../constants/theme';

interface Props {
  stats: {
    queues: Record<string, { size: number; status: string }>;
    failed_jobs: number;
    pending_jobs: number;
  } | null;
}

export default function QueueHealthCard({ stats }: Props) {
  if (!stats) return null;

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return ADMIN_COLORS.green;
    if (status === 'degraded') return ADMIN_COLORS.orange;
    return ADMIN_COLORS.red;
  };

  const queueEntries = Object.entries(stats.queues ?? {});

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Queue Health</Text>
      <View style={styles.queueGrid}>
        {queueEntries.map(([name, queue]) => (
          <View key={name} style={styles.queueItem}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(queue.status) }]} />
            <Text style={styles.queueName}>{name}</Text>
            <Text style={styles.queueSize}>{queue.size}</Text>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerValue, { color: stats.failed_jobs > 0 ? ADMIN_COLORS.red : ADMIN_COLORS.green }]}>
            {stats.failed_jobs}
          </Text>
          <Text style={styles.footerLabel}>Failed Jobs</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerValue}>{stats.pending_jobs}</Text>
          <Text style={styles.footerLabel}>Pending Jobs</Text>
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
  queueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  queueItem: { flexDirection: 'row', alignItems: 'center', width: '45%', marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  queueName: { color: ADMIN_COLORS.text, fontSize: 13, flex: 1 },
  queueSize: { color: ADMIN_COLORS.textMuted, fontSize: 13 },
  divider: { height: 1, backgroundColor: ADMIN_COLORS.surfaceLight, marginVertical: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-around' },
  footerItem: { alignItems: 'center' },
  footerValue: { color: ADMIN_COLORS.text, fontSize: 18, fontWeight: '700' },
  footerLabel: { color: ADMIN_COLORS.textMuted, fontSize: 12, marginTop: 4 },
});
