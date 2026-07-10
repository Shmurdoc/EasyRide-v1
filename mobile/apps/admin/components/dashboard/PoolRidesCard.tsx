import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { ADMIN_COLORS } from '../../constants/theme';

interface PoolRidesCardProps {
  activePoolRides: number;
  totalPoolPassengers: number;
}

export default function PoolRidesCard({ activePoolRides, totalPoolPassengers }: PoolRidesCardProps) {
  if (activePoolRides === 0) return null;

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons name="people" size={18} color={ADMIN_COLORS.accent} />
        <Text style={styles.title}>Pool Rides</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{activePoolRides}</Text>
          <Text style={styles.statLabel}>Active Pools</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalPoolPassengers}</Text>
          <Text style={styles.statLabel}>Passengers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {activePoolRides > 0 ? Math.round(totalPoolPassengers / activePoolRides) : 0}
          </Text>
          <Text style={styles.statLabel}>Avg / Pool</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: {
    flex: 1, alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12, padding: 10, marginHorizontal: 4,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: ADMIN_COLORS.accent },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
});
