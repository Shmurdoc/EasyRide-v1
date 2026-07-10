import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, Text, SafeAreaView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useSocket, drivers, scheduleLocalNotification, COLORS, SPACING, RADIUS, Avatar } from '@easyryde/shared';
import type { DriverNav } from '@easyryde/shared';

type Request = {
  rideId: string;
  riderId: string;
  type: string;
  price: number;
  distance: string;
  duration: string;
  pickup: { name: string; address: string };
  destination: { name: string; address: string };
  passenger: { name: string; rating: number };
  timestamp: number;
};

type Trip = {
  id: string;
  pickup: string;
  dropoff: string;
  fare: number;
  time: string;
  distance: string;
};

// FIX BUG 4: Removed hardcoded MOCK_TRIPS. Trips are now fetched from the API.

export default function RideRequestsScreen({ navigation }: { navigation: DriverNav }) {
  const { token } = useAuth();
  const { isConnected, on, emit } = useSocket({ token: token || '' });
  const [requests, setRequests] = useState<Request[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => { loadTrips(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRequests((prev) => {
        const now = Date.now();
        const expired = prev.filter((r) => now - r.timestamp > 15000);
        if (expired.length > 0) {
          expired.forEach((r) => scheduleLocalNotification('Request Expired', `${r.passenger.name}'s request expired`));
        }
        return prev.filter((r) => now - r.timestamp <= 15000);
      });
      forceUpdate((n) => n + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadTrips() {
    try {
      const data = await drivers.trips();
      setTrips(
        (data.data || []).map((r: any) => ({
          id: r.id,
          pickup: r.pickup_address || 'Pickup',
          dropoff: r.dropoff_address || 'Dropoff',
          fare: r.total_fare || 0,
          time: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          distance: r.distance_km ? `${r.distance_km.toFixed(1)} km` : '? km',
        }))
      );
    } catch (err) {
      console.warn('Failed to load trips:', err);
    }
  }

  useEffect(() => {
    const unsub = on('ride:request', (data: any) => {
      const request: Request = {
        rideId: data.rideId,
        riderId: data.riderId,
        type: data.category || 'EasyRyde',
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

  const declineRide = (rideId: string) => {
    setRequests((prev) => prev.filter((r) => r.rideId !== rideId));
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderRequestItem = ({ item }: { item: Request }) => {
    const elapsed = Math.floor((Date.now() - item.timestamp) / 1000);
    const remaining = Math.max(0, 15 - elapsed);
    const progress = remaining / 15;
    const isUrgent = remaining <= 5;

    return (
      <View style={styles.requestCard}>
        <View style={styles.countdownBar}>
          <LinearGradient
            colors={isUrgent ? [COLORS.error, COLORS.errorLight] : [COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.countdownFill, { width: `${progress * 100}%` }]}
          />
        </View>

        <View style={styles.requestHeader}>
          <View style={styles.rideTypeBadge}>
            <Text style={styles.rideTypeText}>{item.type}</Text>
          </View>
          <View style={styles.requestPriceContainer}>
            <Text style={styles.requestPrice}>R{item.price.toFixed(0)}</Text>
            <Text style={styles.requestDistance}>{item.distance} • {item.duration}</Text>
          </View>
        </View>

        <View style={styles.passengerRow}>
          <Avatar name={item.passenger.name} size={44} />
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{item.passenger.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#facc15" />
              <Text style={styles.passengerRating}>{item.passenger.rating}</Text>
            </View>
          </View>
          <View style={[styles.countdownContainer, isUrgent && styles.countdownContainerUrgent]}>
            <Ionicons name="time" size={14} color={isUrgent ? COLORS.errorLight : COLORS.primary} />
            <Text style={[styles.countdownText, isUrgent && styles.countdownTextUrgent]}>
              {remaining}s
            </Text>
          </View>
        </View>

        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationName}>{item.pickup.name}</Text>
              <Text style={styles.locationAddress}>{item.pickup.address}</Text>
            </View>
          </View>
          <View style={styles.locationConnector} />
          <View style={styles.locationRow}>
            <View style={styles.locationPin}>
              <Ionicons name="location" size={10} color={COLORS.primary} />
            </View>
            <View style={styles.locationInfo}>
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
            <LinearGradient colors={[COLORS.success, COLORS.successLight]} style={styles.acceptBtnGradient}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
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
          <View style={styles.tripPin}>
            <Ionicons name="location" size={10} color="#FFAD7A" />
          </View>
          <Text style={styles.tripLocationText}>{item.dropoff}</Text>
        </View>
      </View>
      <View style={styles.tripFooter}>
        <Text style={styles.tripDistance}>{item.distance}</Text>
        <View style={styles.tripCompletedBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
          <Text style={styles.tripCompletedText}>Completed</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.headerGradient}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            {activeTab === 'requests' ? 'Ride Requests' : "Today's Rides"}
          </Text>
          <Ionicons name={activeTab === 'requests' ? 'car' : 'time'} size={24} color="rgba(255,255,255,0.6)" />
        </View>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'requests'
            ? `${requests.length} pending request${requests.length !== 1 ? 's' : ''}`
            : `${trips.length} trips completed`}
        </Text>
      </LinearGradient>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'requests' ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.rideId}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="car-outline" size={48} color={COLORS.textDim} />
              </View>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtext}>Go online to start receiving ride requests</Text>
            </View>
          }
          renderItem={renderRequestItem}
        />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderTripItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerGradient: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'],
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  tabBar: {
    flexDirection: 'row', marginHorizontal: SPACING.base, marginTop: SPACING.base, marginBottom: 8,
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm },
  tabActive: { backgroundColor: COLORS.success },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.white },

  listContent: { padding: SPACING.base, paddingBottom: 100 },

  requestCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.base,
    borderWidth: 2, borderColor: COLORS.primary, marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  countdownBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: COLORS.surfaceLight,
  },
  countdownFill: {
    height: '100%',
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rideTypeBadge: {
    backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  rideTypeText: { fontSize: 12, fontWeight: '700', color: COLORS.surface },
  requestPriceContainer: { alignItems: 'flex-end' },
  requestPrice: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  requestDistance: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  passengerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  passengerRating: { fontSize: 12, color: COLORS.white },
  countdownContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  countdownContainerUrgent: {
    backgroundColor: COLORS.errorGlow,
  },
  countdownText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  countdownTextUrgent: { color: COLORS.errorLight },

  locationSection: { marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  locationDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success,
    marginTop: 5, marginRight: 10,
  },
  locationPin: {
    width: 20, height: 20, borderRadius: 6, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  locationName: { fontSize: 14, fontWeight: '600', color: COLORS.white, marginTop: 2 },
  locationAddress: { fontSize: 12, color: COLORS.textDim, marginTop: 1 },
  locationConnector: { width: 1, height: 8, backgroundColor: COLORS.surfaceLight, marginLeft: 3.5, marginBottom: 4 },

  requestActions: { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorGlow,
  },
  declineBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.errorLight },
  acceptBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  acceptBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, gap: 6,
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  tripCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.base,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tripTime: { fontSize: 12, color: COLORS.textMuted },
  tripFare: { fontSize: 16, fontWeight: '700', color: COLORS.success },
  tripLocations: { gap: 6, marginBottom: 10 },
  tripLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  tripPin: {
    width: 16, height: 16, borderRadius: 4, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  tripLocationText: { fontSize: 13, color: COLORS.white },
  tripFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder, paddingTop: 10,
  },
  tripDistance: { fontSize: 12, color: COLORS.textMuted },
  tripCompletedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripCompletedText: { fontSize: 12, color: COLORS.success },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.white, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
