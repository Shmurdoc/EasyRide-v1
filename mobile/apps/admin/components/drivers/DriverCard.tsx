import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { ADMIN_COLORS } from '../../constants/theme';
import type { AdminDriver } from '../../api/types';

interface DriverCardProps {
  driver: AdminDriver;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function DriverCard({ driver, onPress, onApprove, onReject }: DriverCardProps) {
  const profile = driver.driverProfile;
  const vehicle = driver.vehicle;
  const status = driver.is_online ? (profile?.total_trips ? 'busy' : 'online') : 'offline';
  const isPending = profile && !profile.is_approved;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={driver.name} size={48} borderColor={status === 'online' ? ADMIN_COLORS.green : status === 'busy' ? ADMIN_COLORS.orange : 'rgba(255,255,255,0.08)'} />
            <View style={styles.info}>
              <Text style={styles.name}>{driver.name}</Text>
              <Text style={styles.vehicle}>{vehicle ? `${vehicle.make} ${vehicle.model} • ${vehicle.license_plate}` : 'No vehicle'}</Text>
            </View>
          </View>
          <Badge variant={isPending ? 'pending' : status as any} label={isPending ? 'PENDING' : status.toUpperCase()} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: ADMIN_COLORS.accent }]}>{profile?.current_zone || '—'}</Text>
            <Text style={styles.statLabel}>Zone</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: status === 'online' ? ADMIN_COLORS.green : status === 'busy' ? ADMIN_COLORS.orange : '#888899' }]}>
              {isPending ? 'Pending' : status === 'online' ? 'Active' : status === 'busy' ? 'On Trip' : 'Offline'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {isPending ? (
          <View style={styles.pendingActions}>
            <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
              <Text style={styles.viewBtnText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  info: { marginLeft: 10, flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  vehicle: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  pendingActions: { flexDirection: 'row', gap: 12 },
  approveBtn: { flex: 1, backgroundColor: ADMIN_COLORS.green, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  approveText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, backgroundColor: ADMIN_COLORS.red, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  rejectText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  actions: { flexDirection: 'row' },
  viewBtn: { flex: 1, backgroundColor: ADMIN_COLORS.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  viewBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
