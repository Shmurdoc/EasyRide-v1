import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { ProgressBar } from '../common/ProgressBar';
import { ADMIN_COLORS } from '../../constants/theme';

interface ActiveRide {
  id: string;
  passenger: string;
  pickup: string;
  dropoff: string;
  fare: number;
  progress: number;
}

interface ActiveRidesCardProps {
  rides: ActiveRide[];
  onViewAll?: () => void;
}

export default function ActiveRidesCard({ rides, onViewAll }: ActiveRidesCardProps) {
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Active Rides</Text>
        <Text style={styles.count}>{rides.length} in progress</Text>
      </View>
      {rides.slice(0, 3).map((ride) => (
        <View key={ride.id} style={styles.rideItem}>
          <View style={styles.rideIcon}>
            <Ionicons name="car" size={16} color={ADMIN_COLORS.accent} />
          </View>
          <View style={styles.rideInfo}>
            <Text style={styles.passenger}>{ride.passenger}</Text>
            <Text style={styles.route}>{ride.pickup} → {ride.dropoff}</Text>
          </View>
          <View style={styles.rideRight}>
            <Text style={styles.fare}>R{ride.fare}</Text>
            <ProgressBar progress={ride.progress} height={4} />
          </View>
        </View>
      ))}
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View All Rides →</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  count: { fontSize: 12, color: ADMIN_COLORS.orange, fontWeight: '600' },
  rideItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 8 },
  rideIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rideInfo: { flex: 1 },
  passenger: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  route: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  rideRight: { alignItems: 'flex-end', width: 80 },
  fare: { fontSize: 14, fontWeight: '700', color: ADMIN_COLORS.accent, marginBottom: 4 },
  viewAll: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: ADMIN_COLORS.accent },
});
