import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Alert, Animated, TouchableOpacity,
  StatusBar, Linking, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuth, rides, useSocket, COLORS, GRADIENTS,
  SPACING, RADIUS, decodePolyline, ReconnectionBanner,
  calculateDistance, formatDistance, formatZAR,
  PHALABORWA_CENTER,
} from '@easyryde/shared';
import {
  GlowButton, GlassCard, GradientText, Typography, Avatar, LoadingOverlay,
  AnimatedCheckmark,
} from '@easyryde/shared';
import type { Ride, RiderNav, RiderRoute } from '@easyryde/shared';
import type MapViewType from 'react-native-maps';

type RideState =
  | 'searching'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great!',
  5: 'Excellent!',
};

// ─── Helpers ──────────────────────────────────────────────
function formatEta(minutes: number | null | undefined): string {
  if (!minutes) return '';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ─── Animated Markers ─────────────────────────────────────
function AnimatedDriverMarker({
  coordinate: coord,
  size = 44,
}: {
  coordinate: { latitude: number; longitude: number };
  size?: number;
}) {
  const animLat = useRef(new Animated.Value(coord.latitude)).current;
  const animLng = useRef(new Animated.Value(coord.longitude)).current;
  const [currentCoord, setCurrentCoord] = useState(coord);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animLat, { toValue: coord.latitude, duration: 1200, useNativeDriver: false }),
      Animated.timing(animLng, { toValue: coord.longitude, duration: 1200, useNativeDriver: false }),
    ]).start();

    const latSub = animLat.addListener(({ value }) =>
      setCurrentCoord((p) => ({ ...p, latitude: value })),
    );
    const lngSub = animLng.addListener(({ value }) =>
      setCurrentCoord((p) => ({ ...p, longitude: value })),
    );
    return () => {
      animLat.removeListener(latSub);
      animLng.removeListener(lngSub);
    };
  }, [coord.latitude, coord.longitude]);

  return (
    <Marker coordinate={currentCoord} anchor={{ x: 0.5, y: 0.5 }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.primary,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: pulseAnim,
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        <View
          style={{
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: size * 0.25,
            backgroundColor: COLORS.bg,
          }}
        />
      </Animated.View>
    </Marker>
  );
}

function PulsingMarker({
  coordinate,
  color,
  size = 20,
}: {
  coordinate: { latitude: number; longitude: number };
  color: string;
  size?: number;
}) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: pulseAnim,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 10,
          elevation: 6,
        }}
      />
    </Marker>
  );
}

// ─── Radar Animation ──────────────────────────────────────
function RadarAnimation() {
  const ring0 = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const anims = [ring0, ring1, ring2];

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 400),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: true }),
          ]),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.radarContainer}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.radarRing,
            {
              borderColor: COLORS.primary,
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 2.5],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      <View style={styles.radarCenter}>
        <Typography variant="h1" color={COLORS.primary}>🚗</Typography>
      </View>
    </View>
  );
}

// ─── Route Card (pickup / dropoff) ────────────────────────
function RouteCard({
  pickupAddress,
  destinationName,
}: {
  pickupAddress: string;
  destinationName: string;
}) {
  return (
    <GlassCard padding={SPACING.base} glow={false} style={{ marginBottom: SPACING.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
        <View style={[styles.routeIcon, { backgroundColor: COLORS.success }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white }} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Typography variant="xs" color={COLORS.textMuted}>PICKUP</Typography>
          <Typography variant="body" style={{ fontWeight: '600' }}>{pickupAddress}</Typography>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.routeIcon, { backgroundColor: COLORS.primary }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white }} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Typography variant="xs" color={COLORS.textMuted}>DROPOFF</Typography>
          <Typography variant="body" style={{ fontWeight: '600' }}>{destinationName}</Typography>
        </View>
      </View>
    </GlassCard>
  );
}

// ─── Driver Info Card ─────────────────────────────────────
function DriverInfoCard({
  driver,
  onCall,
  onMessage,
  compact = false,
}: {
  driver?: Ride['driver'];
  onCall: () => void;
  onMessage: () => void;
  compact?: boolean;
}) {
  if (!driver) return null;
  return (
    <GlassCard padding={compact ? SPACING.md : SPACING.base} glow={false} style={{ marginBottom: SPACING.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar name={driver.name || ''} size={compact ? 44 : 56} />
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Typography variant={compact ? 'body' : 'h4'} style={{ fontWeight: '700' }}>
            {driver.name}
          </Typography>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Typography variant="small" color={COLORS.warning}>★</Typography>
            <Typography variant="small" color={COLORS.textSecondary} style={{ marginLeft: 4 }}>
              {driver.average_rating?.toFixed(1) || '5.0'}
            </Typography>
            {!compact && (
              <>
                <Typography variant="small" color={COLORS.textMuted} style={{ marginLeft: 6 }}>•</Typography>
                <Typography variant="small" color={COLORS.textMuted} style={{ marginLeft: 6 }}>
                  {driver.total_trips || 0} trips
                </Typography>
              </>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <TouchableOpacity style={styles.actionCircle} onPress={onCall}>
            <Typography variant="h4" color={COLORS.primary}>📞</Typography>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCircle} onPress={onMessage}>
            <Typography variant="h4" color={COLORS.primary}>💬</Typography>
          </TouchableOpacity>
        </View>
      </View>
    </GlassCard>
  );
}

// ─── Vehicle Info Bar ─────────────────────────────────────
function VehicleInfoBar({ ride }: { ride: Ride }) {
  return (
    <View style={styles.vehicleBar}>
      <View style={styles.vehicleIcon}>
        <Typography variant="h3" color={COLORS.primary}>🚗</Typography>
      </View>
      <View style={{ flex: 1, marginLeft: SPACING.md }}>
        <Typography variant="small" color={COLORS.textMuted}>{ride.category}</Typography>
        <Typography variant="body" style={{ fontWeight: '700', color: COLORS.text }}>
          {ride.driver?.name || 'Driver'}
        </Typography>
      </View>
      <Animated.View style={styles.livePulse} />
    </View>
  );
}

// ─── Error Boundary Wrapper ──────────────────────────────
class RideTrackingErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message || 'Unknown error' };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Something went wrong</Text>
          <Text style={{ color: '#98989d', textAlign: 'center' }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Main Component ───────────────────────────────────────
function RideTrackingScreenInner({
  route,
  navigation,
}: {
  route: RiderRoute<'RideTracking'>;
  navigation: RiderNav;
}) {
  const rideId = route.params?.rideId;
  const authResult = useAuth();
  const token = authResult?.token ?? null;
  const socketResult = useSocket({
    token: token || '',
  });
  const { isConnected, isReconnecting, reconnectAttempt, on, emit, joinRoom } = socketResult;

  // ─── Core State ─────────────────────────────────────────
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rideState, setRideState] = useState<RideState>('searching');

  // ─── Driver Location ────────────────────────────────────
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // ─── Route Coords ───────────────────────────────────────
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  // ─── Trip Progress ──────────────────────────────────────
  const [tripProgress, setTripProgress] = useState(0);
  const [tripDistanceRemaining, setTripDistanceRemaining] = useState<number | null>(null);

  // ─── Rating ─────────────────────────────────────────────
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // ─── Map Ref ────────────────────────────────────────────
  const mapRef = useRef<MapViewType>(null);

  // ─── Animated Values ────────────────────────────────────
  const completionScale = useRef(new Animated.Value(0)).current;

  // ─── Cancel Loading ─────────────────────────────────────
  const [cancelling, setCancelling] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  // ─── Derived ────────────────────────────────────────────
  const pickupCoord = useMemo(
    () =>
      ride
        ? { latitude: parseFloat(String(ride.pickup_latitude)), longitude: parseFloat(String(ride.pickup_longitude)) }
        : PHALABORWA_CENTER,
    [ride],
  );

  const dropoffCoord = useMemo(
    () =>
      ride
        ? { latitude: parseFloat(String(ride.dropoff_latitude)), longitude: parseFloat(String(ride.dropoff_longitude)) }
        : PHALABORWA_CENTER,
    [ride],
  );

  const etaText = useMemo(() => formatEta(ride?.driver_eta), [ride?.driver_eta]);

  const totalDistance = useMemo(() => {
    if (!ride) return 0;
    return calculateDistance(
      ride.pickup_latitude,
      ride.pickup_longitude,
      ride.dropoff_latitude,
      ride.dropoff_longitude,
    );
  }, [ride]);

  // ─── Load Ride ──────────────────────────────────────────
  const loadRide = useCallback(async () => {
    try {
      setError(null);
      if (!rideId) {
        setError('No ride ID provided');
        setLoading(false);
        return;
      }
      const data = await rides.get(rideId);
      // Handle various API response shapes
      const rideData = (data as any)?.ride ?? (data as any)?.data?.ride ?? data;
      if (!rideData || !rideData.id) {
        setError('Ride not found');
        setLoading(false);
        return;
      }
      setRide(rideData);
      setRideState((rideData.status as RideState) || 'searching');
      if (rideData.status === 'completed') {
        triggerCompletionAnimation();
      }
    } catch (err: any) {
      if (__DEV__) console.error('[RideTracking] loadRide error:', err);
      setError(err.message || 'Failed to load ride');
    } finally {
      setLoading(false);
    }
  }, [rideId, triggerCompletionAnimation]);

  // ─── Init ───────────────────────────────────────────────
  useEffect(() => {
    loadRide();
    // Poll every 15 seconds as fallback (backend doesn't emit socket events)
    const pollInterval = setInterval(() => {
      try { loadRide(); } catch {}
    }, 15000);
    return () => clearInterval(pollInterval);
  }, []); // Empty deps to avoid re-render loop

  // ─── Join Socket Room ───────────────────────────────────
  useEffect(() => {
    if (isConnected) {
      joinRoom(`ride:${rideId}`);
      emit('ride:track', { rideId });
    }
  }, [isConnected, rideId]);

  // ─── Socket Events ──────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;

    const unsubs: Array<() => void> = [];
    const safeOn = (event: string, handler: (...args: any[]) => void) => {
      try {
        const unsub = on(event, handler);
        if (typeof unsub === 'function') {
          unsubs.push(unsub);
        }
      } catch (e) {
        if (__DEV__) console.warn(`[RideTracking] Failed to subscribe to ${event}:`, e);
      }
    };

    safeOn('ride:accepted', (data: any) => {
      if (data.rideId === rideId) loadRide();
    });
    safeOn('ride:arrived', (data: any) => {
      if (data.rideId === rideId) loadRide();
    });
    safeOn('ride:started', (data: any) => {
      if (data.rideId === rideId) loadRide();
    });
    safeOn('ride:completed', (data: any) => {
      if (data.rideId === rideId) loadRide();
    });
    safeOn('ride:cancelled', (data: any) => {
      if (data.rideId === rideId) {
        loadRide();
        setRideState('cancelled');
      }
    });
    safeOn('driver:location', (data: any) => {
      if (data.driverId === ride?.driver_id && ride) {
        const newLoc = { latitude: data.latitude, longitude: data.longitude };
        setDriverLocation(newLoc);

        // Update trip progress
        if (ride.status === 'in_progress') {
          const distRemaining = calculateDistance(
            newLoc.latitude,
            newLoc.longitude,
            ride.dropoff_latitude,
            ride.dropoff_longitude,
          );
          setTripDistanceRemaining(distRemaining);
          const pct = Math.min(
            100,
            Math.max(0, ((totalDistance - distRemaining) / totalDistance) * 100),
          );
          setTripProgress(pct);
        }
      }
    });

    return () => {
      unsubs.forEach((u) => {
        try { u(); } catch {}
      });
    };
  }, [isConnected, ride?.driver_id, rideId, loadRide, totalDistance]);

  // ─── Decode Route Polyline ──────────────────────────────
  useEffect(() => {
    if (!ride?.route_polyline) return;
    try {
      setRouteCoords(decodePolyline(ride.route_polyline));
    } catch {
      // Fallback: generate straight line
      const from = { lat: ride.pickup_latitude, lng: ride.pickup_longitude };
      const to = { lat: ride.dropoff_latitude, lng: ride.dropoff_longitude };
      const coords: { latitude: number; longitude: number }[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        coords.push({
          latitude: from.lat + (to.lat - from.lat) * t,
          longitude: from.lng + (to.lng - from.lng) * t,
        });
      }
      setRouteCoords(coords);
    }
  }, [ride?.route_polyline]);

  // ─── Fit Map ────────────────────────────────────────────
  useEffect(() => {
    if (routeCoords.length === 0 || !ride) return;
    const timer = setTimeout(() => {
      const points = [
        pickupCoord,
        dropoffCoord,
        ...routeCoords.slice(0, 1),
        ...routeCoords.slice(-1),
      ];
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
        animated: true,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [routeCoords, pickupCoord, dropoffCoord, ride]);

  // ─── Completion Animation ───────────────────────────────
  const triggerCompletionAnimation = useCallback(() => {
    try {
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(completionScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
      ]).start();
    } catch (e) {
      if (__DEV__) console.warn('[RideTracking] Animation error:', e);
    }
  }, [completionScale]);

  // ─── Actions ────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancelling(true);
            await rides.cancel(rideId);
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to cancel ride');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }, [rideId, navigation]);

  const handleCall = useCallback(() => {
    if (ride?.driver?.phone_number) {
      Linking.openURL(`tel:${ride.driver.phone_number}`);
    }
  }, [ride?.driver?.phone_number]);

  const handleMessage = useCallback(() => {
    if (ride?.driver_id) {
      navigation.navigate('Chat', { rideId, receiverId: ride.driver_id });
    }
  }, [ride?.driver_id, rideId, navigation]);

  const handleRate = useCallback(async () => {
    if (rating === 0) return;
    try {
      setRatingLoading(true);
      await rides.rate(rideId, rating);
      setRatingSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  }, [rideId, rating]);

  const handleDone = useCallback(() => {
    navigation.navigate('Main');
  }, [navigation]);

  const handleSOS = useCallback(() => {
    Alert.alert(
      'Emergency SOS',
      'This will alert emergency services and share your live location. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Send SOS',
          style: 'destructive',
          onPress: () => {
            Alert.alert('SOS Sent', 'Emergency services have been notified. Stay calm and stay on the line.');
          },
        },
      ],
    );
  }, []);

  const handleStartTrip = useCallback(() => {
    // Trip is started by driver; this is just the UI confirmation
    setRideState('in_progress');
  }, []);

  // ─── Invalid ride guard (AFTER all hooks) ───────────────
  if (!rideId) {
    return <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#121212'}}><Text style={{color:'#fff'}}>Invalid ride</Text></View>;
  }

  // ─── Map Markers ────────────────────────────────────────
  const renderMapMarkers = () => {
    if (!ride) return null;

    const showDriver =
      driverLocation &&
      (ride.status === 'accepted' || ride.status === 'arrived' || ride.status === 'in_progress');

    return (
      <>
        {/* User marker */}
        <Marker coordinate={pickupCoord} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.userMarker}>
            <View style={styles.userMarkerInner} />
          </View>
        </Marker>

        {/* Pickup marker */}
        <Marker coordinate={pickupCoord} anchor={{ x: 0.5, y: 1 }}>
          <View style={[styles.mapDot, { backgroundColor: COLORS.success }]} />
        </Marker>

        {/* Destination marker */}
        {ride.dropoff_latitude !== 0 && (
          <Marker coordinate={dropoffCoord} anchor={{ x: 0.5, y: 1 }}>
            <View style={[styles.mapDot, { backgroundColor: COLORS.primary }]} />
          </Marker>
        )}

        {/* Route line */}
        {routeCoords.length > 0 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor={`${COLORS.primary}40`}
              strokeWidth={8}
              lineDashPattern={[0]}
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={COLORS.primary}
              strokeWidth={4}
              lineDashPattern={[12, 8]}
            />
          </>
        )}

        {/* Driver marker */}
        {showDriver && (
          <AnimatedDriverMarker coordinate={driverLocation} />
        )}
      </>
    );
  };

  // ─── Searching State ────────────────────────────────────
  const renderSearching = () => {
    return (
    <View style={styles.stateContainer}>
      <View style={styles.searchingContent}>
        <RadarAnimation />

        <Typography
          variant="h2"
          color={COLORS.text}
          style={{ marginTop: SPACING.lg, marginBottom: SPACING.sm, textAlign: 'center' }}
        >
          Finding your driver...
        </Typography>
        <Typography
          variant="body"
          color={COLORS.textMuted}
          style={{ textAlign: 'center', marginBottom: SPACING.xl }}
        >
          Connecting you with nearby drivers in Phalaborwa
        </Typography>

        {/* Trip summary card */}
        <GlassCard padding={SPACING.base} style={{ width: '100%', marginBottom: SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.vehicleIcon}>
              <Typography variant="h3" color={COLORS.primary}>🚗</Typography>
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Typography variant="body" style={{ fontWeight: '600' }}>{ride?.category}</Typography>
              <Typography variant="xs" color={COLORS.textMuted}>{ride?.dropoff_address}</Typography>
            </View>
            {ride?.total_fare && (
              <GradientText
                colors={GRADIENTS.primary}
                style={{ fontSize: 18, fontWeight: '800' }}
              >
                {formatZAR(ride.total_fare)}
              </GradientText>
            )}
          </View>
        </GlassCard>

        {/* Route card */}
        <View style={{ width: '100%' }}>
          <RouteCard
            pickupAddress={ride?.pickup_address || ''}
            destinationName={ride?.dropoff_address || ''}
          />
        </View>

        {/* Cancel */}
        <TouchableOpacity onPress={handleCancel} style={{ paddingVertical: SPACING.md }}>
          <Typography variant="body" color={COLORS.error} style={{ fontWeight: '600' }}>
            Cancel Request
          </Typography>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  // ─── Accepted State ─────────────────────────────────────
  const renderAccepted = () => (
    <View style={styles.stateContainer}>
      {/* Orange header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.acceptedHeader}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Typography variant="xs" color={`${COLORS.bg}bb`} style={{ fontWeight: '700', textTransform: 'uppercase' }}>
              Driver Confirmed!
            </Typography>
            <GradientText
              colors={[COLORS.bg, COLORS.bg]}
              style={{ fontSize: 36, fontWeight: '800', marginTop: 4 }}
            >
              {etaText || '3 min'}
            </GradientText>
          </View>
          <View style={styles.arrivingBadge}>
            <Typography variant="xs" color={COLORS.primary} style={{ fontWeight: '800' }}>
              ARRIVING
            </Typography>
          </View>
        </View>
        {ride && <VehicleInfoBar ride={ride} />}
      </LinearGradient>

      {/* Scrollable content */}
      <View style={styles.acceptedContent}>
        <DriverInfoCard driver={ride?.driver} onCall={handleCall} onMessage={handleMessage} />
        <RouteCard
          pickupAddress={ride?.pickup_address || ''}
          destinationName={ride?.dropoff_address || ''}
        />

        {/* Share trip */}
        <GlassCard padding={SPACING.md} glow={false} style={{ marginBottom: SPACING.base }}>
          <Typography variant="small" color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }}>
            Share trip with friends
          </Typography>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <View style={styles.shareLinkBox}>
              <Typography variant="small" color={COLORS.textMuted} numberOfLines={1}>
                easyryde.co.za/trip/{rideId.slice(0, 8)}
              </Typography>
            </View>
            <TouchableOpacity style={styles.shareButton}>
              <Typography variant="body" color={COLORS.bg}>📤</Typography>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <GlowButton
          title="Track Driver on Map"
          onPress={() => {}}
          size="lg"
        />
        <TouchableOpacity onPress={handleSOS} style={styles.sosButton}>
          <Ionicons name="alert-circle" size={18} color={COLORS.error} />
          <Typography variant="body" color={COLORS.error} style={{ fontWeight: '700', marginLeft: 6 }}>
            SOS
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCancel} style={{ paddingVertical: SPACING.md }}>
          <Typography variant="body" color={COLORS.error} style={{ fontWeight: '600' }}>
            Cancel Ride
          </Typography>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Arrived State ──────────────────────────────────────
  const renderArrived = () => (
    <View style={styles.stateContainer}>
      {/* Green header */}
      <LinearGradient
        colors={[COLORS.success, COLORS.successLight]}
        style={styles.arrivedHeader}
      >
        <View style={styles.pulsingCheckContainer}>
          <Animated.View
            style={[
              styles.pulsingCheckBg,
              {
                opacity: completionScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3],
                }),
                transform: [{ scale: completionScale }],
              },
            ]}
          />
          <AnimatedCheckmark size={70} color={COLORS.white} />
        </View>
        <Typography variant="h2" color={COLORS.white} style={{ marginTop: SPACING.md, marginBottom: SPACING.xs }}>
          Driver Has Arrived!
        </Typography>
        <Typography variant="body" color={`${COLORS.white}cc`} style={{ textAlign: 'center' }}>
          {ride?.driver?.name} is waiting at your pickup
        </Typography>
      </LinearGradient>

      {/* Scrollable content */}
      <View style={styles.acceptedContent}>
        <DriverInfoCard driver={ride?.driver} onCall={handleCall} onMessage={handleMessage} />

        <GlassCard padding={SPACING.base} glow={false} style={{ marginBottom: SPACING.base }}>
          <Typography variant="xs" color={COLORS.textMuted} style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.sm }}>
            Pickup Location
          </Typography>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.routeIcon, { backgroundColor: COLORS.success }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white }} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Typography variant="body" style={{ fontWeight: '600' }}>{ride?.pickup_address}</Typography>
            </View>
          </View>
        </GlassCard>

        <GlassCard padding={SPACING.base} glow={false}>
          <Typography variant="xs" color={COLORS.textMuted} style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.sm }}>
            Destination
          </Typography>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.routeIcon, { backgroundColor: COLORS.primary }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white }} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Typography variant="body" style={{ fontWeight: '600' }}>{ride?.dropoff_address}</Typography>
            </View>
          </View>
        </GlassCard>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <GlowButton
          title={`Start Trip to ${ride?.dropoff_address?.split(',')[0] || 'Destination'}`}
          onPress={handleStartTrip}
          size="lg"
        />
        <TouchableOpacity
          onPress={handleMessage}
          style={styles.secondaryButton}
        >
          <Typography variant="body" color={COLORS.primary} style={{ fontWeight: '600' }}>
            💬 Message Driver
          </Typography>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── In Progress State ──────────────────────────────────
  const renderInProgress = () => {
    const remainingKm = tripDistanceRemaining ?? totalDistance;
    const etaMinutes = remainingKm > 0 ? Math.ceil(remainingKm / 0.5) : 0;

    return (
      <View style={styles.stateContainer}>
        {/* Top bar with driver info */}
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Avatar name={ride?.driver?.name || ''} size={40} />
            <View style={{ marginLeft: SPACING.md, flex: 1 }}>
              <Typography variant="body" style={{ fontWeight: '700' }}>
                {ride?.driver?.name}
              </Typography>
              <Typography variant="xs" color={COLORS.textMuted}>
                {ride?.category}
              </Typography>
            </View>
          </View>
          <TouchableOpacity style={styles.actionCircle} onPress={handleCall}>
            <Typography variant="h4" color={COLORS.primary}>📞</Typography>
          </TouchableOpacity>
        </View>

        {/* Progress section */}
        <View style={styles.progressSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm }}>
            <Typography variant="small" color={COLORS.textMuted}>Trip Progress</Typography>
            <GradientText colors={GRADIENTS.primary} style={{ fontSize: 14, fontWeight: '700' }}>
              {etaMinutes > 0 ? `${etaMinutes} min` : 'Arriving'}
            </GradientText>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, tripProgress))}%` as any },
              ]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Typography variant="xs" color={COLORS.textMuted}>
              {formatDistance(totalDistance - remainingKm)} traveled
            </Typography>
            <Typography variant="xs" color={COLORS.textMuted}>
              {formatDistance(remainingKm)} remaining
            </Typography>
          </View>
        </View>

        {/* Bottom card */}
        <View style={styles.bottomActions}>
          <GlassCard padding={SPACING.base} glow={false} style={{ marginBottom: SPACING.md }}>
            <RouteCard
              pickupAddress={ride?.pickup_address || ''}
              destinationName={ride?.dropoff_address || ''}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm }}>
              <TouchableOpacity onPress={handleSOS} style={styles.sosButton}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Typography variant="body" color={COLORS.error} style={{ fontWeight: '700', marginLeft: 6 }}>
                  SOS
                </Typography>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <TouchableOpacity style={styles.actionCircle} onPress={handleMessage}>
                  <Typography variant="h4" color={COLORS.primary}>💬</Typography>
                </TouchableOpacity>
                <GlowButton title="Complete Trip" onPress={() => setRideState('completed')} size="sm" />
              </View>
            </View>
          </GlassCard>
        </View>
      </View>
    );
  };

  // ─── Completed State ────────────────────────────────────
  const renderCompleted = () => (
    <View style={[styles.stateContainer, { justifyContent: 'center' }]}>
      <StatusBar barStyle="light-content" />

      {/* Success icon */}
      <Animated.View
        style={{
          alignItems: 'center',
          marginBottom: SPACING.lg,
          transform: [{ scale: completionScale }],
        }}
      >
        <View style={styles.successCircle}>
          <AnimatedCheckmark size={60} color={COLORS.white} />
        </View>
      </Animated.View>

      <Typography
        variant="h2"
        color={COLORS.text}
        style={{ textAlign: 'center', marginBottom: SPACING.xs }}
      >
        Trip Complete!
      </Typography>
      <Typography variant="body" color={COLORS.textMuted} style={{ textAlign: 'center' }}>
        You've arrived at
      </Typography>
      <GradientText
        colors={GRADIENTS.primary}
        style={{ fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.xl }}
      >
        {ride?.dropoff_address || 'your destination'}
      </GradientText>

      {/* Trip summary */}
      <GlassCard padding={SPACING.lg} style={{ width: '100%', marginBottom: SPACING.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.base }}>
          <Avatar name={ride?.driver?.name || ''} size={48} />
          <View style={{ marginLeft: SPACING.md }}>
            <Typography variant="body" style={{ fontWeight: '700' }}>{ride?.driver?.name}</Typography>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Typography variant="small" color={COLORS.warning}>★</Typography>
              <Typography variant="small" color={COLORS.textSecondary} style={{ marginLeft: 4 }}>
                {ride?.driver?.average_rating?.toFixed(1) || '5.0'}
              </Typography>
            </View>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Typography variant="body" color={COLORS.textMuted}>Trip Fare</Typography>
          <Typography variant="body" style={{ fontWeight: '700' }}>
            {ride?.total_fare ? formatZAR(ride.total_fare) : '--'}
          </Typography>
        </View>
        <View style={styles.summaryRow}>
          <Typography variant="body" color={COLORS.textMuted}>Payment</Typography>
          <Typography variant="body">
            {ride?.payment_method === 'cash' ? 'Cash' : `Card ••••`}
          </Typography>
        </View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: COLORS.glassBorder, paddingTop: SPACING.md, marginTop: SPACING.sm }]}>
          <Typography variant="h4" style={{ fontWeight: '800' }}>Total</Typography>
          <GradientText
            colors={GRADIENTS.primary}
            style={{ fontSize: 24, fontWeight: '800' }}
          >
            {ride?.total_fare ? formatZAR(ride.total_fare) : '--'}
          </GradientText>
        </View>
      </GlassCard>

      {/* Rating */}
      {!ratingSubmitted ? (
        <View style={{ width: '100%', alignItems: 'center', marginBottom: SPACING.lg }}>
          <Typography variant="h4" color={COLORS.text} style={{ marginBottom: SPACING.base }}>
            Rate your trip
          </Typography>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: star <= rating ? 1.15 : 1,
                      },
                    ],
                  }}
                >
                  <Typography
                    variant="h1"
                    color={star <= rating ? COLORS.warning : COLORS.textDim}
                    style={{ marginHorizontal: 4 }}
                  >
                    ★
                  </Typography>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Typography variant="small" color={COLORS.textMuted} style={{ marginTop: SPACING.sm }}>
              {RATING_LABELS[rating]}
            </Typography>
          )}
        </View>
      ) : (
        <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
          <Typography variant="body" color={COLORS.success} style={{ fontWeight: '600' }}>
            ✓ Rating submitted. Thank you!
          </Typography>
        </View>
      )}

      {/* Buttons */}
      <View style={{ width: '100%', gap: SPACING.md }}>
        {!ratingSubmitted && rating > 0 && (
          <GlowButton
            title={`Add a tip for ${ride?.driver?.name?.split(' ')[0] || 'driver'}`}
            onPress={() => Alert.alert('Tip', 'Tip feature coming soon!')}
            size="md"
            glowColor={COLORS.surfaceLight}
          />
        )}
        <GlowButton
          title="Done"
          onPress={handleDone}
          size="lg"
        />
      </View>
    </View>
  );

  // ─── Cancelled State ────────────────────────────────────
  const renderCancelled = () => (
    <View style={[styles.stateContainer, { justifyContent: 'center' }]}>
      <View style={styles.cancelledCircle}>
        <Typography variant="h1" color={COLORS.error}>✕</Typography>
      </View>

      <Typography
        variant="h2"
        color={COLORS.text}
        style={{ textAlign: 'center', marginBottom: SPACING.sm }}
      >
        Ride Cancelled
      </Typography>
      <Typography variant="body" color={COLORS.textMuted} style={{ textAlign: 'center', marginBottom: SPACING.xl }}>
        {ride?.cancelled_by === 'driver'
          ? 'Your driver cancelled the ride'
          : ride?.cancellation_reason || 'This ride has been cancelled'}
      </Typography>

      <GlowButton title="Done" onPress={handleDone} size="lg" />
    </View>
  );

  // ─── Main Render ────────────────────────────────────────
  if (loading || !ride || !ride.id) {
    if (error) {
      return (
        <View style={styles.container}>
          <Text style={{color:'#fff',textAlign:'center',marginTop:100}}>{error}</Text>
        </View>
      );
    }
    return <LoadingOverlay />;
  }

  if (error) {
    return (
      <View style={[styles.stateContainer, { justifyContent: 'center', padding: SPACING.xl }]}>
        <Typography variant="h3" color={COLORS.error} style={{ textAlign: 'center', marginBottom: SPACING.md }}>
          Something went wrong
        </Typography>
        <Typography variant="body" color={COLORS.textMuted} style={{ textAlign: 'center', marginBottom: SPACING.xl }}>
          {error}
        </Typography>
        <GlowButton title="Try Again" onPress={loadRide} size="md" />
      </View>
    );
  }

  const showMap = rideState !== 'searching' && rideState !== 'completed' && rideState !== 'cancelled';

  return (
    <View style={styles.container}>
      <ReconnectionBanner isReconnecting={isReconnecting} reconnectAttempt={reconnectAttempt} />

      {/* Map */}
      {showMap && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: parseFloat(String(ride.pickup_latitude)),
            longitude: parseFloat(String(ride.pickup_longitude)),
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {renderMapMarkers()}
        </MapView>
      )}

      {/* Map gradient overlay */}
      {showMap && (
        <LinearGradient
          colors={['transparent', 'rgba(10,10,10,0.4)', 'rgba(10,10,10,0.95)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
      )}

      {/* State-specific UI */}
      {rideState === 'searching' && renderSearching()}
      {rideState === 'accepted' && renderAccepted()}
      {rideState === 'arrived' && renderArrived()}
      {rideState === 'in_progress' && renderInProgress()}
      {rideState === 'completed' && renderCompleted()}
      {rideState === 'cancelled' && renderCancelled()}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 350,
  },

  // State container
  stateContainer: {
    flex: 1,
  },

  // Searching
  searchingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  radarContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  radarCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // Accepted header
  acceptedHeader: {
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.base,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  arrivingBadge: {
    backgroundColor: `${COLORS.bg}30`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },

  // Arrived header
  arrivedHeader: {
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  pulsingCheckContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingCheckBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 45,
    backgroundColor: COLORS.white,
  },

  // Accepted content
  acceptedContent: {
    flex: 1,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
  },

  // Vehicle bar
  vehicleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.bg}25`,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },

  // Bottom actions
  bottomActions: {
    paddingHorizontal: SPACING.base,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    backgroundColor: COLORS.bg,
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },

  // SOS
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },

  // Progress section
  progressSection: {
    backgroundColor: COLORS.surfaceLight,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  progressTrack: {
    height: 8,
    backgroundColor: `${COLORS.bg}80`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Markers
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.info,
    borderWidth: 3,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.info,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  userMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  mapDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // Route card helpers
  routeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Action buttons
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Completed
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },

  // Cancelled
  cancelledCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${COLORS.error}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  // Share
  shareLinkBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function RideTrackingScreen(props: {
  route: RiderRoute<'RideTracking'>;
  navigation: RiderNav;
}) {
  return (
    <RideTrackingErrorBoundary>
      <RideTrackingScreenInner {...props} />
    </RideTrackingErrorBoundary>
  );
}
