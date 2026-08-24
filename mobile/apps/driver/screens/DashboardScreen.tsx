import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, AppState, ScrollView, RefreshControl, Text, SafeAreaView, Animated, Dimensions, Linking, Platform, Vibration } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
let TaskManager: typeof import('expo-task-manager') | null = null;
try {
  TaskManager = require('expo-task-manager');
} catch (e) {
  console.warn('[Driver] expo-task-manager not available:', e);
}
import MapView, { Marker } from 'react-native-maps';
import { useAuth, useSocket, drivers, foodDelivery, AnimatedNumber, Avatar, useTheme } from '@easyryde/shared';
import type { DriverNav } from '@easyryde/shared';
import type MapViewType from 'react-native-maps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKGROUND_LOCATION_TASK = 'background-location-task';

if (TaskManager) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) { console.warn('[BackgroundLocation] Error:', error.message); return; }
    if (data && typeof data === 'object' && 'locations' in data) {
      const locations = data.locations as Location.LocationObject[];
      for (const loc of locations) {
        const { latitude, longitude } = loc.coords;
        drivers.updateLocation(latitude, longitude).catch(() => {});
      }
    }
  });
}

type RideRequest = {
  rideId: string;
  riderId: string;
  type: string;
  price: number;
  distance: string;
  duration: string;
  pickup: { name: string; address: string };
  destination: { name: string; address: string };
  passenger: { name: string; rating: number; avatar: string; phone: string };
};

type RideStatus = 'idle' | 'online' | 'request' | 'to_pickup' | 'arrived' | 'in_progress' | 'completed';


export default function DashboardScreen({ navigation }: { navigation: DriverNav }) {
  const { user, token } = useAuth();
  const { isConnected, isReconnecting, emit, on, socket } = useSocket({ token: token || '' });
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState({ today: 0, total: 0, trips: 0, rating: 4.8, hours: 0 });
  const [pendingFoodOrders, setPendingFoodOrders] = useState(0);
  const [locationWatcher, setLocationWatcher] = useState<Location.LocationSubscription | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [currentRequest, setCurrentRequest] = useState<RideRequest | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [showOnlineOverlay, setShowOnlineOverlay] = useState(false);
  const [tripProgress, setTripProgress] = useState(0);
  const [tripEarnings, setTripEarnings] = useState(0);
  const [rating, setRating] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyRequestsCount, setNearbyRequestsCount] = useState(0);
  const [tripETA, setTripETA] = useState(0);
  const mapRef = useRef<MapViewType>(null);
  const appState = useRef(AppState.currentState);
  const isOnlineRef = useRef(false);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bellAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const sosPulse = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const { colors, radius, spacing, shadows } = useTheme();
  const ORANGE_GRADIENT: [string, string] = [colors.brand, colors.brandStrong];
  const GREEN_GRADIENT: [string, string] = [colors.brand, colors.brandStrong];
  const styles = makeStyles(colors, spacing, radius, shadows);

  const vehicle = (user as any)?.vehicle;
  const driverData = {
    name: user?.name || 'Driver',
    vehicle: vehicle ? `${vehicle.make} ${vehicle.model}` : 'No vehicle registered',
    plate: vehicle?.license_plate || '—',
    color: vehicle?.color || '—',
    year: vehicle?.year ? String(vehicle.year) : '—',
    acceptanceRate: 96,
    cancellationRate: 2.1,
    zone: 'Phalaborwa CBD',
    zoneDemand: '1.4x',
  };

  useEffect(() => {
    if (isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isOnline]);

  useEffect(() => {
    if (rideStatus === 'request' && currentRequest) {
      Vibration.vibrate([0, 300, 100, 300], true);
      Animated.sequence([
        Animated.timing(bellAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 8 }).start();
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }).start();
      return () => { Vibration.cancel(); };
    }
  }, [rideStatus, currentRequest]);

  useEffect(() => {
    if (rideStatus === 'to_pickup' || rideStatus === 'in_progress') {
      const sos = Animated.loop(
        Animated.sequence([
          Animated.timing(sosPulse, { toValue: 0.6, duration: 600, useNativeDriver: true }),
          Animated.timing(sosPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      sos.start();
      return () => sos.stop();
    }
  }, [rideStatus]);

  async function loadEarnings() {
    try {
      const data: any = await drivers.earnings();
      setEarnings({
        today: data.today_earnings,
        total: data.total_earnings,
        trips: data.total_trips,
        rating: data.rating || 4.8,
        hours: data.hours_online || 0,
      });
    } catch (err) { console.warn('Failed to load earnings:', err); }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEarnings().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => { loadEarnings(); }, []);

  useEffect(() => {
    if (!isOnline) return;
    const poll = async () => {
      try {
        const orders = await foodDelivery.availableOrders();
        setPendingFoodOrders(orders.filter((o: any) => o.status === 'pending' && !o.driver_id).length);
      } catch (err) { console.warn('Failed to poll food orders:', err); }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      try {
        const request: RideRequest = {
          rideId: data.rideId, riderId: data.riderId, type: data.category || 'EasyRyde',
          price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 85,
          distance: data.distance != null ? `${Number(data.distance).toFixed(1)} km` : '2.4 km',
          duration: data.duration != null ? `${data.duration} min` : '15 min',
          pickup: { name: data.pickupName || 'Pickup', address: data.pickupAddress || 'Pickup location' },
          destination: { name: data.destName || 'Destination', address: data.destAddress || 'Destination' },
          passenger: { name: data.riderName || 'Passenger', rating: data.riderRating || 4.8, avatar: data.riderAvatar || '', phone: data.riderPhone || '' },
        };
        setCurrentRequest(request);
        setRideStatus('request');
        setCountdown(15);
        setNearbyRequestsCount((prev) => prev + 1);
      } catch (err) { console.warn('[Driver] ride:request handler error:', err); }
    };
    socket.on('ride:request', handler);
    return () => { socket.off('ride:request', handler); };
  }, [socket]);

  useEffect(() => {
    if (rideStatus !== 'request') return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [rideStatus]);

  useEffect(() => {
    if (rideStatus !== 'request' || countdown !== 0) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    declineRide();
  }, [countdown, rideStatus]);

  useEffect(() => {
    checkLocationPermission();
    return () => { watcherRef.current?.remove(); };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/active|foreground/) && nextAppState === 'background') {
        if (isOnlineRef.current) startBackgroundLocation();
      }
      if (appState.current === 'background' && nextAppState === 'active') {
        if (isOnlineRef.current) { stopBackgroundLocation(); startForegroundLocation(); }
      }
      appState.current = nextAppState;
    });
    return () => { subscription.remove(); };
  }, []);

  async function checkLocationPermission() {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') await requestLocationPermission();
  }

  async function requestLocationPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission denied', 'Location permission is required to go online'); return false; }
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return bgStatus === 'granted';
  }

  async function startForegroundLocation() {
    const watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 50 },
      (location) => {
        const { latitude, longitude } = location.coords;
        setCurrentLocation({ latitude, longitude });
        emit('driver:location-update', { latitude, longitude });
        drivers.updateLocation(latitude, longitude).catch(() => {});
      },
    );
    setLocationWatcher(watcher);
    watcherRef.current = watcher;
  }

  async function startBackgroundLocation() {
    if (!TaskManager) { console.warn('[Driver] TaskManager unavailable, skipping background location'); return; }
    const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') { await Location.requestBackgroundPermissionsAsync(); return; }
    const isTaskDefined = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (!isTaskDefined) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced, distanceInterval: 100, deferredUpdatesInterval: 30000,
        showsBackgroundLocationIndicator: true,
        foregroundService: { notificationTitle: 'EasyRyde Driver', notificationBody: 'Tracking your location for ride requests', notificationColor: '#FF6A00' },
      });
    }
  }

  function stopForegroundLocation() { locationWatcher?.remove(); watcherRef.current = null; setLocationWatcher(null); }
  async function stopBackgroundLocation() {
    if (!TaskManager) return;
    const isTaskDefined = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isTaskDefined) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  const toggleOnline = async () => {
    try {
      const result = await drivers.toggleOnline(!isOnline);
      setIsOnline(result.is_online);
      isOnlineRef.current = result.is_online;
      if (result.is_online) {
        await requestLocationPermission();
        await startForegroundLocation();
        setShowOnlineOverlay(true);
        setTimeout(() => setShowOnlineOverlay(false), 2000);
      } else {
        stopForegroundLocation();
        stopBackgroundLocation();
      }
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  function acceptRide() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (currentRequest) {
      emit('driver:accept-ride', { rideId: currentRequest.rideId, riderId: currentRequest.riderId });
      setTripEarnings(currentRequest.price);
    }
    setRideStatus('to_pickup');
    setNearbyRequestsCount((prev) => Math.max(0, prev - 1));
  }

  function declineRide() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCurrentRequest(null);
    setRideStatus('online');
    setNearbyRequestsCount((prev) => Math.max(0, prev - 1));
  }

  function startTrip() {
    if (currentRequest) {
      emit('ride:start', { rideId: currentRequest.rideId, otherUserId: currentRequest.riderId });
    }
    setRideStatus('in_progress');
    setTripProgress(0);
  }

  function continueDriving() { setCurrentRequest(null); setRideStatus('online'); setTripProgress(0); setRating(0); }
  function goOffline() { toggleOnline(); setCurrentRequest(null); setRideStatus('idle'); setTripProgress(0); setRating(0); }

  const bellRotation = bellAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '15deg', '-15deg'],
  });

  const renderOnlineContent = () => (
    <SafeAreaView style={styles.overlayContainer}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.success} />}>
        <LinearGradient colors={[colors.brand, colors.brandStrong] as const} style={styles.topSection}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},</Text>
              <Text style={styles.driverName}>{driverData.name}</Text>
            </View>
            <View style={styles.topBarRight}>
              {pendingFoodOrders > 0 && (
                <TouchableOpacity style={styles.foodBadge}>
                  <Ionicons name="restaurant" size={14} color={colors.brandContrast} />
                  <Text style={styles.foodBadgeText}>{pendingFoodOrders}</Text>
                </TouchableOpacity>
              )}
              <Avatar name={driverData.name} size={48} style={styles.avatar} />
            </View>
          </View>
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>TODAY'S EARNINGS</Text>
            <Text style={styles.earningsValue}>R{earnings.today.toFixed(0)}</Text>
            <View style={styles.earningsRow}>
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatValue}>{earnings.trips}</Text>
                <Text style={styles.earningsStatLabel}>Trips</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatValue}>{earnings.rating}</Text>
                <Text style={styles.earningsStatLabel}>Rating</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatValue}>{earnings.hours}h</Text>
                <Text style={styles.earningsStatLabel}>Online</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentSection}>
          <View style={[styles.toggleCard]}>            <View style={styles.toggleLeft}>
              <Animated.View style={[styles.toggleIconWrap, isOnline && styles.toggleIconOnline, { transform: [{ scale: isOnline ? pulseAnim : 1 }] }]}>
                <Ionicons name={isOnline ? 'wifi' : 'wifi-outline'} size={22} color={isOnline ? colors.white : colors.textMuted} />
              </Animated.View>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>{isOnline ? "You're Online" : 'Go Online'}</Text>
                <View style={styles.statusPill}>
                  <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.danger }]} />
                  <Text style={[styles.statusText, { color: isOnline ? colors.success : colors.textMuted }]}>
                    {isOnline ? 'Online - Looking for trips' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity testID="toggleOnline" style={[styles.toggleSwitch, isOnline && styles.toggleSwitchActive]} onPress={toggleOnline} activeOpacity={0.8}>
              <View style={[styles.toggleKnob, isOnline && styles.toggleKnobActive]} />
            </TouchableOpacity>
          </View>

          {isOnline && (
            <View style={styles.zoneCard}>
              <Text style={styles.sectionLabel}>CURRENT ZONE</Text>
              <View style={styles.zoneContent}>
                <View style={styles.zoneIcon}>
                  <Ionicons name="location" size={24} color={colors.brand} />
                </View>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{driverData.zone}</Text>
                  <Text style={styles.zoneSubtext}>High demand area</Text>
                </View>
                <View style={styles.zoneDemand}>
                  <Text style={styles.zoneDemandText}>{driverData.zoneDemand}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.vehicleCard}>
            <Text style={styles.sectionLabel}>VEHICLE</Text>
            <View style={styles.vehicleContent}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car" size={24} color={colors.success} />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{driverData.vehicle}</Text>
                <Text style={styles.vehicleDetails}>{driverData.color} - {driverData.plate} - {driverData.year}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{driverData.acceptanceRate}%</Text>
              <Text style={styles.statLabel}>Acceptance</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.danger }]}>{driverData.cancellationRate}%</Text>
              <Text style={styles.statLabel}>Cancellation</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{earnings.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {isOnline && (
            <TouchableOpacity onPress={() => {}} style={styles.simulateBtn} activeOpacity={0.8}>
              <LinearGradient colors={ORANGE_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.simulateBtnGrad}>
                <Ionicons name="notifications" size={18} color={colors.brandContrast} />
                <Text style={styles.simulateBtnText}>Simulate Ride Request</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );

  const renderRequestOverlay = () => {
    if (!currentRequest) return null;
    const slideUp = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });
    const scaleVal = scaleAnim.interpolate({ inputRange: [0.9, 1], outputRange: [0.9, 1] });
    return (
      <View style={styles.requestContainer}>
        <View style={styles.countdownTrack}>
          <LinearGradient colors={ORANGE_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.countdownFill, { width: `${(countdown / 15) * 100}%` }]} />
        </View>
        <Animated.View style={[styles.requestContent, { transform: [{ translateY: slideUp }, { scale: scaleVal }] }]}>
          <View style={styles.requestHeader}>
            <Animated.View style={[styles.bellWrap, { transform: [{ rotate: bellRotation }] }]}>
              <Ionicons name="notifications" size={32} color={colors.brand} />
            </Animated.View>
            <Text style={styles.requestSubtitle}>New ride request!</Text>
            <Text style={styles.requestCountdown}><Text style={styles.requestCountdownNum}>{countdown}</Text> seconds to accept</Text>
          </View>

          <View style={styles.requestCard}>
            <View style={styles.requestCardTop}>
              <View style={styles.rideTypeBadge}>
                <Text style={styles.rideTypeText}>{currentRequest.type}</Text>
              </View>
              <View style={styles.requestPriceArea}>
                <Text style={styles.requestPrice}>R{currentRequest.price.toFixed(0)}</Text>
                <Text style={styles.requestMeta}>{currentRequest.distance} - {currentRequest.duration}</Text>
              </View>
            </View>

            <View style={styles.riderSection}>
              <Avatar name={currentRequest.passenger.name} size={64} style={styles.riderAvatar} />
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{currentRequest.passenger.name}</Text>
                <View style={styles.riderRatingRow}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={styles.riderRating}>{currentRequest.passenger.rating}</Text>
                </View>
              </View>
            </View>

            <View style={styles.locationSection}>
              <View style={styles.locationBlock}>
                <View style={styles.locationDot} />
                <View style={styles.locationTextWrap}>
                  <Text style={styles.locationLabel}>PICKUP</Text>
                  <Text style={styles.locationName}>{currentRequest.pickup.name}</Text>
                  <Text style={styles.locationAddress}>{currentRequest.pickup.address}</Text>
                </View>
              </View>
              <View style={styles.locationConnector} />
              <View style={styles.locationBlock}>
                <View style={styles.locationPin}>
                  <Ionicons name="location" size={12} color={colors.brand} />
                </View>
                <View style={styles.locationTextWrap}>
                  <Text style={styles.locationLabel}>DROPOFF</Text>
                  <Text style={styles.locationName}>{currentRequest.destination.name}</Text>
                  <Text style={styles.locationAddress}>{currentRequest.destination.address}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.requestActions}>
            <TouchableOpacity style={styles.declineBtn} onPress={declineRide} activeOpacity={0.8}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptRide} activeOpacity={0.8}>
              <LinearGradient colors={GREEN_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptBtnGrad}>
                <Ionicons name="checkmark-circle" size={20} color={colors.brandContrast} />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderToPickup = () => (
    <View style={styles.rideOverlay}>
      <SafeAreaView style={styles.rideSafe}>
        <View style={styles.rideTopHeader}>
          <View style={styles.etaRow}>
            <View style={styles.etaLeft}>
              <View style={styles.etaIconWrap}>
                <Ionicons name="navigate" size={20} color={colors.brand} />
              </View>
              <View>
                <Text style={styles.etaLabel}>ARRIVING IN</Text>
                <Text style={styles.etaValue}>{currentRequest?.distance || '2.4 km'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => { if (currentRequest) emit('ride:cancel', { rideId: currentRequest.rideId, reason: 'Driver cancelled' }); setRideStatus('online'); setCurrentRequest(null); }}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.pickupAddrCard}>
            <View style={styles.pickupDot} />
            <View style={styles.pickupAddrInfo}>
              <Text style={styles.pickupAddrName}>{currentRequest?.pickup.name || 'Pickup'}</Text>
              <Text style={styles.pickupAddrDetail}>{currentRequest?.pickup.address || ''}</Text>
            </View>
          </View>
        </View>
        <View style={styles.orangeBanner}>
          <Ionicons name="person" size={14} color={colors.brandContrast} />
          <Text style={styles.bannerText}>{currentRequest?.passenger.name || 'Passenger'} wants to be picked up</Text>
        </View>
      </SafeAreaView>
      <Animated.View style={[styles.sosFloat, { transform: [{ scale: sosPulse }] }]}>
        <TouchableOpacity style={styles.sosBtn} onPress={() => Alert.alert('SOS', 'Emergency!')}>
          <Ionicons name="warning" size={18} color={colors.white} />
        </TouchableOpacity>
      </Animated.View>
      <SafeAreaView style={styles.bottomSafe}>
        <TouchableOpacity style={styles.arrivedBtn} onPress={() => { if (currentRequest) { emit('driver:arrived', { rideId: currentRequest.rideId, riderId: currentRequest.riderId }); } setRideStatus('arrived'); }} activeOpacity={0.8}>
          <LinearGradient colors={GREEN_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.arrivedBtnGrad}>
            <Ionicons name="checkmark-circle" size={22} color={colors.brandContrast} />
            <Text style={styles.arrivedBtnText}>Arrived at Pickup</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );

  const renderArrived = () => (
    <View style={styles.rideOverlay}>
      <SafeAreaView style={styles.rideSafe}>
        <LinearGradient colors={[colors.brand, colors.brandStrong] as const} style={styles.arrivedHeader}>
          <View style={styles.arrivedCheckWrap}>
            <Ionicons name="checkmark-circle" size={52} color={colors.brandContrast} />
          </View>
          <Text style={styles.arrivedTitle}>You've Arrived</Text>
          <Text style={styles.arrivedSubtitle}>Waiting for {currentRequest?.passenger.name}</Text>
        </LinearGradient>
        <View style={styles.arrivedBody}>
          <View style={styles.riderContactCard}>
            <Avatar name={currentRequest?.passenger.name || 'P'} size={52} style={styles.riderContactAvatar} />
            <View style={styles.riderContactInfo}>
              <Text style={styles.riderContactName}>{currentRequest?.passenger.name || 'Passenger'}</Text>
              <Text style={styles.riderContactPhone}>{currentRequest?.passenger.phone || ''}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => currentRequest?.passenger.phone && Linking.openURL(`tel:${currentRequest.passenger.phone}`)}>
              <Ionicons name="call" size={20} color={colors.success} />
            </TouchableOpacity>
          </View>
          <View style={styles.arrivedAddrCard}>
            <View style={styles.dotRow}>
              <View style={styles.smallDot} />
              <Text style={styles.arrivedAddrText}>{currentRequest?.pickup.name || 'Pickup'}</Text>
            </View>
            <View style={styles.pinRow}>
              <Ionicons name="location" size={14} color={colors.brand} />
              <Text style={styles.arrivedAddrText}>{currentRequest?.destination.name || 'Destination'}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
      <SafeAreaView style={styles.bottomSafe}>
        <TouchableOpacity style={styles.startTripBtn} onPress={startTrip} activeOpacity={0.8}>
          <LinearGradient colors={ORANGE_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startTripBtnGrad}>
            <Ionicons name="flag" size={22} color={colors.brandContrast} />
            <Text style={styles.startTripBtnText}>Start Trip</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );

  const renderInProgress = () => (
    <View style={styles.rideOverlay}>
      <SafeAreaView style={styles.rideSafe}>
        <LinearGradient colors={[colors.brand, colors.brandStrong] as const} style={styles.tripHeader}>
          <View style={styles.tripHeaderRow}>
            <View>
              <Text style={styles.tripStatusLabel}>TRIP IN PROGRESS</Text>
              <Text style={styles.tripEta}>{currentRequest?.duration || '15 min'}</Text>
            </View>
            <View style={styles.tripFareCol}>
              <Text style={styles.tripFareLabel}>FARE</Text>
              <Text style={styles.tripFareValue}>R{currentRequest?.price.toFixed(0) || '0'}</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.tripBody}>
          <View style={styles.tripRoute}>
            <View style={styles.tripRouteItem}>
              <View style={styles.smallDot} />
              <Text style={styles.tripRouteText}>{currentRequest?.pickup.name || 'Pickup'}</Text>
            </View>
            <View style={styles.routeDash} />
            <View style={styles.tripRouteItem}>
              <Ionicons name="location" size={14} color={colors.brand} />
              <Text style={styles.tripRouteText}>{currentRequest?.destination.name || 'Destination'}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
      <Animated.View style={[styles.sosFloat, { transform: [{ scale: sosPulse }] }]}>
        <TouchableOpacity style={styles.sosBtn} onPress={() => Alert.alert('SOS', 'Emergency!')}>
          <Ionicons name="warning" size={18} color={colors.white} />
        </TouchableOpacity>
      </Animated.View>
      <SafeAreaView style={styles.bottomSafe}>
        <TouchableOpacity style={styles.completeBtn} onPress={() => { if (currentRequest) { emit('ride:complete', { rideId: currentRequest.rideId, otherUserId: currentRequest.riderId, fare: currentRequest.price }); } setRideStatus('completed'); }} activeOpacity={0.8}>
          <LinearGradient colors={GREEN_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.completeBtnGrad}>
            <Ionicons name="checkmark-circle" size={22} color={colors.brandContrast} />
            <Text style={styles.completeBtnText}>Complete Trip</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );

  const renderCompleted = () => (
    <SafeAreaView style={styles.completedOverlay}>
      <ScrollView contentContainerStyle={styles.completedContent}>
        <View style={styles.completedCheckWrap}>
          <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        </View>
        <Text style={styles.completedTitle}>Trip Complete!</Text>
        <Text style={styles.completedSubtext}>Great job, {driverData.name}</Text>

        <View style={styles.completedEarningsCard}>
          <Text style={styles.completedEarningsLabel}>Trip Earnings</Text>
          <Text style={styles.completedEarningsValue}>R{tripEarnings.toFixed(0)}</Text>
          <Text style={styles.completedEarningsMeta}>{currentRequest?.distance} - {currentRequest?.duration}</Text>
        </View>

        <View style={styles.completedDetailsCard}>
          <Text style={styles.completedDetailsTitle}>Trip Details</Text>
          <View style={styles.completedDetailRow}>
            <Ionicons name="person" size={16} color={colors.brand} />
            <Text style={styles.completedDetailText}>{currentRequest?.passenger.name || 'Passenger'}</Text>
          </View>
          <View style={styles.completedDetailRow}>
            <Ionicons name="location" size={16} color={colors.success} />
            <Text style={styles.completedDetailText}>{currentRequest?.pickup.name || 'Pickup'}</Text>
          </View>
          <View style={styles.completedDetailRow}>
            <Ionicons name="flag" size={16} color={colors.brand} />
            <Text style={styles.completedDetailText}>{currentRequest?.destination.name || 'Destination'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={continueDriving} activeOpacity={0.8}>
          <LinearGradient colors={ORANGE_GRADIENT as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueBtnGrad}>
            <Text style={styles.continueBtnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  const renderContent = () => {
    switch (rideStatus) {
      case 'request': return renderRequestOverlay();
      case 'to_pickup': return renderToPickup();
      case 'arrived': return renderArrived();
      case 'in_progress': return renderInProgress();
      case 'completed': return renderCompleted();
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      {(rideStatus === 'idle' || rideStatus === 'online') && currentLocation && isOnline && (
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}
          initialRegion={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
          <Marker coordinate={currentLocation}>
            <Animated.View style={[styles.markerWrap, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient colors={[colors.brand, colors.brandStrong]} style={styles.markerInner}>
                <Ionicons name="car" size={20} color={colors.brandContrast} />
              </LinearGradient>
              <View style={styles.markerPulse} />
            </Animated.View>
          </Marker>
        </MapView>
      )}

      {rideStatus === 'idle' || rideStatus === 'online' ? (
        renderOnlineContent()
      ) : (
        renderContent()
      )}

      {showOnlineOverlay && (
        <View style={styles.onlineOverlay}>
          <View style={styles.onlineCard}>
            <View style={styles.onlineCheckWrap}>
              <Ionicons name="checkmark" size={36} color={colors.success} />
            </View>
            <Text style={styles.onlineTitle}>You're Online!</Text>
            <Text style={styles.onlineSubtitle}>You'll receive ride requests shortly</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: any, spacing: any, radius: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  topSection: { paddingHorizontal: spacing.base, paddingTop: 48, paddingBottom: spacing.lg, borderBottomLeftRadius: radius['3xl'], borderBottomRightRadius: radius['3xl'] },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
  greeting: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  driverName: { fontSize: 22, fontWeight: '700', color: colors.brandContrast },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  foodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  foodBadgeText: { fontSize: 12, fontWeight: '700', color: colors.brandContrast },
  avatar: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },

  earningsCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.xl, padding: spacing.lg },
  earningsLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.6, marginBottom: spacing.xs },
  earningsValue: { fontSize: 36, fontWeight: '800', color: colors.brandContrast, marginBottom: spacing.base },
  earningsRow: { flexDirection: 'row', alignItems: 'center' },
  earningsStat: { flex: 1, alignItems: 'center' },
  earningsDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },
  earningsStatValue: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  earningsStatLabel: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  contentSection: { padding: spacing.base, gap: spacing.md },

  toggleCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
  toggleIconWrap: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  toggleIconOnline: { backgroundColor: colors.success },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  toggleSwitch: { width: 64, height: 36, borderRadius: 18, backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 4 },
  toggleSwitchActive: { backgroundColor: colors.success },
  toggleKnob: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.text },
  toggleKnobActive: { alignSelf: 'flex-end' },

  zoneCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.base, borderWidth: 1, borderColor: colors.border },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.md },
  zoneContent: { flexDirection: 'row', alignItems: 'center' },
  zoneIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: 'colors.brandSoft', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 16, fontWeight: '700', color: colors.text },
  zoneSubtext: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
  zoneDemand: { backgroundColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  zoneDemandText: { fontSize: 12, fontWeight: '700', color: colors.brandContrast },

  vehicleCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.base, borderWidth: 1, borderColor: colors.border },
  vehicleContent: { flexDirection: 'row', alignItems: 'center' },
  vehicleIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: 'colors.brandSoft', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: colors.text },
  vehicleDetails: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 11, fontWeight: '600', color: colors.success },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.success },
  statLabel: { fontSize: 11, fontWeight: '400', color: colors.textMuted, marginTop: 4 },

  simulateBtn: { borderRadius: radius.xl, overflow: 'hidden' },
  simulateBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.base, gap: spacing.sm },
  simulateBtnText: { fontSize: 16, fontWeight: '700', color: colors.brandContrast },

  markerWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  markerInner: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: colors.brandContrast, ...shadows.brand },
  markerPulse: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,106,0,0.4)' },

  requestContainer: { flex: 1, backgroundColor: colors.bg },
  countdownTrack: { height: 4, backgroundColor: colors.border },
  countdownFill: { height: '100%' },
  requestContent: { flex: 1, padding: spacing.base },
  requestHeader: { alignItems: 'center', marginBottom: spacing.base },
  bellWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'colors.brandSoft', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  requestSubtitle: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  requestCountdown: { fontSize: 18, fontWeight: '600', color: colors.textMuted, marginTop: spacing.xs },
  requestCountdownNum: { fontSize: 32, fontWeight: '800', color: colors.brand },

  requestCard: { backgroundColor: colors.surface, borderRadius: radius['2xl'], padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.base },
  requestCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.base },
  rideTypeBadge: { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  rideTypeText: { fontSize: 12, fontWeight: '700', color: colors.brandContrast },
  requestPriceArea: { alignItems: 'flex-end' },
  requestPrice: { fontSize: 28, fontWeight: '800', color: colors.brand },
  requestMeta: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },

  riderSection: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base },
  riderAvatar: { marginRight: spacing.md, borderWidth: 2, borderColor: colors.brand },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 18, fontWeight: '700', color: colors.text },
  riderRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  riderRating: { fontSize: 14, fontWeight: '500', color: colors.text },

  locationSection: { gap: 4 },
  locationBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  locationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, marginTop: 6 },
  locationPin: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: 'colors.brandSoft', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  locationTextWrap: { flex: 1 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  locationName: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  locationAddress: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
  locationConnector: { height: 12, width: 2, backgroundColor: colors.border, marginLeft: 14 },

  requestActions: { flexDirection: 'row', gap: spacing.md },
  declineBtn: { flex: 1, padding: spacing.base, borderRadius: radius.xl, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  declineBtnText: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  acceptBtn: { flex: 1, borderRadius: radius.xl, overflow: 'hidden' },
  acceptBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.base, gap: spacing.sm },
  acceptBtnText: { fontSize: 18, fontWeight: '700', color: colors.brandContrast },

  rideOverlay: { flex: 1, backgroundColor: colors.bg },
  rideSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  rideTopHeader: { backgroundColor: colors.surface, paddingHorizontal: spacing.base, paddingTop: 48, paddingBottom: spacing.base },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  etaLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  etaIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, justifyContent: 'center', alignItems: 'center' },
  etaLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  etaValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  pickupAddrCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success },
  pickupAddrInfo: { flex: 1 },
  pickupAddrName: { fontSize: 15, fontWeight: '600', color: colors.text },
  pickupAddrDetail: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: 2 },

  orangeBanner: { backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  bannerText: { fontSize: 13, fontWeight: '700', color: colors.brandContrast },

  sosFloat: { position: 'absolute', top: 160, right: spacing.base, zIndex: 30 },
  sosBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', ...shadows.brand },

  bottomSafe: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.base, paddingBottom: 32, zIndex: 20 },
  arrivedBtn: { borderRadius: radius.xl, overflow: 'hidden' },
  arrivedBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.base, gap: spacing.sm },
  arrivedBtnText: { fontSize: 18, fontWeight: '700', color: colors.brandContrast },

  arrivedHeader: { paddingVertical: spacing.lg, paddingHorizontal: spacing.base, alignItems: 'center' },
  arrivedCheckWrap: { marginBottom: spacing.sm },
  arrivedTitle: { fontSize: 24, fontWeight: '800', color: colors.brandContrast },
  arrivedSubtitle: { fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },

  arrivedBody: { padding: spacing.base, gap: spacing.md },
  riderContactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  riderContactAvatar: { marginRight: spacing.md, borderWidth: 2, borderColor: colors.success },
  riderContactInfo: { flex: 1 },
  riderContactName: { fontSize: 16, fontWeight: '700', color: colors.text },
  riderContactPhone: { fontSize: 13, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'colors.brandSoft', justifyContent: 'center', alignItems: 'center' },

  arrivedAddrCard: { backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  smallDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  arrivedAddrText: { fontSize: 14, fontWeight: '600', color: colors.text },

  startTripBtn: { borderRadius: radius.xl, overflow: 'hidden' },
  startTripBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.base, gap: spacing.sm },
  startTripBtnText: { fontSize: 18, fontWeight: '700', color: colors.brandContrast },

  tripHeader: { paddingHorizontal: spacing.base, paddingTop: 48, paddingBottom: spacing.base },
  tripHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripStatusLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  tripEta: { fontSize: 28, fontWeight: '800', color: colors.brandContrast, marginTop: 4 },
  tripFareCol: { alignItems: 'flex-end' },
  tripFareLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  tripFareValue: { fontSize: 22, fontWeight: '800', color: colors.brandContrast, marginTop: 4 },

  tripBody: { padding: spacing.base },
  tripRoute: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  tripRouteItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  routeDash: { marginLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.border, borderStyle: 'dashed', height: 16 },
  tripRouteText: { fontSize: 14, fontWeight: '600', color: colors.text },

  completeBtn: { borderRadius: radius.xl, overflow: 'hidden' },
  completeBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.base, gap: spacing.sm },
  completeBtnText: { fontSize: 18, fontWeight: '700', color: colors.brandContrast },

  completedOverlay: { flex: 1, backgroundColor: colors.bg },
  completedContent: { padding: spacing.xl, alignItems: 'center' },
  completedCheckWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'colors.brandSoft', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  completedTitle: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  completedSubtext: { fontSize: 14, fontWeight: '400', color: colors.textMuted, marginBottom: spacing.xl },

  completedEarningsCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius['2xl'], padding: spacing.xl, alignItems: 'center', marginBottom: spacing.base, borderWidth: 1, borderColor: colors.border },
  completedEarningsLabel: { fontSize: 13, fontWeight: '500', color: colors.textMuted, marginBottom: spacing.sm },
  completedEarningsValue: { fontSize: 36, fontWeight: '800', color: colors.success, marginBottom: spacing.xs },
  completedEarningsMeta: { fontSize: 13, fontWeight: '400', color: colors.textMuted },

  completedDetailsCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius['2xl'], padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  completedDetailsTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.md },
  completedDetailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  completedDetailText: { fontSize: 14, fontWeight: '500', color: colors.text },

  continueBtn: { width: '100%', borderRadius: radius.xl, overflow: 'hidden' },
  continueBtnGrad: { padding: spacing.base, alignItems: 'center' },
  continueBtnText: { fontSize: 18, fontWeight: '700', color: colors.brandContrast },

  onlineOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  onlineCard: { backgroundColor: colors.surface, borderRadius: radius['2xl'], padding: spacing.xl, alignItems: 'center', marginHorizontal: spacing.xl, borderWidth: 1, borderColor: colors.border },
  onlineCheckWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'colors.brandSoft', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.base },
  onlineTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  onlineSubtitle: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
});