import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '@easyryde/shared';
import { COLORS, RIDE_STATUS_LABELS, RIDE_STATUS_COLORS } from '@easyryde/shared';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { rides as ridesApi } from '../../../packages/shared/src/api/index';
import type { Ride } from '@easyryde/shared';

interface Props {
  route: { params: { id: string; ride?: Ride } };
  navigation: any;
}

export default function RideDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { id, ride: rideParam } = route.params;
  const [ride, setRide] = useState<Ride | null>(rideParam ?? null);
  const [loading, setLoading] = useState(!rideParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rideParam) return;
    setLoading(true);
    ridesApi.get(id)
      .then((data) => setRide(data))
      .catch((err) => setError(err.message || 'Failed to load ride'))
      .finally(() => setLoading(false));
  }, [id, rideParam]);

  const statusColor = ride ? RIDE_STATUS_COLORS[ride.status] || COLORS.textMuted : COLORS.textMuted;
  const statusLabel = ride ? RIDE_STATUS_LABELS[ride.status] || ride.status.replace('_', ' ').toUpperCase() : '';

  const timeline = ride ? [
    ride.created_at && { time: new Date(ride.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Ride requested', icon: 'time' as const },
    ride.started_at && { time: new Date(ride.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Trip started', icon: 'play' as const },
    ride.completed_at && { time: new Date(ride.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Trip completed', icon: 'checkmark-circle' as const },
    ride.cancelled_at && { time: new Date(ride.cancelled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Ride cancelled', icon: 'close-circle' as const },
  ].filter(Boolean) as { time: string; event: string; icon: keyof typeof Ionicons.glyphMap }[] : [];

  const handleDispute = () => {
    Alert.alert('Dispute Ride', 'Mark this ride as disputed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dispute', style: 'destructive', onPress: () => Alert.alert('Success', 'Ride marked as disputed') },
    ]);
  };

  const handleResolve = () => {
    Alert.alert('Resolve Dispute', 'Resolve this dispute?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', onPress: () => Alert.alert('Success', 'Dispute resolved') },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ride Detail</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      </View>
    );
  }

  if (error || !ride) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ride Detail</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          <Text style={[styles.errorText, { color: COLORS.text }]}>{error || 'Ride not found'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.errorLink, { color: COLORS.brand }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Ride {ride.id.slice(0, 8)}</Text>
            <Badge variant={ride.status === 'completed' ? 'online' : ride.status === 'cancelled' ? 'offline' : 'active'} label={statusLabel} />
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.mapContainer, { borderColor: COLORS.border }]}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: ride.pickup_latitude,
              longitude: ride.pickup_longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            provider={PROVIDER_GOOGLE}
            scrollEnabled={false}
          >
            <Marker coordinate={{ latitude: ride.pickup_latitude, longitude: ride.pickup_longitude }} title="Pickup">
              <View style={[styles.mapMarker, { backgroundColor: COLORS.success }]}>
                <Ionicons name="circle" size={10} color="#fff" />
              </View>
            </Marker>
            <Marker coordinate={{ latitude: ride.dropoff_latitude, longitude: ride.dropoff_longitude }} title="Dropoff">
              <View style={[styles.mapMarker, { backgroundColor: COLORS.brand }]}>
                <Ionicons name="location" size={10} color="#fff" />
              </View>
            </Marker>
          </MapView>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Route</Text>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
              <View style={[styles.routeLine, { backgroundColor: COLORS.border }]} />
              <Ionicons name="location" size={14} color={COLORS.brand} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={[styles.routeLabel, { color: COLORS.textMuted }]}>Pickup</Text>
              <Text style={[styles.routeAddress, { color: COLORS.text }]}>{ride.pickup_address}</Text>
              <Text style={[styles.routeLabel, { color: COLORS.textMuted, marginTop: 12 }]}>Dropoff</Text>
              <Text style={[styles.routeAddress, { color: COLORS.text }]}>{ride.dropoff_address}</Text>
            </View>
          </View>
        </Card>

        {timeline.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Timeline</Text>
            {timeline.map((item, idx) => (
              <View key={idx} style={[styles.timelineItem, { borderBottomColor: COLORS.border }]}>
                <View style={[styles.timelineDot, { backgroundColor: COLORS.brand }]}>
                  <Ionicons name={item.icon} size={12} color="#fff" />
                </View>
                <Text style={[styles.timelineTime, { color: COLORS.brand }]}>{item.time}</Text>
                <Text style={[styles.timelineEvent, { color: COLORS.text }]}>{item.event}</Text>
              </View>
            ))}
          </Card>
        )}

        {ride.rider && (
          <Card>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Rider</Text>
            <View style={[styles.participantRow, { backgroundColor: COLORS.surfaceLight }]}>
              <Avatar name={ride.rider.name} size={40} />
              <View style={styles.participantInfo}>
                <Text style={[styles.participantName, { color: COLORS.text }]}>{ride.rider.name}</Text>
                <Text style={[styles.participantDetail, { color: COLORS.textMuted }]}>{ride.rider.email}</Text>
              </View>
            </View>
          </Card>
        )}

        {ride.driver && (
          <Card>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Driver</Text>
            <View style={[styles.participantRow, { backgroundColor: COLORS.surfaceLight }]}>
              <Avatar name={ride.driver.name} size={40} />
              <View style={styles.participantInfo}>
                <Text style={[styles.participantName, { color: COLORS.text }]}>{ride.driver.name}</Text>
                <Text style={[styles.participantDetail, { color: COLORS.textMuted }]}>{ride.driver.email}</Text>
              </View>
            </View>
          </Card>
        )}

        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Fare Breakdown</Text>
          <View style={[styles.fareRow, { borderBottomColor: COLORS.border }]}>
            <Text style={[styles.fareLabel, { color: COLORS.textMuted }]}>Base Fare</Text>
            <Text style={[styles.fareValue, { color: COLORS.text }]}>R{ride.base_fare?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={[styles.fareRow, { borderBottomColor: COLORS.border }]}>
            <Text style={[styles.fareLabel, { color: COLORS.textMuted }]}>Distance ({ride.distance_km?.toFixed(1)} km)</Text>
            <Text style={[styles.fareValue, { color: COLORS.text }]}>R{ride.per_km_fare?.toFixed(2) || '0.00'}</Text>
          </View>
          {ride.surge_multiplier > 1 && (
            <View style={[styles.fareRow, { borderBottomColor: COLORS.border }]}>
              <Text style={[styles.fareLabel, { color: COLORS.textMuted }]}>Surge ({ride.surge_multiplier}x)</Text>
              <Text style={[styles.fareValue, { color: COLORS.warning }]}>Active</Text>
            </View>
          )}
          {ride.discount_amount && ride.discount_amount > 0 && (
            <View style={[styles.fareRow, { borderBottomColor: COLORS.border }]}>
              <Text style={[styles.fareLabel, { color: COLORS.textMuted }]}>Discount</Text>
              <Text style={[styles.fareValue, { color: COLORS.success }]}>-R{ride.discount_amount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: COLORS.text, fontWeight: '700' }]}>Total</Text>
            <Text style={[styles.fareValue, { color: COLORS.brand, fontSize: 18, fontWeight: '800' }]}>R{ride.total_fare?.toFixed(2) || '0.00'}</Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Payment</Text>
          <View style={[styles.fareRow, { borderBottomColor: COLORS.border }]}>
            <Text style={[styles.fareLabel, { color: COLORS.textMuted }]}>Method</Text>
            <Text style={[styles.fareValue, { color: COLORS.text }]}>{ride.payment_method || 'N/A'}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: COLORS.textMuted }]}>Status</Text>
            <Badge variant={ride.payment_status === 'completed' ? 'online' : 'pending'} label={ride.payment_status || 'pending'} />
          </View>
        </Card>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.brand }]} onPress={handleDispute}>
            <Ionicons name="warning" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Dispute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={handleResolve}>
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Resolve</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, marginTop: 16 },
  errorLink: { fontSize: 14, marginTop: 12 },
  mapContainer: { height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1 },
  map: { flex: 1 },
  mapMarker: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  routeRow: { flexDirection: 'row' },
  routeDots: { alignItems: 'center', marginRight: 12, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, height: 24, marginVertical: 4 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 12 },
  routeAddress: { fontSize: 14 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  timelineTime: { fontSize: 13, fontWeight: '600', width: 60 },
  timelineEvent: { fontSize: 14, flex: 1 },
  participantRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10 },
  participantInfo: { marginLeft: 10, flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600' },
  participantDetail: { fontSize: 12 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  fareLabel: { fontSize: 14 },
  fareValue: { fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
