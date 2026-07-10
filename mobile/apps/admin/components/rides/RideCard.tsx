import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { ADMIN_COLORS } from '../../constants/theme';
import type { AdminRide } from '../../api/types';

interface RideCardProps {
  ride: AdminRide;
  onPress?: () => void;
}

const STATUS_MAP: Record<string, { variant: 'active' | 'online' | 'busy' | 'offline'; label: string }> = {
  in_progress: { variant: 'active', label: 'IN PROGRESS' },
  accepted: { variant: 'online', label: 'ACCEPTED' },
  arrived: { variant: 'online', label: 'ARRIVED' },
  completed: { variant: 'online', label: 'COMPLETED' },
  cancelled: { variant: 'offline', label: 'CANCELLED' },
  searching: { variant: 'busy', label: 'SEARCHING' },
};

export default function RideCard({ ride, onPress }: RideCardProps) {
  const statusInfo = STATUS_MAP[ride.status] || { variant: 'active' as const, label: ride.status.toUpperCase() };
  const progress = ride.status === 'completed' ? 100 : ride.status === 'in_progress' ? 50 : ride.status === 'accepted' ? 25 : 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.rideId}>{ride.id.slice(0, 8)}</Text>
            <Badge variant={statusInfo.variant} label={statusInfo.label} />
          </View>
          <Text style={styles.time}>{new Date(ride.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        {ride.driver && (
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={16} color={ADMIN_COLORS.accent} />
            </View>
            <View>
              <Text style={styles.driverName}>{ride.driver.name}</Text>
              <Text style={styles.vehicle}>{ride.driver.vehicle ? `${ride.driver.vehicle.make} ${ride.driver.vehicle.model}` : 'Vehicle'}</Text>
            </View>
          </View>
        )}

        <View style={styles.routeRow}>
          <View style={styles.routeDots}>
            <View style={[styles.dot, { backgroundColor: ADMIN_COLORS.green }]} />
            <View style={styles.routeLine} />
            <Ionicons name="location" size={14} color={ADMIN_COLORS.orange} />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.riderName}>{ride.rider.name}</Text>
            <Text style={styles.address}>{ride.pickup_address}</Text>
            <Text style={[styles.address, { marginTop: 8 }]}>{ride.dropoff_address}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <ProgressBar progress={progress} />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={14} color={ADMIN_COLORS.accent} />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble" size={14} color={ADMIN_COLORS.accent} />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <Text style={styles.fare}>R{ride.total_fare}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rideId: { fontSize: 13, fontFamily: 'monospace', color: ADMIN_COLORS.accent, fontWeight: '600' },
  time: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  driverName: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  vehicle: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  routeRow: { flexDirection: 'row', marginBottom: 12 },
  routeDots: { alignItems: 'center', marginRight: 10, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, height: 20, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 2 },
  routeInfo: { flex: 1 },
  riderName: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  address: { fontSize: 14, color: '#ffffff' },
  progressSection: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  progressValue: { fontSize: 12, fontWeight: '700', color: ADMIN_COLORS.accent },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 16 },
  actionText: { fontSize: 12, color: ADMIN_COLORS.accent },
  fare: { flex: 1, textAlign: 'right', fontSize: 16, fontWeight: '700', color: ADMIN_COLORS.accent },
});
