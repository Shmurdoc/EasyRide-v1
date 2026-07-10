import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth, useSocket, rides, sos, COLORS, SPACING, RADIUS, GRADIENTS, decodePolyline, scheduleLocalNotification, ProgressBar, Avatar } from '@easyryde/shared';
import type { Ride, DriverNav, DriverRoute } from '@easyryde/shared';
import type MapViewType from 'react-native-maps';

type RidePhase = 'to_pickup' | 'arrived' | 'in_progress' | 'completed';

export default function ActiveRideScreen({ route, navigation }: { route: DriverRoute<'ActiveRide'>; navigation: DriverNav }) {
  const { rideId, riderId } = route.params;
  const { token } = useAuth();
  const { isConnected, emit, on } = useSocket({ token: token || '' });
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [phase, setPhase] = useState<RidePhase>('to_pickup');
  const [tripProgress, setTripProgress] = useState(0);
  const [rideTimer, setRideTimer] = useState(0);
  const [sosActive, setSosActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapViewType>(null);

  useEffect(() => { loadRide(); }, [rideId]);

  useEffect(() => {
    if (!isConnected) return;
    const unsubs = [
      on('ride:started', (data: any) => {
        if (data.rideId === rideId) {
          loadRide();
          setPhase('in_progress');
          scheduleLocalNotification('Ride Started', 'The ride is now in progress. Drive safely!');
        }
      }),
      on('ride:cancelled', (data: any) => {
        if (data.rideId === rideId) {
          scheduleLocalNotification('Ride Cancelled', 'Rider cancelled the ride');
          Alert.alert('Ride Cancelled', 'Rider cancelled the ride');
          navigation.goBack();
        }
      }),
    ];
    return () => { unsubs.forEach(u => u()); };
  }, [isConnected]);

  useEffect(() => {
    if (!ride?.route_polyline) return;
    try {
      const decoded = decodePolyline(ride.route_polyline);
      setRouteCoords(decoded);
    } catch { console.warn('Failed to decode polyline'); }
  }, [ride?.route_polyline]);

  useEffect(() => {
    if (routeCoords.length === 0 || !ride) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: ride.pickup_latitude, longitude: ride.pickup_longitude },
          { latitude: ride.dropoff_latitude, longitude: ride.dropoff_longitude },
          ...routeCoords.slice(0, 1),
          ...routeCoords.slice(-1),
        ],
        { edgePadding: { top: 100, right: 50, bottom: 300, left: 50 }, animated: true },
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [routeCoords, ride]);

  useEffect(() => {
    if (phase !== 'in_progress') return;
    setRideTimer(0);
    timerRef.current = setInterval(() => {
      setRideTimer((prev) => prev + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'in_progress') return;
    const interval = setInterval(() => {
      setTripProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [phase]);

  async function loadRide() {
    try {
      const data = await rides.get(rideId);
      setRide(data);
      setLoadError(false);
      if (data.status === 'in_progress') setPhase('in_progress');
      else if (data.status === 'arrived') setPhase('arrived');
    } catch (err) {
      console.warn('Failed to load ride:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function markArrived() {
    if (!ride) return;
    rides.updateLocation(rideId, ride.pickup_latitude, ride.pickup_longitude);
    emit('driver:arrived', { rideId, riderId });
    setPhase('arrived');
  }

  function startTrip() {
    emit('ride:start', { rideId, otherUserId: riderId });
    setPhase('in_progress');
    setTripProgress(0);
  }

  function completeTrip() {
    if (timerRef.current) clearInterval(timerRef.current);
    emit('ride:complete', { rideId, otherUserId: riderId });
    Alert.alert('Ride Completed', 'Great job!', [{ text: 'OK', onPress: () => navigation.navigate('Main') }]);
  }

  function triggerSOS() {
    Alert.alert(
      'Emergency SOS',
      'This will alert emergency services and share your location. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              const location = await Location.getCurrentPositionAsync({});
              await sos.trigger({
                ride_id: rideId,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                message: 'Driver triggered SOS',
              });
              setSosActive(true);
              scheduleLocalNotification('SOS Sent', 'Emergency services have been notified');
              Alert.alert('SOS Sent', 'Help is on the way. Stay safe.');
            } catch (err) {
              Alert.alert('Error', 'Failed to send SOS. Please call emergency services directly.');
            }
          },
        },
      ]
    );
  }

  function formatTimer(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );

  if (loadError) return (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>Failed to load ride details</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); setLoadError(false); loadRide(); }}>
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (!ride) return null;

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={{ latitude: ride.pickup_latitude, longitude: ride.pickup_longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
        <Marker coordinate={{ latitude: ride.pickup_latitude, longitude: ride.pickup_longitude }} title="Pickup">
          <View style={styles.pickupMarker}>
            <View style={styles.pickupMarkerInner} />
          </View>
        </Marker>
        {ride.dropoff_latitude > 0 && (
          <Marker coordinate={{ latitude: ride.dropoff_latitude, longitude: ride.dropoff_longitude }} title="Dropoff">
            <View style={styles.destMarker}>
              <View style={styles.destMarkerInner} />
            </View>
          </Marker>
        )}
        {routeCoords.length > 0 && (
          <>
            <Polyline coordinates={routeCoords} strokeColor="#16a34a" strokeWidth={5} lineDashPhase={0} lineDashPattern={[10, 10]} />
            <Polyline coordinates={routeCoords} strokeColor="rgba(22,163,74,0.3)" strokeWidth={8} />
          </>
        )}
      </MapView>

      {phase === 'to_pickup' && (
        <>
          <LinearGradient colors={[COLORS.blue, '#2563eb']} style={styles.phaseHeader}>
            <Ionicons name="navigate" size={20} color="#fff" />
            <View style={styles.phaseHeaderInfo}>
              <Text style={styles.phaseHeaderTitle}>Head to pickup</Text>
              <Text style={styles.phaseHeaderSubtitle}>
                {ride.distance_km != null ? `${Number(ride.distance_km).toFixed(1)} km` : '2.1 km'} • {ride.duration_minutes != null ? `${ride.duration_minutes} min` : '4 min'}
              </Text>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={styles.sosButton}
            onPress={triggerSOS}
          >
            <Ionicons name="warning" size={16} color="#fff" />
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>

          <View style={styles.bottomPanel}>
            <View style={styles.passengerCard}>
              <View style={styles.passengerRow}>
                <Avatar name={ride.rider?.name || 'P'} size={52} />
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{ride.rider?.name || 'Passenger'}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#facc15" />
                    <Text style={styles.passengerRating}>{(ride.rider as any)?.rating || 4.8}</Text>
                  </View>
                </View>
                <View style={styles.passengerActions}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="call" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Chat', { rideId, receiverId: riderId })}>
                    <Ionicons name="chatbubble" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <View style={styles.locationDot} />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>PICKUP</Text>
                    <Text style={styles.locationName}>{ride.pickup_address}</Text>
                  </View>
                </View>
                <View style={[styles.locationRow, { marginTop: 10 }]}>
                  <View style={styles.locationPin}>
                    <Ionicons name="location" size={10} color={COLORS.primary} />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>DROPOFF</Text>
                    <Text style={styles.locationName}>{ride.dropoff_address}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={markArrived} activeOpacity={0.8}>
                <LinearGradient colors={[COLORS.success, COLORS.successLight]} style={styles.primaryBtnGradient}>
                  <Ionicons name="location" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>I've Arrived</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {phase === 'arrived' && (
        <>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.phaseHeader}>
            <View style={styles.arrivedIconCircle}>
              <Ionicons name="location" size={24} color={COLORS.surface} />
            </View>
            <View style={styles.phaseHeaderInfo}>
              <Text style={[styles.phaseHeaderTitle, { color: COLORS.surface }]}>You've Arrived!</Text>
              <Text style={[styles.phaseHeaderSubtitle, { color: 'rgba(28,28,30,0.8)' }]}>Waiting for {ride.rider?.name || 'Passenger'}</Text>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={styles.sosButton}
            onPress={triggerSOS}
          >
            <Ionicons name="warning" size={16} color="#fff" />
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>

          <View style={styles.bottomPanel}>
            <View style={styles.passengerCard}>
              <View style={styles.passengerRow}>
                <Avatar name={ride.rider?.name || 'P'} size={52} />
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{ride.rider?.name || 'Passenger'}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#facc15" />
                    <Text style={styles.passengerRating}>{(ride.rider as any)?.rating || 4.8}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.actionBtnLg}>
                  <Ionicons name="call" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={startTrip} activeOpacity={0.8}>
                <LinearGradient colors={[COLORS.success, COLORS.successLight]} style={styles.primaryBtnGradient}>
                  <Ionicons name="car" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Start Trip</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => Alert.alert('Cancel Ride', 'Are you sure?', [{ text: 'No', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: () => navigation.goBack() }])}>
                <Text style={styles.cancelBtnText}>Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {phase === 'in_progress' && (
        <>
          <LinearGradient colors={[COLORS.success, '#15803d']} style={styles.phaseHeader}>
            <Ionicons name="navigate" size={20} color="#fff" />
            <View style={styles.phaseHeaderInfo}>
              <Text style={styles.phaseHeaderTitle}>Trip in Progress</Text>
              <Text style={styles.phaseHeaderSubtitle}>{ride.distance_km != null ? `${Number(ride.distance_km).toFixed(1)}` : '?'} km • {ride.duration_minutes != null ? `${ride.duration_minutes}` : '?'} min</Text>
            </View>
            <View style={styles.timerBadge}>
              <Ionicons name="time" size={12} color="#fff" />
              <Text style={styles.timerText}>{formatTimer(rideTimer)}</Text>
            </View>
            <View style={styles.trackingBadge}>
              <Text style={styles.trackingText}>TRACKING</Text>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={[styles.sosButton, sosActive && styles.sosButtonActive]}
            onPress={triggerSOS}
            disabled={sosActive}
          >
            <Ionicons name="warning" size={16} color="#fff" />
            <Text style={styles.sosButtonText}>{sosActive ? 'SOS ACTIVE' : 'SOS'}</Text>
          </TouchableOpacity>

          <View style={styles.bottomPanel}>
            <View style={styles.passengerCard}>
              <View style={styles.passengerRow}>
                <Avatar name={ride.rider?.name || 'P'} size={44} />
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{ride.rider?.name || 'Passenger'}</Text>
                  <Text style={styles.destinationSmall}>{ride.dropoff_address}</Text>
                </View>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="call" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Trip Progress</Text>
                  <Text style={styles.progressValue}>{tripProgress}%</Text>
                </View>
                <ProgressBar progress={tripProgress / 100} color={COLORS.success} />
              </View>

              <View style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <View style={styles.locationDot} />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>PICKUP</Text>
                    <Text style={styles.locationName}>{ride.pickup_address}</Text>
                  </View>
                </View>
                <View style={[styles.locationRow, { marginTop: 10 }]}>
                  <View style={styles.locationPin}>
                    <Ionicons name="location" size={10} color={COLORS.primary} />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>DROPOFF</Text>
                    <Text style={styles.locationName}>{ride.dropoff_address}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Trip Fare</Text>
                <Text style={styles.fareValue}>R{(ride as any).total_fare?.toFixed(0) || '0'}</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={completeTrip} activeOpacity={0.8}>
                <LinearGradient colors={[COLORS.success, COLORS.successLight]} style={styles.primaryBtnGradient}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Complete Trip</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  map: { flex: 1 },
  centerContainer: { flex: 1, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', padding: SPACING.base },
  errorText: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS.success, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  pickupMarker: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.successGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  pickupMarkerInner: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.success,
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  destMarker: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.blue,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  destMarkerInner: {},

  phaseHeader: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.base,
    paddingTop: 20, gap: 12,
  },
  phaseHeaderInfo: { flex: 1 },
  phaseHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  phaseHeaderSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  arrivedIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(28,28,30,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  trackingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  trackingText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  timerText: { fontSize: 13, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },

  sosButton: {
    position: 'absolute', top: 80, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.error, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: COLORS.error, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
    zIndex: 10,
  },
  sosButtonActive: {
    backgroundColor: COLORS.error,
    shadowOpacity: 0.8, shadowRadius: 12,
  },
  sosButtonText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(28,28,30,0.95)',
    borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING.base, paddingBottom: 32,
  },

  passengerCard: { gap: 12 },
  passengerRow: { flexDirection: 'row', alignItems: 'center' },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  passengerRating: { fontSize: 12, color: '#fff' },
  destinationSmall: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  passengerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnLg: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },

  locationCard: { backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.md, padding: SPACING.md, gap: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  locationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginTop: 5, marginRight: 10 },
  locationPin: {
    width: 20, height: 20, borderRadius: 6, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  locationName: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 2 },

  progressSection: { marginVertical: 4 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, color: COLORS.textMuted },
  progressValue: { fontSize: 12, fontWeight: '700', color: COLORS.success },

  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: 14, color: COLORS.textMuted },
  fareValue: { fontSize: 22, fontWeight: '700', color: '#fff' },

  primaryBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  primaryBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, gap: 8,
  },
  primaryBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.errorLight },
});
