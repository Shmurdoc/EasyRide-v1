import React from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';

interface RideDetailParams {
  ride: {
    id: string;
    status: string;
    pickup_address: string;
    dropoff_address: string;
    total_fare: string;
    payment?: { method: string; status: string };
    rider: { name: string; email: string };
    driver?: { name: string; vehicle?: { make: string; model: string; license_plate: string } };
    rating?: { score: number; comment: string };
    created_at?: string;
    accepted_at?: string;
    arrived_at?: string;
    started_at?: string;
    completed_at?: string;
    cancelled_at?: string;
  };
}

interface Props {
  route: { params: RideDetailParams };
  navigation: any;
}

export function RideDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { ride } = route.params;

  const timeline = [
    ride.created_at && { time: new Date(ride.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Ride requested' },
    ride.accepted_at && { time: new Date(ride.accepted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Driver accepted' },
    ride.arrived_at && { time: new Date(ride.arrived_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Driver arrived' },
    ride.started_at && { time: new Date(ride.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Trip started' },
    ride.completed_at && { time: new Date(ride.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Trip completed' },
    ride.cancelled_at && { time: new Date(ride.cancelled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Ride cancelled' },
  ].filter(Boolean) as { time: string; event: string }[];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Ride {ride.id.slice(0, 8)}</Text>
            <Badge variant={ride.status === 'completed' ? 'online' : 'active'} label={ride.status.replace('_', ' ').toUpperCase()} />
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={[styles.dot, { backgroundColor: ADMIN_COLORS.green }]} />
              <View style={styles.routeLine} />
              <Ionicons name="location" size={14} color={ADMIN_COLORS.orange} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress}>{ride.pickup_address}</Text>
              <Text style={[styles.routeLabel, { marginTop: 12 }]}>Dropoff</Text>
              <Text style={styles.routeAddress}>{ride.dropoff_address}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Participants</Text>
          <View style={styles.participantRow}>
            <Avatar name={ride.rider.name} size={40} />
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{ride.rider.name}</Text>
              <Text style={styles.participantDetail}>{ride.rider.email}</Text>
            </View>
          </View>
          {ride.driver && (
            <View style={[styles.participantRow, { marginTop: 12 }]}>
              <Avatar name={ride.driver.name} size={40} />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{ride.driver.name}</Text>
                <Text style={styles.participantDetail}>{ride.driver.vehicle ? `${ride.driver.vehicle.make} ${ride.driver.vehicle.model} • ${ride.driver.vehicle.license_plate}` : 'Vehicle'}</Text>
              </View>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Method</Text>
            <Text style={styles.paymentValue}>{ride.payment?.method || 'N/A'}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Status</Text>
            <Badge variant={ride.payment?.status === 'completed' ? 'online' : 'active'} label={ride.payment?.status || 'pending'} />
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Fare</Text>
            <Text style={styles.fareValue}>R{ride.total_fare}</Text>
          </View>
        </Card>

        {timeline.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {timeline.map((item, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineTime}>{item.time}</Text>
                <Text style={styles.timelineEvent}>{item.event}</Text>
              </View>
            ))}
          </Card>
        )}

        {ride.rating && (
          <Card>
            <Text style={styles.sectionTitle}>Rating</Text>
            <Text style={styles.ratingScore}>{ride.rating.score}/5</Text>
            <Text style={styles.ratingComment}>{ride.rating.comment}</Text>
          </Card>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Call Rider</Text>
          </TouchableOpacity>
          {ride.driver && (
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="call" size={18} color="#ffffff" />
              <Text style={styles.actionText}>Call Driver</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  routeRow: { flexDirection: 'row' },
  routeDots: { alignItems: 'center', marginRight: 12, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, height: 24, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  routeAddress: { fontSize: 14, color: '#ffffff' },
  participantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 },
  participantInfo: { marginLeft: 10, flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  participantDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  paymentLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  paymentValue: { fontSize: 14, color: '#ffffff' },
  fareValue: { fontSize: 18, fontWeight: '700', color: ADMIN_COLORS.accent },
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ADMIN_COLORS.accent, marginRight: 10 },
  timelineTime: { fontSize: 13, color: ADMIN_COLORS.accent, fontWeight: '600', width: 60 },
  timelineEvent: { fontSize: 14, color: '#ffffff', flex: 1 },
  ratingScore: { fontSize: 18, fontWeight: '700', color: '#f59e0b', marginBottom: 4 },
  ratingComment: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ADMIN_COLORS.accent, borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
