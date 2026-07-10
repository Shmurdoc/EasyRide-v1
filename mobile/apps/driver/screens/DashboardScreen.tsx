import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, AppState, ScrollView, RefreshControl, Text, SafeAreaView, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useAuth, useSocket, drivers, foodDelivery, COLORS, SPACING, RADIUS, AnimatedNumber, GlassCard, Avatar } from '@easyryde/shared';
import type { DriverNav } from '@easyryde/shared';
import type MapViewType from 'react-native-maps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const mapRef = useRef<MapViewType>(null);
  const appState = useRef(AppState.currentState);
  const isOnlineRef = useRef(false);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const driverData = {
    name: user?.name || 'Driver',
    vehicle: 'Toyota Corolla',
    plate: 'LPS 123 GP',
    color: 'White',
    year: '2023',
    acceptanceRate: 96,
    cancellationRate: 2.1,
    zone: 'Phalaborwa CBD',
    zoneDemand: '1.4x',
  };

  useEffect(() => {
    if (isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isOnline]);

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
          rideId: data.rideId,
          riderId: data.riderId,
          type: data.category || 'EasyRyde',
          price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 85,
          distance: data.distance != null ? `${Number(data.distance).toFixed(1)} km` : '2.4 km',
          duration: data.duration != null ? `${data.duration} min` : '15 min',
          pickup: { name: data.pickupName || 'Pickup', address: data.pickupAddress || 'Pickup location' },
          destination: { name: data.destName || 'Destination', address: data.destAddress || 'Destination' },
          passenger: {
            name: data.riderName || 'Passenger',
            rating: data.riderRating || 4.8,
            avatar: data.riderAvatar || '',
            phone: data.riderPhone || '',
          },
        };
        setCurrentRequest(request);
        setRideStatus('request');
        setCountdown(15);
        setNearbyRequestsCount((prev) => prev + 1);
      } catch (err) {
        console.warn('[Driver] ride:request handler error:', err);
      }
    };
    socket.on('ride:request', handler);
    return () => { socket.off('ride:request', handler); };
  }, [socket]);

  useEffect(() => {
    if (rideStatus !== 'request') return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          declineRide();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [rideStatus]);

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
        if (isOnlineRef.current) {
          stopBackgroundLocation();
          startForegroundLocation();
        }
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
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required to go online');
      return false;
    }
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
    const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') await Location.requestBackgroundPermissionsAsync();
  }

  function stopForegroundLocation() {
    locationWatcher?.remove();
    watcherRef.current = null;
    setLocationWatcher(null);
  }

  async function stopBackgroundLocation() {}

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
    setRideStatus('in_progress');
    setTripProgress(0);
  }

  function continueDriving() {
    setCurrentRequest(null);
    setRideStatus('online');
    setTripProgress(0);
    setRating(0);
  }

  function goOffline() {
    toggleOnline();
    setCurrentRequest(null);
    setRideStatus('idle');
    setTripProgress(0);
    setRating(0);
  }

  const renderHeader = () => (
    <LinearGradient colors={['#16a34a', '#15803d']} style={styles.headerGradient}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerGreeting}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},</Text>
          <Text style={styles.headerName}>{driverData.name}</Text>
        </View>
        <View style={styles.headerRight}>
          {pendingFoodOrders > 0 && (
            <View style={styles.foodBadge}>
              <Ionicons name="restaurant" size={14} color="#fff" />
              <Text style={styles.foodBadgeText}>{pendingFoodOrders}</Text>
            </View>
          )}
          <View style={styles.avatarContainer}>
            <Avatar name={driverData.name} size={48} style={styles.avatar} />
          </View>
        </View>
      </View>

      <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>TODAY'S EARNINGS</Text>
        <AnimatedNumber
          value={earnings.today}
          prefix="R"
          useGradient
          style={styles.earningsValue}
        />
        <View style={styles.earningsStats}>
          <View style={styles.earningsStatItem}>
            <Text style={styles.earningsStatValue}>{earnings.trips}</Text>
            <Text style={styles.earningsStatLabel}>Trips</Text>
          </View>
          <View style={styles.earningsStatDivider} />
          <View style={styles.earningsStatItem}>
            <View style={styles.ratingInline}>
              <Ionicons name="star" size={14} color="#facc15" />
              <Text style={styles.earningsStatValue}>{earnings.rating}</Text>
            </View>
            <Text style={styles.earningsStatLabel}>Rating</Text>
          </View>
          <View style={styles.earningsStatDivider} />
          <View style={styles.earningsStatItem}>
            <Text style={styles.earningsStatValue}>{earnings.hours}h</Text>
            <Text style={styles.earningsStatLabel}>Online</Text>
          </View>
        </View>
      </LinearGradient>
    </LinearGradient>
  );

  const renderMiniMap = () => {
    if (!currentLocation) return null;
    return (
      <View style={styles.miniMapContainer}>
        <View style={styles.miniMapHeader}>
          <Ionicons name="location" size={16} color="#FFAD7A" />
          <Text style={styles.miniMapTitle}>Current Location</Text>
          {nearbyRequestsCount > 0 && (
            <View style={styles.nearbyBadge}>
              <Ionicons name="car" size={10} color="#1c1c1e" />
              <Text style={styles.nearbyBadgeText}>{nearbyRequestsCount} nearby</Text>
            </View>
          )}
        </View>
        <MapView
          ref={mapRef}
          style={styles.miniMap}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={currentLocation}>
            <Animated.View style={[styles.currentLocationMarker, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.currentLocationDot} />
              <View style={styles.currentLocationPulse} />
            </Animated.View>
          </Marker>
        </MapView>
      </View>
    );
  };

  const renderOnlineToggle = () => (
    <TouchableOpacity
      style={[styles.toggleCard, isOnline && styles.toggleCardActive]}
      onPress={toggleOnline}
      activeOpacity={0.8}
    >
      <View style={styles.toggleLeft}>
        <Animated.View style={[styles.toggleIconContainer, isOnline && styles.toggleIconActive, { transform: [{ scale: isOnline ? pulseAnim : 1 }] }]}>
          <Ionicons name={isOnline ? 'wifi' : 'wifi-outline'} size={24} color={isOnline ? '#fff' : '#98989d'} />
        </Animated.View>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>{isOnline ? 'You\'re Online' : 'Go Online'}</Text>
          <Text style={styles.toggleSubtitle}>
            {isOnline ? 'Receiving ride requests' : 'Tap to start receiving trips'}
          </Text>
        </View>
      </View>
      <View style={[styles.toggleSwitch, isOnline && styles.toggleSwitchActive]}>
        <View style={[styles.toggleKnob, isOnline && styles.toggleKnobActive]} />
      </View>
    </TouchableOpacity>
  );

  const renderQuickStats = () => (
    <View style={styles.quickStatsRow}>
      <View style={styles.quickStatCard}>
        <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(22, 163, 74, 0.15)' }]}>
          <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
        </View>
        <Text style={styles.quickStatValue}>{earnings.trips}</Text>
        <Text style={styles.quickStatLabel}>Completed</Text>
      </View>
      <View style={styles.quickStatCard}>
        <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(255, 173, 122, 0.15)' }]}>
          <Ionicons name="star" size={18} color="#FFAD7A" />
        </View>
        <Text style={styles.quickStatValue}>{earnings.rating}</Text>
        <Text style={styles.quickStatLabel}>Rating</Text>
      </View>
      <View style={styles.quickStatCard}>
        <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
          <Ionicons name="checkmark-circle" size={18} color="#3b82f6" />
        </View>
        <Text style={styles.quickStatValue}>{driverData.acceptanceRate}%</Text>
        <Text style={styles.quickStatLabel}>Acceptance</Text>
      </View>
    </View>
  );

  const renderZoneCard = () => (
    <View style={styles.zoneCard}>
      <View style={styles.zoneHeader}>
        <Text style={styles.zoneLabel}>CURRENT ZONE</Text>
        <View style={styles.zoneDemandBadge}>
          <Ionicons name="trending-up" size={12} color="#1c1c1e" />
          <Text style={styles.zoneDemandText}>{driverData.zoneDemand}</Text>
        </View>
      </View>
      <View style={styles.zoneContent}>
        <View style={styles.zoneIconContainer}>
          <Ionicons name="location" size={24} color="#FFAD7A" />
        </View>
        <View style={styles.zoneInfo}>
          <Text style={styles.zoneName}>{driverData.zone}</Text>
          <Text style={styles.zoneSubtitle}>High demand area</Text>
        </View>
      </View>
    </View>
  );

  const renderVehicleCard = () => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <Text style={styles.vehicleLabel}>VEHICLE</Text>
        <View style={styles.vehicleVerifiedBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
          <Text style={styles.vehicleVerifiedText}>Verified</Text>
        </View>
      </View>
      <View style={styles.vehicleContent}>
        <View style={styles.vehicleIconContainer}>
          <Ionicons name="car" size={24} color="#16a34a" />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{driverData.vehicle}</Text>
          <Text style={styles.vehicleDetails}>{driverData.color} • {driverData.plate} • {driverData.year}</Text>
        </View>
      </View>
    </View>
  );

  const renderRequestOverlay = () => {
    if (!currentRequest) return null;
    return (
      <View style={styles.requestOverlay}>
        <View style={styles.countdownBar}>
          <View style={[styles.countdownFill, { width: `${(countdown / 15) * 100}%` }]} />
        </View>

        <ScrollView style={styles.requestScroll} contentContainerStyle={styles.requestScrollContent}>
          <View style={styles.requestHeader}>
            <View style={styles.bellContainer}>
              <Ionicons name="notifications" size={28} color="#FFAD7A" />
            </View>
            <Text style={styles.requestSubtitle}>New ride request!</Text>
            <Text style={styles.requestCountdown}>{countdown}s to accept</Text>
          </View>

          <View style={styles.requestCard}>
            <View style={styles.requestCardHeader}>
              <View style={styles.rideTypeBadge}>
                <Text style={styles.rideTypeText}>{currentRequest.type}</Text>
              </View>
              <View style={styles.requestPriceContainer}>
                <Text style={styles.requestPrice}>R{currentRequest.price.toFixed(0)}</Text>
                <Text style={styles.requestDistance}>{currentRequest.distance} • {currentRequest.duration}</Text>
              </View>
            </View>

            <View style={styles.passengerRow}>
              <Avatar name={currentRequest.passenger.name} size={48} style={styles.passengerAvatar} />
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>{currentRequest.passenger.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#facc15" />
                  <Text style={styles.passengerRating}>{currentRequest.passenger.rating}</Text>
                </View>
              </View>
            </View>

            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>PICKUP</Text>
                <Text style={styles.locationName}>{currentRequest.pickup.name}</Text>
                <Text style={styles.locationAddress}>{currentRequest.pickup.address}</Text>
              </View>
            </View>
            <View style={[styles.locationRow, { marginTop: 12 }]}>
              <View style={styles.locationPin}>
                <Ionicons name="location" size={12} color="#FFAD7A" />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>DROPOFF</Text>
                <Text style={styles.locationName}>{currentRequest.destination.name}</Text>
                <Text style={styles.locationAddress}>{currentRequest.destination.address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.fareBreakdown}>
            <Text style={styles.fareBreakdownTitle}>FARE BREAKDOWN</Text>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Base fare</Text>
              <Text style={styles.fareValue}>R{(currentRequest.price * 0.6).toFixed(0)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Distance</Text>
              <Text style={styles.fareValue}>R{(currentRequest.price * 0.25).toFixed(0)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Time</Text>
              <Text style={styles.fareValue}>R{(currentRequest.price * 0.15).toFixed(0)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.requestActions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={acceptRide} activeOpacity={0.8}>
            <LinearGradient colors={['#FFAD7A', '#e89b6a']} style={styles.acceptBtnGradient}>
              <Ionicons name="checkmark-circle" size={20} color="#1c1c1e" />
              <Text style={styles.acceptBtnText}>Accept Ride</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={declineRide}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderToPickup = () => (
    <View style={styles.rideOverlay}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.rideHeader}>
        <Ionicons name="navigate" size={20} color="#fff" />
        <View style={styles.rideHeaderInfo}>
          <Text style={styles.rideHeaderTitle}>Head to pickup</Text>
          <Text style={styles.rideHeaderSubtitle}>2.1 km • 4 min</Text>
        </View>
      </LinearGradient>

      <View style={styles.ridePanel}>
        {currentRequest && (
          <View style={styles.passengerCard}>
            <View style={styles.passengerCardHeader}>
              <Avatar name={currentRequest.passenger.name} size={56} style={styles.passengerAvatarLg} />
              <View style={styles.passengerInfoLg}>
                <Text style={styles.passengerNameLg}>{currentRequest.passenger.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#facc15" />
                  <Text style={styles.passengerRatingLg}>{currentRequest.passenger.rating}</Text>
                </View>
                <Text style={styles.rideTypeSmall}>{currentRequest.type}</Text>
              </View>
              <View style={styles.passengerActions}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="call" size={18} color="#FFAD7A" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="chatbubble" size={18} color="#FFAD7A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.locationCard}>
              <View style={styles.locationRow}>
                <View style={styles.locationDot} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>PICKUP</Text>
                  <Text style={styles.locationName}>{currentRequest.pickup.name}</Text>
                </View>
              </View>
              <View style={[styles.locationRow, { marginTop: 12 }]}>
                <View style={styles.locationPin}>
                  <Ionicons name="location" size={12} color="#FFAD7A" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>DROPOFF</Text>
                  <Text style={styles.locationName}>{currentRequest.destination.name}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setRideStatus('arrived')} activeOpacity={0.8}>
              <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.primaryBtnGradient}>
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>I've Arrived</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderArrived = () => (
    <View style={styles.rideOverlay}>
      <LinearGradient colors={['#FFAD7A', '#e89b6a']} style={styles.arrivedHeader}>
        <View style={styles.arrivedIconCircle}>
          <Ionicons name="location" size={36} color="#1c1c1e" />
        </View>
        <Text style={styles.arrivedTitle}>You've Arrived!</Text>
        <Text style={styles.arrivedSubtitle}>Waiting for {currentRequest?.passenger.name}</Text>
      </LinearGradient>

      <View style={styles.ridePanel}>
        {currentRequest && (
          <View style={styles.passengerCard}>
            <View style={styles.passengerCardHeader}>
              <Avatar name={currentRequest.passenger.name} size={56} style={styles.passengerAvatarLg} />
              <View style={styles.passengerInfoLg}>
                <Text style={styles.passengerNameLg}>{currentRequest.passenger.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#facc15" />
                  <Text style={styles.passengerRatingLg}>{currentRequest.passenger.rating}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtnLg}>
                <Ionicons name="call" size={20} color="#FFAD7A" />
              </TouchableOpacity>
            </View>

            <View style={styles.locationCard}>
              <View style={styles.locationRow}>
                <View style={styles.locationPin}>
                  <Ionicons name="location" size={12} color="#FFAD7A" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{currentRequest.pickup.name}</Text>
                  <Text style={styles.locationAddress}>{currentRequest.pickup.address}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={startTrip} activeOpacity={0.8}>
              <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.primaryBtnGradient}>
                <Ionicons name="car" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Start Trip</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setRideStatus('online'); setCurrentRequest(null); }}>
              <Text style={styles.cancelBtnText}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderInProgress = () => (
    <View style={styles.rideOverlay}>
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.rideHeader}>
        <Ionicons name="navigate" size={20} color="#fff" />
        <View style={styles.rideHeaderInfo}>
          <Text style={styles.rideHeaderTitle}>Trip in Progress</Text>
          <Text style={styles.rideHeaderSubtitle}>{currentRequest?.distance} • {currentRequest?.duration}</Text>
        </View>
        <View style={styles.trackingBadge}>
          <Text style={styles.trackingText}>TRACKING</Text>
        </View>
      </LinearGradient>

      <View style={styles.ridePanel}>
        {currentRequest && (
          <View style={styles.passengerCard}>
            <View style={styles.passengerCardHeader}>
              <Avatar name={currentRequest.passenger.name} size={40} style={styles.passengerAvatarSm} />
              <View style={styles.passengerInfoSm}>
                <Text style={styles.passengerNameSm}>{currentRequest.passenger.name}</Text>
                <Text style={styles.destinationText}>{currentRequest.destination.name}</Text>
              </View>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="call" size={18} color="#FFAD7A" />
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Trip Progress</Text>
                <Text style={styles.progressValue}>{tripProgress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient colors={['#16a34a', '#FFAD7A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${tripProgress}%` }]} />
              </View>
            </View>

            <View style={styles.locationCard}>
              <View style={styles.locationRow}>
                <View style={styles.locationDot} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>PICKUP</Text>
                  <Text style={styles.locationName}>{currentRequest.pickup.name}</Text>
                </View>
              </View>
              <View style={[styles.locationRow, { marginTop: 12 }]}>
                <View style={styles.locationPin}>
                  <Ionicons name="location" size={12} color="#FFAD7A" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>DROPOFF</Text>
                  <Text style={styles.locationName}>{currentRequest.destination.name}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tripActions}>
              <TouchableOpacity style={styles.tripActionBtn}>
                <Ionicons name="expand" size={18} color="#FFAD7A" />
                <Text style={styles.tripActionText}>Navigation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tripActionBtn}>
                <Ionicons name="chatbubble" size={18} color="#FFAD7A" />
                <Text style={styles.tripActionText}>Message</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Trip Fare</Text>
              <Text style={styles.fareValueLarge}>R{currentRequest.price.toFixed(0)}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setRideStatus('completed')} activeOpacity={0.8}>
              <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.primaryBtnGradient}>
                <Text style={styles.primaryBtnText}>Complete Trip</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderCompleted = () => (
    <View style={styles.completedOverlay}>
      <ScrollView contentContainerStyle={styles.completedContent}>
        <View style={styles.completedCheckCircle}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </View>
        <Text style={styles.completedTitle}>Trip Completed!</Text>
        <Text style={styles.completedSubtitle}>{currentRequest?.passenger.name} has arrived safely</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trip Fare</Text>
            <Text style={styles.summaryValue}>R{currentRequest?.price.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{currentRequest?.distance}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{currentRequest?.duration}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Your Earnings</Text>
            <Text style={styles.summaryTotalValue}>R{tripEarnings.toFixed(0)}</Text>
          </View>
        </View>

        <View style={styles.ratingCard}>
          <Text style={styles.ratingLabel}>How was the passenger?</Text>
          <View style={styles.ratingPassenger}>
            <Avatar name={currentRequest?.passenger.name || 'P'} size={48} style={styles.passengerAvatarMd} />
            <View style={styles.passengerInfoMd}>
              <Text style={styles.passengerNameMd}>{currentRequest?.passenger.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#facc15" />
                <Text style={styles.passengerRatingMd}>{currentRequest?.passenger.rating}</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.reportLink}>Report</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={32} color={star <= rating ? '#facc15' : '#666'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={continueDriving} activeOpacity={0.8}>
          <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.primaryBtnGradient}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Continue Driving</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.offlineBtn} onPress={goOffline}>
          <Text style={styles.offlineBtnText}>Go Offline</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    <SafeAreaView style={styles.container}>
      {rideStatus === 'idle' || rideStatus === 'online' ? (
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}

          <View style={styles.content}>
            {renderOnlineToggle()}
            {renderMiniMap()}
            {renderQuickStats()}
            {isOnline && renderZoneCard()}
            {renderVehicleCard()}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        renderContent()
      )}

      {showOnlineOverlay && (
        <View style={styles.onlineOverlay}>
          <View style={styles.onlineOverlayCard}>
            <View style={styles.onlineCheckCircle}>
              <Ionicons name="checkmark" size={32} color="#16a34a" />
            </View>
            <Text style={styles.onlineTitle}>You're Online!</Text>
            <Text style={styles.onlineSubtitle}>You'll receive ride requests shortly</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollView: { flex: 1 },
  headerGradient: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.base, paddingBottom: SPACING.lg,
    borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'],
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  headerLeft: { flex: 1 },
  headerGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  headerName: { fontSize: 26, fontWeight: '800', color: COLORS.white },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  foodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  foodBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  avatarContainer: { marginLeft: SPACING.xs },
  avatar: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },

  earningsCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  earningsLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  earningsValue: { fontSize: 40, fontWeight: '800', color: COLORS.white, marginTop: SPACING.xs },
  earningsStats: { flexDirection: 'row', marginTop: SPACING.base, alignItems: 'center' },
  earningsStatItem: { flex: 1, alignItems: 'center' },
  earningsStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },
  earningsStatValue: { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  earningsStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  ratingInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  content: { padding: SPACING.base, gap: SPACING.md },

  miniMapContainer: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  miniMapHeader: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm,
  },
  miniMapTitle: { fontSize: 13, fontWeight: '600', color: COLORS.white, flex: 1 },
  nearbyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  nearbyBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.bg },
  miniMap: { height: 140 },
  currentLocationMarker: {
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  currentLocationDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.success,
    borderWidth: 3, borderColor: COLORS.white,
    shadowColor: COLORS.success, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 6,
  },
  currentLocationPulse: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.successGlow,
  },

  quickStatsRow: { flexDirection: 'row', gap: SPACING.sm },
  quickStatCard: {
    flex: 1, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  quickStatIcon: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs,
  },
  quickStatValue: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  quickStatLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  toggleCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.base,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  toggleCardActive: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.md },
  toggleIconContainer: {
    width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  toggleIconActive: { backgroundColor: COLORS.success },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  toggleSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  toggleSwitch: {
    width: 56, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleSwitchActive: { backgroundColor: COLORS.success },
  toggleKnob: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },

  zoneCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.base,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  zoneLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  zoneDemandBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  zoneDemandText: { fontSize: 11, fontWeight: '700', color: COLORS.bg },
  zoneContent: { flexDirection: 'row', alignItems: 'center' },
  zoneIconContainer: {
    width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: 'rgba(255, 173, 122, 0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  zoneSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  vehicleCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.base,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  vehicleLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  vehicleVerifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleVerifiedText: { fontSize: 11, fontWeight: '600', color: COLORS.success },
  vehicleContent: { flexDirection: 'row', alignItems: 'center' },
  vehicleIconContainer: {
    width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  vehicleDetails: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  requestOverlay: { flex: 1, backgroundColor: COLORS.bg },
  countdownBar: { height: 4, backgroundColor: COLORS.surfaceElevated },
  countdownFill: { height: '100%', backgroundColor: COLORS.primary },
  requestScroll: { flex: 1 },
  requestScrollContent: { padding: SPACING.base },
  requestHeader: { alignItems: 'center', marginBottom: SPACING.base },
  bellContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 173, 122, 0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  requestSubtitle: { fontSize: 14, color: COLORS.textMuted },
  requestCountdown: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginTop: SPACING.xs },

  requestCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], padding: SPACING.lg,
    borderWidth: 2, borderColor: COLORS.primary, marginBottom: SPACING.md,
  },
  requestCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.base },
  rideTypeBadge: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  rideTypeText: { fontSize: 12, fontWeight: '700', color: COLORS.bg },
  requestPriceContainer: { alignItems: 'flex-end' },
  requestPrice: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  requestDistance: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  passengerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.base },
  passengerAvatar: { marginRight: SPACING.md },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  passengerRating: { fontSize: 14, color: COLORS.white },

  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  locationDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success,
    marginTop: 6, marginRight: 12,
  },
  locationPin: {
    width: 24, height: 24, borderRadius: 6, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  locationName: { fontSize: 15, fontWeight: '600', color: COLORS.white, marginTop: 2 },
  locationAddress: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  fareBreakdown: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.base,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  fareBreakdownTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.md },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  fareLabel: { fontSize: 14, color: COLORS.textMuted },
  fareValue: { fontSize: 14, color: COLORS.white },
  fareValueLarge: { fontSize: 22, fontWeight: '700', color: COLORS.white },

  requestActions: { padding: SPACING.base, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  acceptBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.md },
  acceptBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.base, gap: SPACING.sm,
  },
  acceptBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.bg },
  declineBtn: { padding: SPACING.md, alignItems: 'center' },
  declineBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.errorLight },

  rideOverlay: { flex: 1, backgroundColor: COLORS.bg },
  rideHeader: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.base,
    paddingTop: 20, gap: SPACING.md,
  },
  rideHeaderInfo: { flex: 1 },
  rideHeaderTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  rideHeaderSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  trackingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 4,
  },
  trackingText: { fontSize: 10, fontWeight: '700', color: COLORS.white },

  arrivedHeader: {
    padding: SPACING.lg + SPACING.sm, alignItems: 'center',
    borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'],
  },
  arrivedIconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(28,28,30,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
  },
  arrivedTitle: { fontSize: 24, fontWeight: '800', color: COLORS.bg },
  arrivedSubtitle: { fontSize: 14, color: 'rgba(28,28,30,0.8)', marginTop: SPACING.xs },

  ridePanel: { flex: 1, padding: SPACING.base },
  passengerCard: { gap: SPACING.md },
  passengerCardHeader: { flexDirection: 'row', alignItems: 'center' },
  passengerAvatarLg: { marginRight: SPACING.md },
  passengerInfoLg: { flex: 1 },
  passengerNameLg: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  passengerRatingLg: { fontSize: 14, color: COLORS.white },
  rideTypeSmall: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  passengerActions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnLg: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },

  passengerAvatarSm: { marginRight: SPACING.md },
  passengerInfoSm: { flex: 1 },
  passengerNameSm: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  destinationText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  passengerAvatarMd: { marginRight: SPACING.md },
  passengerInfoMd: { flex: 1 },
  passengerNameMd: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  passengerRatingMd: { fontSize: 14, color: COLORS.white },

  locationCard: { backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.md, padding: SPACING.md, gap: 4 },

  progressContainer: { marginVertical: SPACING.xs },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: 12, color: COLORS.textMuted },
  progressValue: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  progressBar: { height: 8, backgroundColor: COLORS.bg, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  tripActions: { flexDirection: 'row', gap: SPACING.md },
  tripActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm,
  },
  tripActionText: { fontSize: 14, color: COLORS.white },

  primaryBtn: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  primaryBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.base, gap: SPACING.sm,
  },
  primaryBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  cancelBtn: { padding: SPACING.md, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.errorLight },

  completedOverlay: { flex: 1, backgroundColor: COLORS.bg },
  completedContent: { padding: SPACING.lg, alignItems: 'center' },
  completedCheckCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg,
    ...{ shadowColor: COLORS.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10 },
  },
  completedTitle: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginBottom: SPACING.sm },
  completedSubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg },

  summaryCard: {
    width: '100%', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], padding: SPACING.lg, marginBottom: SPACING.base,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  summaryLabel: { fontSize: 14, color: COLORS.textMuted },
  summaryValue: { fontSize: 14, color: COLORS.white },
  summaryDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },
  summaryTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  summaryTotalValue: { fontSize: 22, fontWeight: '800', color: COLORS.success },

  ratingCard: {
    width: '100%', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], padding: SPACING.lg, marginBottom: SPACING.lg,
  },
  ratingLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.base },
  ratingPassenger: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.base },
  reportLink: { fontSize: 14, color: COLORS.primary },
  ratingStars: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md },

  offlineBtn: { padding: SPACING.base, alignItems: 'center', width: '100%' },
  offlineBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },

  onlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  onlineOverlayCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], padding: SPACING.lg, alignItems: 'center',
    marginHorizontal: SPACING.xl,
  },
  onlineCheckCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.successGlow,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.base,
  },
  onlineTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.xs },
  onlineSubtitle: { fontSize: 14, color: COLORS.textMuted },
});
