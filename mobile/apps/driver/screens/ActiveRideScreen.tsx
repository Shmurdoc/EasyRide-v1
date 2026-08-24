import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, TouchableOpacity, Animated, SafeAreaView, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth, useSocket, rides, sos, decodePolyline, scheduleLocalNotification, ProgressBar, Avatar, useTheme } from '@easyryde/shared';
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
  const sosPulse = useRef(new Animated.Value(1)).current;
  const { colors, radius, spacing, shadows } = useTheme();
  const ORANGE_GRADIENT: [string, string] = [colors.brand, colors.brandStrong];
  const GREEN_GRADIENT: [string, string] = [colors.brand, colors.brandStrong];
  const styles = makeStyles(colors, spacing, radius, shadows);

  useEffect(() => {
    const sos = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        Animated.timing(sosPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    sos.start();
    return () => sos.stop();
  }, []);

  useEffect(() => { loadRide(); }, [rideId]);

  useEffect(() => {
    if (!isConnected) return;
    const unsubs = [
      on('ride:started', (data: any) => { if (data.rideId === rideId) { loadRide(); setPhase('in_progress'); scheduleLocalNotification('Ride Started', 'The ride is now in progress. Drive safely!'); } }),
      on('ride:cancelled', (data: any) => { if (data.rideId === rideId) { scheduleLocalNotification('Ride Cancelled', 'Rider cancelled the ride'); Alert.alert('Ride Cancelled', 'Rider cancelled the ride'); navigation.goBack(); } }),
    ];
    return () => { unsubs.forEach(u => u()); };
  }, [isConnected]);

  useEffect(() => { if (!ride?.route_polyline) return; try { setRouteCoords(decodePolyline(ride.route_polyline)); } catch { console.warn('Failed to decode polyline'); } }, [ride?.route_polyline]);

  useEffect(() => {
    if (routeCoords.length === 0 || !ride) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [{ latitude: ride.pickup_latitude, longitude: ride.pickup_longitude }, { latitude: ride.dropoff_latitude, longitude: ride.dropoff_longitude }, ...routeCoords.slice(0, 1), ...routeCoords.slice(-1)],
        { edgePadding: { top: 100, right: 50, bottom: 300, left: 50 }, animated: true },
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [routeCoords, ride]);

  useEffect(() => {
    if (phase !== 'in_progress') return;
    setRideTimer(0);
    timerRef.current = setInterval(() => setRideTimer((prev) => prev + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'in_progress' || !ride) return;
    const pickup = { latitude: ride.pickup_latitude, longitude: ride.pickup_longitude };
    const dropoff = { latitude: ride.dropoff_latitude, longitude: ride.dropoff_longitude };
    const totalDistance = haversineKm(pickup, dropoff);
    if (totalDistance <= 0) return;

    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 50 },
          (loc) => {
            const fromPickup = haversineKm(pickup, { latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            setTripProgress(Math.min(Math.round((fromPickup / totalDistance) * 100), 100));
          },
        );
      } catch (err) {
        console.warn('Failed to watch position for progress:', err);
      }
    })();
    return () => { if (subscription) subscription.remove(); };
  }, [phase, ride]);

  async function loadRide() { try { const data = await rides.get(rideId); setRide(data); setLoadError(false); if (data.status === 'in_progress') setPhase('in_progress'); else if (data.status === 'arrived') setPhase('arrived'); } catch (err) { console.warn('Failed to load ride:', err); setLoadError(true); } finally { setLoading(false); } }

  function markArrived() { if (!ride) return; rides.updateLocation(rideId, ride.pickup_latitude, ride.pickup_longitude); emit('driver:arrived', { rideId, riderId }); setPhase('arrived'); }
  function startTrip() { emit('ride:start', { rideId, otherUserId: riderId }); setPhase('in_progress'); setTripProgress(0); }
  function completeTrip() { if (timerRef.current) clearInterval(timerRef.current); emit('ride:complete', { rideId, otherUserId: riderId, fare: ride?.total_fare }); Alert.alert('Ride Completed', 'Great job!', [{ text: 'OK', onPress: () => navigation.navigate('Main') }]); }

  function triggerSOS() {
    Alert.alert('Emergency SOS', 'This will alert emergency services and share your location. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send SOS', style: 'destructive', onPress: async () => { try { const location = await Location.getCurrentPositionAsync({}); await sos.trigger({ ride_id: rideId, latitude: location.coords.latitude, longitude: location.coords.longitude, message: 'Driver triggered SOS' }); setSosActive(true); scheduleLocalNotification('SOS Sent', 'Emergency services have been notified'); Alert.alert('SOS Sent', 'Help is on the way. Stay safe.'); } catch (err) { Alert.alert('Error', 'Failed to send SOS. Please call emergency services directly.'); } } },
    ]);
  }

  function formatTimer(seconds: number): string { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; }

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.success} /></View>;
  if (loadError) return <View style={styles.centerContainer}><Text style={styles.errorText}>Failed to load ride details</Text><TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); setLoadError(false); loadRide(); }}><Text style={styles.retryBtnText}>Retry</Text></TouchableOpacity></View>;
  if (!ride) return null;

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={{ latitude: ride.pickup_latitude, longitude: ride.pickup_longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
        <Marker coordinate={{ latitude: ride.pickup_latitude, longitude: ride.pickup_longitude }} title="Pickup">
          <View style={styles.pickupMarker}>
            <View style={styles.pickupMarkerInner} />
          </View>
        </Marker>
        {ride.dropoff_latitude != null && (
          <Marker coordinate={{ latitude: ride.dropoff_latitude, longitude: ride.dropoff_longitude }} title="Dropoff">
            <View style={styles.destMarker}>
              <View style={styles.destMarkerInner} />
            </View>
          </Marker>
        )}
        {routeCoords.length > 0 && (
          <>
            <Polyline coordinates={routeCoords} strokeColor={colors.brand} strokeWidth={5} lineDashPhase={0} lineDashPattern={[10, 10]} />
            <Polyline coordinates={routeCoords} strokeColor="rgba(255,106,0,0.3)" strokeWidth={8} />
          </>
        )}
      </MapView>

        {phase === 'to_pickup' && (
        <>
          <SafeAreaView style={styles.topOverlay}>
            <View style={styles.phaseTopBar}>
              <View style={styles.phaseIcon}>
                <Ionicons name="navigate" size={20} color={colors.brand} />
              </View>
              <View style={styles.phaseInfo}>
                <Text style={styles.phaseTitle}>Head to pickup</Text>
                <Text style={styles.phaseSubtitle}>{ride.distance_km != null ? `${Number(ride.distance_km).toFixed(1)} km` : '2.1 km'} - {ride.duration_minutes != null ? `${ride.duration_minutes} min` : '4 min'}</Text>
              </View>
              <View style={styles.phaseETA}>
                <Text style={styles.phaseETALabel}>ETA</Text>
                <Text style={styles.phaseETAValue}>{ride.duration_minutes || 4}min</Text>
              </View>
            </View>
            <View style={styles.pickupCard}>
              <View style={styles.pickupRow}>
                <View style={styles.pickupSmallDot} />
                <Text style={styles.pickupText}>{ride.pickup_address}</Text>
              </View>
              <View style={styles.pickupRow}>
                <Ionicons name="location" size={14} color={colors.brand} />
                <Text style={styles.pickupText}>{ride.dropoff_address}</Text>
              </View>
            </View>
          </SafeAreaView>
          <Animated.View style={[styles.sosFloat, { transform: [{ scale: sosPulse }] }]}>
            <TouchableOpacity style={styles.sosBtn} onPress={triggerSOS} testID="sos-button">
              <Ionicons name="warning" size={18} color={colors.white} />
            </TouchableOpacity>
          </Animated.View>
          <SafeAreaView style={styles.bottomOverlay}>
            <View style={styles.riderCard}>
              <View style={styles.riderCardRow}>
                <Avatar name={ride.rider?.name || 'P'} size={52} />
                <View style={styles.riderCardInfo}>
                  <Text style={styles.riderCardName}>{ride.rider?.name || 'Passenger'}</Text>
                  <View style={styles.riderRatingRow}>
                    <Ionicons name="star" size={12} color={colors.warning} />
                    <Text style={styles.riderCardRating}>{(ride.rider as any)?.rating || 4.8}</Text>
                  </View>
                </View>
                <View style={styles.riderActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => ride.rider && Linking.openURL(`tel:${(ride.rider as any).phone || ''}`)}>
                    <Ionicons name="call" size={18} color={colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Chat', { rideId, receiverId: riderId })}>
                    <Ionicons name="chatbubble" size={18} color={colors.success} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={markArrived} activeOpacity={0.8}>
                <LinearGradient colors={GREEN_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryActionGrad}>
                  <Ionicons name="location" size={20} color={colors.brandContrast} />
                  <Text style={styles.primaryActionText}>I've Arrived</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </>
      )}

      {phase === 'arrived' && (
        <>
          <SafeAreaView style={styles.topOverlay}>
            <View style={[styles.phaseTopBar, { backgroundColor: colors.success }]}>
              <View style={styles.arrivedIconCircle}>
                <Ionicons name="checkmark-circle" size={28} color={colors.white} />
              </View>
              <View style={styles.phaseInfo}>
                <Text style={[styles.phaseTitle, { color: colors.white }]}>You've Arrived!</Text>
                <Text style={[styles.phaseSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Waiting for {ride.rider?.name || 'Passenger'}</Text>
              </View>
            </View>
          </SafeAreaView>
          <Animated.View style={[styles.sosFloat, { transform: [{ scale: sosPulse }] }]}>
            <TouchableOpacity style={styles.sosBtn} onPress={triggerSOS} testID="sos-button">
              <Ionicons name="warning" size={18} color={colors.white} />
            </TouchableOpacity>
          </Animated.View>
          <SafeAreaView style={styles.bottomOverlay}>
            <View style={styles.riderCard}>
              <View style={styles.riderCardRow}>
                <Avatar name={ride.rider?.name || 'P'} size={52} />
                <View style={styles.riderCardInfo}>
                  <Text style={styles.riderCardName}>{ride.rider?.name || 'Passenger'}</Text>
                  <View style={styles.riderRatingRow}>
                    <Ionicons name="star" size={12} color={colors.warning} />
                    <Text style={styles.riderCardRating}>{(ride.rider as any)?.rating || 4.8}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.actionBtnLg} onPress={() => ride.rider && Linking.openURL(`tel:${(ride.rider as any).phone || ''}`)}>
                  <Ionicons name="call" size={20} color={colors.success} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={startTrip} activeOpacity={0.8}>
                <LinearGradient colors={ORANGE_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryActionGrad}>
                  <Ionicons name="car" size={20} color={colors.brandContrast} />
                  <Text style={[styles.primaryActionText, { color: colors.brandContrast }]}>Start Trip</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => Alert.alert('Cancel Ride', 'Are you sure?', [{ text: 'No', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: () => navigation.goBack() }])}>
                <Text style={styles.cancelBtnText}>Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </>
      )}

      {phase === 'in_progress' && (
        <>
          <SafeAreaView style={styles.topOverlay}>
            <LinearGradient colors={[colors.brand, colors.brandStrong] as const} style={styles.tripTopBar}>
              <View style={styles.tripTopRow}>
                <View>
                  <Text style={styles.tripStatusLabel}>TRIP IN PROGRESS</Text>
                  <Text style={styles.tripEtaValue}>{ride.duration_minutes || '?'} min</Text>
                </View>
                <View style={styles.tripFareCol}>
                  <Text style={styles.tripFareColLabel}>FARE</Text>
                  <Text style={styles.tripFareColValue}>R{(ride as any).total_fare?.toFixed(0) || '0'}</Text>
                </View>
              </View>
              <View style={styles.tripTimerRow}>
                <Ionicons name="time" size={14} color={colors.brandContrast} />
                <Text style={styles.tripTimerText}>{formatTimer(rideTimer)}</Text>
              </View>
            </LinearGradient>
            <View style={styles.tripRouteCard}>
              <View style={styles.tripRouteItem}>
                <View style={styles.tripRouteDot} />
                <Text style={styles.tripRouteText}>{ride.pickup_address}</Text>
              </View>
              <View style={styles.tripRouteDash} />
              <View style={styles.tripRouteItem}>
                <Ionicons name="location" size={14} color={colors.brand} />
                <Text style={styles.tripRouteText}>{ride.dropoff_address}</Text>
              </View>
            </View>
          </SafeAreaView>
          <Animated.View style={[styles.sosFloat, { transform: [{ scale: sosPulse }] }]}>
            <TouchableOpacity style={[styles.sosBtn, sosActive && styles.sosBtnActive]} onPress={triggerSOS} disabled={sosActive} testID="sos-button">
              <Ionicons name="warning" size={18} color={colors.white} />
              <Text style={styles.sosBtnText}>{sosActive ? 'ACTIVE' : 'SOS'}</Text>
            </TouchableOpacity>
          </Animated.View>
          <SafeAreaView style={styles.bottomOverlay}>
            <View style={styles.riderCard}>
              <View style={styles.riderCardRow}>
                <Avatar name={ride.rider?.name || 'P'} size={44} />
                <View style={styles.riderCardInfo}>
                  <Text style={styles.riderCardName}>{ride.rider?.name || 'Passenger'}</Text>
                  <Text style={styles.riderDestText}>{ride.dropoff_address}</Text>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={() => ride.rider && Linking.openURL(`tel:${(ride.rider as any).phone || ''}`)}>
                  <Ionicons name="call" size={18} color={colors.success} />
                </TouchableOpacity>
              </View>
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Trip Progress</Text>
                  <Text style={styles.progressValue}>{tripProgress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <LinearGradient colors={GREEN_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${tripProgress}%` }]} />
                </View>
              </View>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={completeTrip} activeOpacity={0.8}>
                <LinearGradient colors={GREEN_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryActionGrad}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.brandContrast} />
                  <Text style={styles.primaryActionText}>Complete Trip</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const A = sinLat * sinLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
}

const makeStyles = (colors: any, spacing: any, radius: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  centerContainer: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: spacing.base },
  errorText: { fontSize: 16, fontWeight: '500', color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: colors.success, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },

  pickupMarker: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,106,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickupMarkerInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, borderWidth: 3, borderColor: colors.white, ...shadows.brand },
  destMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.white },
  destMarkerInner: {},

  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },

  phaseTopBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.base, paddingTop: 48, paddingBottom: spacing.base, gap: spacing.md },
  phaseIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, justifyContent: 'center', alignItems: 'center' },
  phaseInfo: { flex: 1 },
  phaseTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  phaseSubtitle: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
  phaseETA: { alignItems: 'center' },
  phaseETALabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  phaseETAValue: { fontSize: 18, fontWeight: '800', color: colors.brand, marginTop: 2 },

  arrivedIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  pickupCard: { backgroundColor: colors.surfaceLight, padding: spacing.md, gap: spacing.md },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pickupSmallDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  pickupText: { fontSize: 14, fontWeight: '600', color: colors.text },

  tripTopBar: { paddingHorizontal: spacing.base, paddingTop: 48, paddingBottom: spacing.sm },
  tripTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripStatusLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  tripEtaValue: { fontSize: 28, fontWeight: '800', color: colors.brandContrast, marginTop: 4 },
  tripFareCol: { alignItems: 'flex-end' },
  tripFareColLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  tripFareColValue: { fontSize: 22, fontWeight: '800', color: colors.brandContrast, marginTop: 4 },
  tripTimerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  tripTimerText: { fontSize: 14, fontWeight: '700', color: colors.brandContrast },

  tripRouteCard: { backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
  tripRouteItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tripRouteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  tripRouteDash: { marginLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.border, borderStyle: 'dashed', height: 12 },
  tripRouteText: { fontSize: 14, fontWeight: '600', color: colors.text },

  sosFloat: { position: 'absolute', top: 160, right: spacing.base, zIndex: 30 },
  sosBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', ...shadows.brand },
  sosBtnActive: { backgroundColor: colors.danger },
  sosBtnText: { fontSize: 9, fontWeight: '700', color: colors.white, marginTop: 1 },

  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 },
  riderCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius['3xl'], borderTopRightRadius: radius['3xl'], padding: spacing.lg, paddingBottom: 32, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.raised },
  riderCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base },
  riderCardInfo: { flex: 1, marginLeft: spacing.md },
  riderCardName: { fontSize: 16, fontWeight: '700', color: colors.text },
  riderRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  riderCardRating: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  riderDestText: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
  riderActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, justifyContent: 'center', alignItems: 'center' },
  actionBtnLg: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandSoft, justifyContent: 'center', alignItems: 'center' },

  progressSection: { marginBottom: spacing.base },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  progressValue: { fontSize: 12, fontWeight: '700', color: colors.success },
  progressTrack: { height: 8, backgroundColor: colors.surfaceLight, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },

  primaryActionBtn: { borderRadius: radius.xl, overflow: 'hidden', marginTop: spacing.xs },
  primaryActionGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.base, gap: spacing.sm },
  primaryActionText: { fontSize: 18, fontWeight: '700', color: colors.brandContrast },

  cancelBtn: { padding: spacing.md, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
});