import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Alert, Animated, TouchableOpacity,
  StatusBar, Linking, Platform, ActivityIndicator, Modal,
  TextInput, Dimensions, Share,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useTheme,
  useAuth, rides, useSocket, COLORS, GRADIENTS,
  SPACING, decodePolyline, ReconnectionBanner,
  calculateDistance, formatDistance, formatZAR, sos,
  PHALABORWA_CENTER,
} from '@easyryde/shared';
import {
  GlowButton, GlassCard, Avatar,
} from '@easyryde/shared';
import type { Ride, RiderNav, RiderRoute } from '@easyryde/shared';
import type MapViewType from 'react-native-maps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RideState =
  | 'searching' | 'accepted' | 'arrived'
  | 'in_progress' | 'completed' | 'cancelled';

function formatEta(minutes: number | null | undefined): string {
  if (!minutes) return '';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const TIP_AMOUNTS = [10, 20, 50];

function AnimatedDriverMarker({
  coordinate: coord,
  size = 44,
}: {
  coordinate: { latitude: number; longitude: number };
  size?: number;
}) {
  const { colors } = useTheme();
  const animLat = useRef(new Animated.Value(coord.latitude)).current;
  const animLng = useRef(new Animated.Value(coord.longitude)).current;
  const [currentCoord, setCurrentCoord] = useState(coord);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animLat, { toValue: coord.latitude, duration: 1500, useNativeDriver: false }),
      Animated.timing(animLng, { toValue: coord.longitude, duration: 1500, useNativeDriver: false }),
    ]).start();
    const latSub = animLat.addListener(({ value }) => setCurrentCoord((p) => ({ ...p, latitude: value })));
    const lngSub = animLng.addListener(({ value }) => setCurrentCoord((p) => ({ ...p, longitude: value })));
    return () => { animLat.removeListener(latSub); animLng.removeListener(lngSub); };
  }, [coord.latitude, coord.longitude]);

  return (
    <Marker coordinate={currentCoord} anchor={{ x: 0.5, y: 0.5 }}>
      <View>
        <Animated.View style={{
          position: 'absolute', top: -8, left: -8,
          width: size + 16, height: size + 16, borderRadius: (size + 16) / 2,
          backgroundColor: 'rgba(255,106,0,0.3)',
          transform: [{ scale: pulseAnim }],
        }} />
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: colors.success,
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 3, borderColor: colors.white,
          shadowColor: colors.success,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7, shadowRadius: 14,
          elevation: 10,
        }}>
          <Ionicons name="car" size={20} color={colors.white} />
        </View>
      </View>
    </Marker>
  );
}

function PulseRing() {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 2, borderColor: colors.brand,
      transform: [{ scale }],
      opacity,
    }} />
  );
}

function SOSButton({ rideId, latitude, longitude }: {
  rideId: string;
  latitude: number;
  longitude: number;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [sosActive, setSosActive] = useState(false);
  const [sending, setSending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleSOS = async () => {
    if (sosActive) {
      Alert.alert('SOS Active', 'Emergency services have been notified. Help is on the way.');
      return;
    }
    Alert.alert(
      'Emergency SOS',
      'This will notify our emergency response team with your current location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            setSending(true);
            try {
              await sos.trigger({ ride_id: rideId, latitude, longitude });
              setSosActive(true);
              Alert.alert('SOS Sent', 'Emergency services have been notified. Your location is being shared.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to send SOS alert.');
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={handleSOS}
      disabled={sending}
      activeOpacity={0.8}
      style={styles.sosButton}
    >
      <Animated.View style={{
        position: 'absolute',
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 2, borderColor: 'rgba(220,38,38,0.5)',
        transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
        opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: 56, height: 56, borderRadius: 28,
        borderWidth: 2, borderColor: 'rgba(220,38,38,0.3)',
        transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
        opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
      }} />
      <View style={styles.sosInner}>
        {sending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Ionicons name="warning" size={24} color={colors.white} />
        )}
      </View>
      <Text style={styles.sosText}>SOS</Text>
    </TouchableOpacity>
  );
}

function RideTrackingScreenInner({
  route, navigation,
}: { route: RiderRoute<'RideTracking'>; navigation: RiderNav }) {
  const { colors, typography, radius, spacing, shadows } = useTheme();
  const styles = makeStyles(colors);
  const rideId = route.params?.rideId;
  const authResult = useAuth();
  const token = authResult?.token ?? null;
  const socketResult = useSocket({ token: token || '' });
  const { isConnected, isReconnecting, reconnectAttempt, on, emit, joinRoom } = socketResult;

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rideState, setRideState] = useState<RideState>('searching');
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [tripProgress, setTripProgress] = useState(0);
  const [tripDistanceRemaining, setTripDistanceRemaining] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [showCompletion, setShowCompletion] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const mapRef = useRef<MapViewType>(null);
  const completionScale = useRef(new Animated.Value(0)).current;
  const etaAnim = useRef(new Animated.Value(0)).current;

  const pickupCoord = useMemo(() => ride ? {
    latitude: parseFloat(String(ride.pickup_latitude)),
    longitude: parseFloat(String(ride.pickup_longitude)),
  } : PHALABORWA_CENTER, [ride]);

  const dropoffCoord = useMemo(() => ride ? {
    latitude: parseFloat(String(ride.dropoff_latitude)),
    longitude: parseFloat(String(ride.dropoff_longitude)),
  } : PHALABORWA_CENTER, [ride]);

  const etaText = useMemo(() => formatEta(ride?.driver_eta), [ride?.driver_eta]);
  const totalDistance = useMemo(() => {
    if (!ride) return 0;
    return calculateDistance(
      ride.pickup_latitude, ride.pickup_longitude,
      ride.dropoff_latitude, ride.dropoff_longitude,
    );
  }, [ride]);

  const loadRide = useCallback(async () => {
    try {
      setError(null);
      if (!rideId) { setError('No ride ID provided'); setLoading(false); return; }
      const data = await rides.get(rideId);
      const rideData = (data as any)?.ride ?? (data as any)?.data?.ride ?? data;
      if (!rideData || !rideData.id) { setError('Ride not found'); setLoading(false); return; }
      setRide(rideData);
      setRideState((rideData.status as RideState) || 'searching');
      if (rideData.status === 'completed') {
        setShowCompletion(true);
        triggerCompletionAnimation();
      }
    } catch (err: any) { setError(err.message || 'Failed to load ride'); }
    finally { setLoading(false); }
  }, [rideId]);

  useEffect(() => {
    loadRide();
    const pollInterval = setInterval(() => { try { loadRide(); } catch {} }, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (isConnected) {
      joinRoom(`ride:${rideId}`);
      emit('ride:track', { rideId });
    }
  }, [isConnected, rideId]);

  useEffect(() => {
    if (!isConnected) return;
    const unsubs: Array<() => void> = [];
    const safeOn = (event: string, handler: (...args: any[]) => void) => {
      try { const unsub = on(event, handler); if (typeof unsub === 'function') unsubs.push(unsub); } catch {}
    };
    safeOn('ride:accepted', (data: any) => { if (data.rideId === rideId) loadRide(); });
    safeOn('ride:arrived', (data: any) => { if (data.rideId === rideId) loadRide(); });
    safeOn('ride:started', (data: any) => { if (data.rideId === rideId) loadRide(); });
    safeOn('ride:completed', (data: any) => { if (data.rideId === rideId) { loadRide(); setShowCompletion(true); triggerCompletionAnimation(); } });
    safeOn('ride:cancelled', (data: any) => { if (data.rideId === rideId) { loadRide(); setRideState('cancelled'); } });
    safeOn('driver:location', (data: any) => {
      if (data.driverId === ride?.driver_id && ride) {
        const newLoc = { latitude: data.latitude, longitude: data.longitude };
        setDriverLocation(newLoc);
        if (ride.status === 'in_progress') {
          const distRemaining = calculateDistance(newLoc.latitude, newLoc.longitude, ride.dropoff_latitude, ride.dropoff_longitude);
          setTripDistanceRemaining(distRemaining);
          const pct = Math.min(100, Math.max(0, ((totalDistance - distRemaining) / totalDistance) * 100));
          setTripProgress(pct);
        }
      }
    });
    return () => { unsubs.forEach((u) => { try { u(); } catch {} }); };
  }, [isConnected, ride?.driver_id, rideId, loadRide, totalDistance]);

  useEffect(() => {
    if (!ride?.route_polyline) return;
    try {
      const decoded = decodePolyline(ride.route_polyline);
      if (decoded.length > 0) setRouteCoords(decoded);
    } catch {
      const coords: { latitude: number; longitude: number }[] = [];
      const from = { lat: ride.pickup_latitude, lng: ride.pickup_longitude };
      const to = { lat: ride.dropoff_latitude, lng: ride.dropoff_longitude };
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

  useEffect(() => {
    if (routeCoords.length === 0 || !ride) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates([pickupCoord, dropoffCoord], {
        edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
        animated: true,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [routeCoords, pickupCoord, dropoffCoord, ride]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(etaAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(etaAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const triggerCompletionAnimation = useCallback(() => {
    try {
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(completionScale, {
          toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8,
        }),
      ]).start();
    } catch {}
  }, [completionScale]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try { setCancelling(true); await rides.cancel(rideId); navigation.goBack(); }
          catch (err: any) { Alert.alert('Error', err.message || 'Failed to cancel ride'); }
          finally { setCancelling(false); }
        },
      },
    ]);
  }, [rideId, navigation]);

  const handleCall = useCallback(() => {
    if (ride?.driver?.phone_number) Linking.openURL(`tel:${ride.driver.phone_number}`);
  }, [ride?.driver?.phone_number]);

  const handleMessage = useCallback(() => {
    if (ride?.driver_id) navigation.navigate('Chat', { rideId, receiverId: ride.driver_id });
  }, [ride?.driver_id, rideId, navigation]);

  const handleRate = useCallback(async () => {
    if (rating === 0) return;
    try {
      setRatingLoading(true);
      const comment = feedbackText.trim()
        ? `Tip: R${selectedTip || 0} | ${feedbackText.trim()}`
        : selectedTip ? `Tip: R${selectedTip}` : undefined;
      await rides.rate(rideId, rating, comment);
      setRatingSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  }, [rideId, rating, selectedTip, feedbackText]);

  const handleDone = useCallback(() => navigation.navigate('Main'), [navigation]);
  const handleStartTrip = useCallback(() => setRideState('in_progress'), []);

  const handleShareTrip = useCallback(async () => {
    try {
      await Share.share({
        message: `I'm on an EasyRyde trip! Tracking: ${ride?.pickup_address} → ${ride?.dropoff_address}`,
      });
    } catch {}
  }, [ride]);

  if (!rideId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Invalid ride</Text>
      </View>
    );
  }

  const renderMapMarkers = () => {
    if (!ride) return null;
    const showDriver = driverLocation && ['accepted', 'arrived', 'in_progress'].includes(ride.status as string);
    const showPolyline = routeCoords.length > 0 && ['accepted', 'arrived', 'in_progress'].includes(ride.status as string);
    return (
      <>
        <Marker coordinate={pickupCoord} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.mapPin}>
            <View style={[styles.mapPinInner, { backgroundColor: colors.success }]} />
          </View>
        </Marker>
        {ride.dropoff_latitude !== 0 && (
          <Marker coordinate={dropoffCoord} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.mapPin}>
              <View style={[styles.mapPinInner, { backgroundColor: colors.brand }]} />
            </View>
          </Marker>
        )}
        {showPolyline && (
          <>
            <Polyline coordinates={routeCoords} strokeColor="rgba(255,106,0,0.25)" strokeWidth={8} lineDashPattern={[0]} />
            <Polyline coordinates={routeCoords} strokeColor={colors.brand} strokeWidth={4} lineDashPattern={[12, 8]} />
          </>
        )}
        {showDriver && <AnimatedDriverMarker coordinate={driverLocation!} />}
      </>
    );
  };

  const renderSearching = () => (
    <View style={styles.stateOverlay}>
      <View style={styles.searchingContent}>
        <View style={styles.radarContainer}>
          <PulseRing />
          <PulseRing />
          <PulseRing />
          <View style={styles.radarInner}>
            <Ionicons name="car" size={40} color={colors.brand} />
          </View>
        </View>
        <Text style={styles.searchingTitle}>Finding your driver...</Text>
        <Text style={styles.searchingSub}>Connecting you with nearby drivers in Phalaborwa</Text>
        <View style={styles.searchingInfoCard}>
          <View style={styles.searchingInfoRow}>
            <Ionicons name="car-sport" size={20} color={colors.brand} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.searchingInfoLabel}>{ride?.category || 'EasyRyde'}</Text>
              <Text style={styles.searchingInfoSub}>{ride?.dropoff_address || 'Destination'}</Text>
            </View>
            {ride?.total_fare && (
              <Text style={styles.searchingInfoPrice}>{formatZAR(ride.total_fare)}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelRequestBtn}>
          <Text style={styles.cancelRequestText}>Cancel Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDriverInfo = () => (
    <View style={styles.driverInfoCard}>
      <View style={styles.driverInfoRow}>
        <Avatar name={ride?.driver?.name || ''} size={48} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.driverInfoName}>{ride?.driver?.name || 'Driver'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text style={styles.driverInfoMeta}>
              {ride?.driver?.average_rating?.toFixed(1) || '5.0'} · {ride?.driver?.total_trips || 0} trips
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.driverActionBtn} onPress={handleCall}>
            <Ionicons name="call" size={18} color={colors.brand} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.driverActionBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble" size={18} color={colors.brand} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderETAHeader = () => {
    const remainingKm = tripDistanceRemaining ?? totalDistance;
    const etaMinutes = remainingKm > 0 ? Math.ceil(remainingKm / 0.5) : 0;
    return (
      <View style={styles.etaHeader}>
        <View style={styles.etaHeaderLeft}>
          <Avatar name={ride?.driver?.name || ''} size={36} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.etaDriverName}>{ride?.driver?.name || 'Driver'}</Text>
            <Text style={styles.etaDriverVehicle}>{ride?.category}</Text>
          </View>
        </View>
        <View style={styles.etaRight}>
          <Text style={styles.etaValue}>{formatEta(etaMinutes) || 'Arriving'}</Text>
          <Text style={styles.etaLabel}>{remainingKm.toFixed(1)} km</Text>
        </View>
      </View>
    );
  };

  const renderAccepted = () => (
    <View style={styles.stateOverlay}>
      <LinearGradient
        colors={['#1c1c1e', '#242426']}
        style={styles.acceptedHeader}
      >
        <View style={styles.acceptedHeaderContent}>
          <Text style={styles.acceptedLabel}>DRIVER CONFIRMED</Text>
          <Text style={styles.acceptedEta}>{etaText || '3 min'}</Text>
          <View style={styles.arrivingBadge}>
            <Text style={styles.arrivingBadgeText}>ARRIVING</Text>
          </View>
        </View>
      </LinearGradient>
      {renderDriverInfo()}
      <View style={styles.routeCard}>
        <View style={styles.routeDotRow}>
          <View style={styles.routeDotGreen} />
          <View style={styles.routeLineConnector} />
          <Ionicons name="location" size={16} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeLabel}>PICKUP</Text>
          <Text style={styles.routeAddress}>{ride?.pickup_address || 'Current location'}</Text>
          <View style={{ marginTop: 14 }}>
            <Text style={styles.routeLabel}>DROPOFF</Text>
            <Text style={styles.routeAddress}>{ride?.dropoff_address || 'Destination'}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.cancelRideBtn} onPress={handleCancel}>
        <Text style={styles.cancelRideText}>Cancel Ride</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInProgress = () => {
    const remainingKm = tripDistanceRemaining ?? totalDistance;
    const etaMinutes = remainingKm > 0 ? Math.ceil(remainingKm / 0.5) : 0;
    return (
      <View style={styles.inProgressOverlay}>
        {renderETAHeader()}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Trip Progress</Text>
            <Text style={styles.progressEta}>{etaMinutes > 0 ? `${etaMinutes} min` : 'Arriving'}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, tripProgress))}%` as any }]} />
          </View>
          <View style={styles.progressDistRow}>
            <Text style={styles.progressDistText}>{(totalDistance - remainingKm).toFixed(1)} km</Text>
            <Text style={styles.progressDistText}>{remainingKm.toFixed(1)} km</Text>
          </View>
        </View>
        <SOSButton rideId={rideId} latitude={pickupCoord.latitude} longitude={pickupCoord.longitude} />
        <View style={styles.inProgressBottom}>
          <TouchableOpacity style={styles.inProgressActionBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble" size={20} color={colors.brand} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelRideBtn} onPress={handleCancel}>
            <Text style={styles.cancelRideText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCompleted = () => (
    <Modal visible={showCompletion} transparent animationType="none">
      <View style={styles.completionOverlay}>
        <Animated.View
          style={[
            styles.completionCard,
            { transform: [{ scale: completionScale }] },
          ]}
        >
          <View style={styles.successCircle}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.completionTitle}>Trip Complete!</Text>
          <Text style={styles.completionSub}>
            You've arrived at {ride?.dropoff_address || 'your destination'}
          </Text>

          <View style={styles.completionSummary}>
            <View style={styles.completionSummaryRow}>
              <Text style={styles.completionSummaryLabel}>Trip Fare</Text>
              <Text style={styles.completionSummaryValue}>
                {ride?.total_fare ? formatZAR(ride.total_fare) : 'R0.00'}
              </Text>
            </View>
            <View style={styles.completionSummaryRow}>
              <Text style={styles.completionSummaryLabel}>Payment</Text>
              <Text style={styles.completionSummaryValue}>
                {ride?.payment_method === 'cash' ? 'Cash' : 'Card'}
              </Text>
            </View>
            <View style={[styles.completionSummaryRow, styles.completionSummaryTotal]}>
              <Text style={styles.completionTotalLabel}>Total</Text>
              <Text style={styles.completionTotalValue}>
                {ride?.total_fare ? formatZAR(ride.total_fare) : 'R0.00'}
              </Text>
            </View>
          </View>

          {!ratingSubmitted ? (
            <>
              <Text style={styles.ratingTitle}>Rate your trip</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= rating ? colors.warning : colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {rating > 0 && (
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Add a comment (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                />
              )}

              <View style={styles.tipSection}>
                <Text style={styles.tipSectionLabel}>Add a tip (optional)</Text>
                <View style={styles.tipRow}>
                  {TIP_AMOUNTS.map(amount => (
                    <TouchableOpacity
                      key={amount}
                      style={[styles.tipChip, selectedTip === amount && styles.tipChipSelected]}
                      onPress={() => setSelectedTip(selectedTip === amount ? null : amount)}
                    >
                      <Text style={[styles.tipChipText, selectedTip === amount && styles.tipChipTextSelected]}>
                        R{amount}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitRatingBtn}
                onPress={handleRate}
                disabled={ratingLoading || rating === 0}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF6A00', '#E25500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitRatingGradient}
                >
                  {ratingLoading ? (
                    <ActivityIndicator color={colors.brandContrast} />
                  ) : (
                    <Text style={styles.submitRatingText}>Submit Rating</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.ratingDoneSection}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={styles.ratingDoneText}>Rating submitted. Thank you!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.shareTripBtn} onPress={handleShareTrip}>
            <Ionicons name="share-outline" size={18} color={colors.brand} />
            <Text style={styles.shareTripText}>Share trip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <LinearGradient
              colors={['#FF6A00', '#E25500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.doneGradient}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderCancelled = () => (
    <View style={[styles.stateOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
      <View style={styles.cancelledIcon}>
        <Ionicons name="close-circle" size={64} color={colors.danger} />
      </View>
      <Text style={styles.cancelledTitle}>Ride Cancelled</Text>
      <Text style={styles.cancelledSub}>{ride?.cancellation_reason || 'This ride has been cancelled'}</Text>
      <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
        <LinearGradient
          colors={['#FF6A00', '#E25500']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.doneGradient}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading || !ride || !ride.id) {
    if (error) {
      return (
        <View style={styles.container}>
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 100 }}>
            {error}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.stateOverlay, { justifyContent: 'center', padding: 22 }]}>
        <Text style={{ color: colors.danger, textAlign: 'center', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
          Something went wrong
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 22 }}>{error}</Text>
        <GlowButton title="Try Again" onPress={loadRide} size="md" />
      </View>
    );
  }

  const showMap = !['searching', 'completed', 'cancelled'].includes(rideState);

  return (
    <View style={styles.container}>
      <ReconnectionBanner isReconnecting={isReconnecting} reconnectAttempt={reconnectAttempt} />
      {showMap && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
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
      {showMap && (
        <LinearGradient
          colors={['transparent', 'rgba(28,28,30,0.4)', 'rgba(28,28,30,0.95)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
      )}
      {rideState === 'searching' && renderSearching()}
      {rideState === 'accepted' && renderAccepted()}
      {rideState === 'arrived' && renderAccepted()}
      {rideState === 'in_progress' && renderInProgress()}
      {rideState === 'completed' && renderCompleted()}
      {rideState === 'cancelled' && renderCancelled()}
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { ...StyleSheet.absoluteFillObject },
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 350,
  },
  stateOverlay: { flex: 1 },

  /* Map Pins */
  mapPin: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 3, borderColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  mapPinInner: { width: '100%', height: '100%', borderRadius: 8 },

  /* Searching */
  searchingContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22,
  },
  radarContainer: {
    width: 120, height: 120,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  radarInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface,
    borderWidth: 3, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  searchingTitle: {
    fontSize: 22, fontWeight: '700', color: colors.text,
    marginBottom: 8,
  },
  searchingSub: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'center', marginBottom: 24,
  },
  searchingInfoCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 16,
  },
  searchingInfoRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  searchingInfoLabel: {
    fontSize: 15, fontWeight: '600', color: colors.text,
  },
  searchingInfoSub: {
    fontSize: 12, color: colors.textMuted, marginTop: 2,
  },
  searchingInfoPrice: {
    fontSize: 18, fontWeight: '700', color: colors.brand,
  },
  cancelRequestBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  cancelRequestText: {
    fontSize: 15, fontWeight: '600', color: colors.danger,
  },

  /* Accepted */
  acceptedHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 18,
  },
  acceptedHeaderContent: { paddingHorizontal: 18 },
  acceptedLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.6,
  },
  acceptedEta: {
    fontSize: 36, fontWeight: '800', color: colors.white, marginTop: 4,
  },
  arrivingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,106,0,0.2)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginTop: 8,
  },
  arrivingBadgeText: {
    fontSize: 11, fontWeight: '700', color: colors.brand,
    letterSpacing: 1,
  },

  /* Driver Info */
  driverInfoCard: {
    marginHorizontal: 18, marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  driverInfoRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  driverInfoName: {
    fontSize: 16, fontWeight: '700', color: colors.text,
  },
  driverInfoMeta: {
    fontSize: 12, color: colors.textMuted, marginTop: 1,
  },
  driverActionBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,106,0,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Route Card */
  routeCard: {
    flexDirection: 'row', gap: 12,
    marginHorizontal: 18, marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  routeDotRow: { alignItems: 'center', paddingTop: 4 },
  routeDotGreen: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.success,
  },
  routeLineConnector: {
    width: 2, height: 24,
    backgroundColor: colors.border, marginVertical: 2,
  },
  routeLabel: {
    fontSize: 10, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 1,
  },

  /* In Progress */
  inProgressOverlay: { flex: 1 },
  etaHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 14,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  etaHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  etaDriverName: { fontSize: 16, fontWeight: '700', color: colors.text },
  etaDriverVehicle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  etaRight: { alignItems: 'flex-end' },
  etaValue: {
    fontSize: 18, fontWeight: '800', color: colors.brand,
  },
  etaLabel: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  progressCard: {
    marginHorizontal: 18, marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10,
  },
  progressLabel: { fontSize: 12, color: colors.textMuted },
  progressEta: { fontSize: 14, fontWeight: '700', color: colors.brand },
  progressTrack: {
    height: 8, backgroundColor: colors.border,
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.brand },
  progressDistRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 6,
  },
  progressDistText: { fontSize: 11, color: colors.textMuted },

  /* SOS */
  sosButton: {
    position: 'absolute', top: 140, right: 18,
    width: 60, height: 60,
    justifyContent: 'center', alignItems: 'center',
  },
  sosInner: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.danger,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.danger, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  sosText: {
    fontSize: 9, fontWeight: '700', color: colors.danger,
    marginTop: 2,
  },

  /* In Progress Bottom */
  inProgressBottom: {
    position: 'absolute', bottom: 40, left: 18, right: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  inProgressActionBtn: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelRideBtn: {
    flex: 1,
    borderWidth: 1.5, borderColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 15, alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.1)',
  },
  cancelRideText: {
    fontSize: 14, fontWeight: '600', color: colors.danger,
  },

  /* Completion Modal */
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  completionCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    alignItems: 'center',
    maxHeight: Dimensions.get('window').height * 0.9,
  },
  successCircle: { marginBottom: 16, marginTop: 8 },

  completionTitle: {
    fontSize: 24, fontWeight: '700', color: colors.text,
    marginBottom: 6,
  },
  completionSub: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'center', marginBottom: 20,
  },

  completionSummary: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18, padding: 18,
    marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  completionSummaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  completionSummaryLabel: { fontSize: 14, color: colors.textMuted },
  completionSummaryValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  completionSummaryTotal: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 12, marginTop: 8, marginBottom: 0,
  },
  completionTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  completionTotalValue: { fontSize: 20, fontWeight: '700', color: colors.brand },

  /* Rating */
  ratingTitle: {
    fontSize: 16, fontWeight: '700', color: colors.text,
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row', gap: 6, marginBottom: 16,
  },
  feedbackInput: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    padding: 14,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },

  /* Tip */
  tipSection: { width: '100%', marginBottom: 16 },
  tipSectionLabel: {
    fontSize: 13, color: colors.textMuted,
    marginBottom: 10, textAlign: 'center',
  },
  tipRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  tipChip: {
    paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  tipChipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  tipChipText: {
    fontSize: 15, fontWeight: '700', color: colors.brand,
  },
  tipChipTextSelected: { color: colors.brandContrast },

  submitRatingBtn: {
    width: '100%',
    borderRadius: 16, overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#FF6A00', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  submitRatingGradient: {
    paddingVertical: 16, alignItems: 'center',
  },
  submitRatingText: {
    fontSize: 16, fontWeight: '700', color: colors.brandContrast,
  },

  ratingDoneSection: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16,
  },
  ratingDoneText: {
    fontSize: 15, fontWeight: '600', color: colors.success,
  },

  shareTripBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 16, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  shareTripText: { fontSize: 14, color: colors.brand },

  doneBtn: {
    width: '100%',
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#FF6A00', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  doneGradient: {
    paddingVertical: 16, alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16, fontWeight: '700', color: colors.brandContrast,
  },

  /* Cancelled */
  cancelledIcon: { marginBottom: 18 },
  cancelledTitle: {
    fontSize: 22, fontWeight: '700', color: colors.text,
    marginBottom: 6,
  },
  cancelledSub: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'center', marginBottom: 22,
  },
});

export default RideTrackingScreenInner;
