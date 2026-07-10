import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { ADMIN_COLORS } from '../../constants/theme';

interface FleetStatusProps {
  online: number;
  offline: number;
  onRide: number;
  total: number;
  onRefresh?: () => void;
}

export default function FleetStatus({ online, offline, onRide, total, onRefresh }: FleetStatusProps) {
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Status</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={16} color={ADMIN_COLORS.accent} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.grid}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.green }]}>{online}</Text>
          <Text style={styles.statLabel}>Online</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.blue }]}>{onRide}</Text>
          <Text style={styles.statLabel}>On Ride</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#888899' }]}>{offline}</Text>
          <Text style={styles.statLabel}>Offline</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.accent }]}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshText: { fontSize: 12, color: ADMIN_COLORS.accent },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginHorizontal: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
});
