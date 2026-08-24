import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, Text, SafeAreaView, TouchableOpacity, RefreshControl, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useSocket, drivers, scheduleLocalNotification, Avatar, useTheme } from '@easyryde/shared';
import type { DriverNav } from '@easyryde/shared';

type Request = {
  rideId: string; riderId: string; type: string; price: number;
  distance: string; duration: string;
  pickup: { name: string; address: string };
  destination: { name: string; address: string };
  passenger: { name: string; rating: number };
  timestamp: number;
};

type Trip = { id: string; pickup: string; dropoff: string; fare: number; time: string; distance: string };

export default function RideRequestsScreen({ navigation }: { navigation: DriverNav }) {
  const { token } = useAuth();
  const { isConnected, on, emit } = useSocket({ token: token || '' });
  const [requests, setRequests] = useState<Request[]>([]);
  const requestsRef = useRef<Request[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [, forceUpdate] = useState(0);
  const { colors, radius, spacing, shadows } = useTheme();
  const ORANGE_GRADIENT: [string, string] = [colors.brand, colors.brandStrong];
  const GREEN_GRADIENT: [string, string] = [colors.brand, colors.brandStrong];
  const styles = makeStyles(colors, spacing, radius, shadows);

  useEffect(() => { loadTrips(); }, []);

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const expired = requestsRef.current.filter((r) => now - r.timestamp > 15000);
      expired.forEach((r) => scheduleLocalNotification('Request Expired', `${r.passenger.name}'s request expired`));
      setRequests((prev) => prev.filter((r) => now - r.timestamp <= 15000));
      forceUpdate((n) => n + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadTrips() {
    try {
      const data = await drivers.trips();
      setTrips((data.data || []).map((r: any) => ({
        id: r.id, pickup: r.pickup_address || 'Pickup', dropoff: r.dropoff_address || 'Dropoff',
        fare: r.total_fare || 0,
        time: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        distance: r.distance_km ? `${r.distance_km.toFixed(1)} km` : '? km',
      })));
    } catch (err) { console.warn('Failed to load trips:', err); }
  }

  useEffect(() => {
    const unsub = on('ride:request', (data: any) => {
      const request: Request = {
        rideId: data.rideId, riderId: data.riderId, type: data.category || 'EasyRyde',
        price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 85,
        distance: data.distance != null ? `${Number(data.distance).toFixed(1)} km` : '2.4 km',
        duration: data.duration != null ? `${data.duration} min` : '15 min',
        pickup: { name: data.pickupName || 'Pickup', address: data.pickupAddress || 'Pickup location' },
        destination: { name: data.destName || 'Destination', address: data.destAddress || 'Destination' },
        passenger: { name: data.riderName || 'Passenger', rating: data.riderRating || 4.8 },
        timestamp: Date.now(),
      };
      setRequests((prev) => prev.find((r) => r.rideId === data.rideId) ? prev : [request, ...prev]);
      scheduleLocalNotification('New Ride Request', `${request.type} - ${request.distance} away`, { rideId: request.rideId });
    });
    return () => unsub();
  }, [on]);

  const acceptRide = (request: Request) => {
    emit('driver:accept-ride', { rideId: request.rideId, riderId: request.riderId });
    setRequests((prev) => prev.filter((r) => r.rideId !== request.rideId));
    navigation.navigate('ActiveRide', { rideId: request.rideId, riderId: request.riderId });
  };

  const declineRide = (rideId: string) => { setRequests((prev) => prev.filter((r) => r.rideId !== rideId)); };
  const onRefresh = useCallback(() => { setRefreshing(true); loadTrips().finally(() => setRefreshing(false)); }, []);

  const renderRequestItem = ({ item }: { item: Request }) => {
    const elapsed = Math.floor((Date.now() - item.timestamp) / 1000);
    const remaining = Math.max(0, 15 - elapsed);
    const progress = remaining / 15;
    const isUrgent = remaining <= 5;

    return (
      <View style={[styles.requestCard, isUrgent && styles.requestCardUrgent]}>
        <View style={styles.countdownTrack}>
           <LinearGradient colors={isUrgent ? [colors.danger, colors.danger] : ORANGE_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.countdownFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.requestCardTop}>
          <View style={styles.rideTypeBadge}>
            <Text style={styles.rideTypeText}>{item.type}</Text>
          </View>
          <View style={styles.requestPriceArea}>
            <Text style={styles.requestPrice}>R{item.price.toFixed(0)}</Text>
            <Text style={styles.requestMeta}>{item.distance} - {item.duration}</Text>
          </View>
        </View>
        <View style={styles.riderRow}>
          <Avatar name={item.passenger.name} size={48} />
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>{item.passenger.name}</Text>
            <View style={styles.riderRatingRow}>
              <Ionicons name="star" size={12} color={colors.warning} />
              <Text style={styles.riderRating}>{item.passenger.rating}</Text>
            </View>
          </View>
          <View style={[styles.countdownTag, isUrgent && styles.countdownTagUrgent]}>
            <Ionicons name="time" size={14} color={isUrgent ? colors.danger : colors.brand} />
            <Text style={[styles.countdownTagText, isUrgent && styles.countdownTagTextUrgent]}>{remaining}s</Text>
          </View>
        </View>
        <View style={styles.locationSection}>
          <View style={styles.locationBlock}>
            <View style={styles.locationDot} />
            <View>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationName}>{item.pickup.name}</Text>
              <Text style={styles.locationAddress}>{item.pickup.address}</Text>
            </View>
          </View>
          <View style={styles.locationLine} />
          <View style={styles.locationBlock}>
            <View style={styles.locationPin}>
              <Ionicons name="location" size={10} color={colors.brand} />
            </View>
            <View>
              <Text style={styles.locationLabel}>DROPOFF</Text>
              <Text style={styles.locationName}>{item.destination.name}</Text>
              <Text style={styles.locationAddress}>{item.destination.address}</Text>
            </View>
          </View>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity style={styles.declineBtn} onPress={() => declineRide(item.rideId)}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRide(item)} activeOpacity={0.8}>
            <LinearGradient colors={GREEN_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptBtnGrad}>
              <Ionicons name="checkmark-circle" size={18} color={colors.brandContrast} />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTripItem = ({ item }: { item: Trip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripTime}>{item.time}</Text>
        <Text style={styles.tripFare}>R{item.fare.toFixed(0)}</Text>
      </View>
      <View style={styles.tripLocations}>
        <View style={styles.tripLocationRow}>
          <View style={styles.tripDot} />
          <Text style={styles.tripLocationText}>{item.pickup}</Text>
        </View>
        <View style={styles.tripLocationRow}>
          <View style={styles.tripPinWrap}>
            <Ionicons name="location" size={10} color={colors.brand} />
          </View>
          <Text style={styles.tripLocationText}>{item.dropoff}</Text>
        </View>
      </View>
      <View style={styles.tripFooter}>
        <Text style={styles.tripDistance}>{item.distance}</Text>
        <View style={styles.tripCompletedBadge}>
          <Ionicons name="checkmark-circle" size={12} color={colors.success} />
          <Text style={styles.tripCompletedText}>Completed</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{activeTab === 'requests' ? 'Ride Requests' : "Today's Rides"}</Text>
        </View>
        <Text style={styles.headerSubtext}>
          {activeTab === 'requests' ? `${requests.length} pending request${requests.length !== 1 ? 's' : ''}` : `${trips.length} trips completed`}
        </Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'requests' && styles.tabActive]} onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>Requests ({requests.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.tabActive]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'requests' ? (
        <FlatList data={requests} keyExtractor={(item) => item.rideId} contentContainerStyle={styles.listContent}
           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}><Ionicons name="car-outline" size={48} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtext}>Go online to start receiving ride requests</Text>
            </View>
          }
          renderItem={renderRequestItem}
        />
      ) : (
        <FlatList data={trips} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} renderItem={renderTripItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}><Ionicons name="time-outline" size={48} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptySubtext}>Completed rides will appear here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, spacing: any, radius: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerSection: { paddingHorizontal: spacing.base, paddingTop: 16, paddingBottom: spacing.base },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  headerSubtext: { fontSize: 14, fontWeight: '400', color: colors.textMuted, marginTop: 4 },

  tabBar: { flexDirection: 'row', marginHorizontal: spacing.base, marginBottom: spacing.sm, backgroundColor: colors.border, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.success },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.text },

  listContent: { padding: spacing.base, paddingBottom: 100 },

  requestCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.base, borderWidth: 1, borderColor: colors.brand, marginBottom: spacing.md, overflow: 'hidden', ...shadows.card },
  requestCardUrgent: { borderColor: colors.danger },
  countdownTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.border },
  countdownFill: { height: '100%' },
  requestCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  rideTypeBadge: { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  rideTypeText: { fontSize: 12, fontWeight: '700', color: colors.brandContrast },
  requestPriceArea: { alignItems: 'flex-end' },
  requestPrice: { fontSize: 24, fontWeight: '800', color: colors.brand },
  requestMeta: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },

  riderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  riderInfo: { flex: 1, marginLeft: spacing.md },
  riderName: { fontSize: 15, fontWeight: '700', color: colors.text },
  riderRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  riderRating: { fontSize: 12, fontWeight: '500', color: colors.text },

  countdownTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  countdownTagUrgent: { backgroundColor: 'rgba(220,38,38,0.15)' },
  countdownTagText: { fontSize: 13, fontWeight: '700', color: colors.brand },
  countdownTagTextUrgent: { color: colors.danger },

  locationSection: { marginBottom: spacing.md },
  locationBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  locationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginTop: 5 },
  locationPin: { width: 20, height: 20, borderRadius: radius.xs, backgroundColor: colors.brandSoft, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  locationName: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 2 },
  locationAddress: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 1 },
  locationLine: { width: 1, height: 8, backgroundColor: colors.border, marginLeft: 3.5, marginBottom: 4 },

  requestActions: { flexDirection: 'row', gap: spacing.md },
  declineBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceLight },
  declineBtnText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  acceptBtn: { flex: 1, borderRadius: radius.md, overflow: 'hidden' },
  acceptBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 6 },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: colors.brandContrast },

  tripCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  tripTime: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  tripFare: { fontSize: 16, fontWeight: '700', color: colors.success },
  tripLocations: { gap: 6, marginBottom: spacing.md },
  tripLocationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  tripPinWrap: { width: 16, height: 16, borderRadius: radius.xs, backgroundColor: colors.brandSoft, justifyContent: 'center', alignItems: 'center' },
  tripLocationText: { fontSize: 13, fontWeight: '400', color: colors.text },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  tripDistance: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  tripCompletedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripCompletedText: { fontSize: 12, fontWeight: '600', color: colors.success },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, fontWeight: '400', color: colors.textMuted, textAlign: 'center' },
});