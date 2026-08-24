import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ScrollView, ActivityIndicator, Keyboard, Platform, Animated,
  Dimensions, Modal, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS, GRADIENTS, SPACING, PHALABORWA_CENTER,
  RIDE_CATEGORIES, PAYMENT_METHODS, VEHICLE_TYPES,
  formatCurrency, formatDistance, formatDuration,
  rides, places,
  useTheme,
} from '@easyryde/shared';
import type { RiderNav, RiderRoute } from '@easyryde/shared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.6;

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

interface FareEstimate {
  distance_km: number;
  duration_minutes: number;
  breakdown: {
    base_fare: number;
    distance_fare: number;
    time_fare: number;
    surge: number;
    subtotal: number;
    total_fare: number;
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type BookingStep = 'search' | 'vehicle' | 'confirm';

interface VehicleOption {
  id: string;
  category: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  seats: number;
  description: string;
  basePrice: number;
  eta: string;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  { id: 'economy', category: 'economy', name: 'EasyRyde', icon: 'car-sport', seats: 4, description: 'Affordable everyday rides', basePrice: 35, eta: '3 min' },
  { id: 'standard', category: 'standard', name: 'Comfort', icon: 'car', seats: 4, description: 'Newer cars with extra legroom', basePrice: 55, eta: '5 min' },
  { id: 'premium', category: 'premium', name: 'Premium', icon: 'ribbon', seats: 4, description: 'Luxury vehicles with top drivers', basePrice: 95, eta: '8 min' },
  { id: 'xl', category: 'xl', name: 'GoXL', icon: 'bus', seats: 6, description: 'SUVs for groups up to 6', basePrice: 120, eta: '6 min' },
];

const SAVED_PLACES = [
  { id: 'home', name: 'Home', address: '45 Selati Road, Phalaborwa', icon: 'home' as const },
  { id: 'work', name: 'Work', address: 'Shoprite Business Park, Phalaborwa', icon: 'briefcase' as const },
  { id: 'airport', name: 'Airport', address: 'Phalaborwa Airport', icon: 'airplane' as const },
];

const RECENT_DESTINATIONS = [
  { id: 'r1', name: 'Kruger National Park Gate', address: 'R71 Road, Phalaborwa' },
  { id: 'r2', name: 'Mall of Phalaborwa', address: 'Schoeman Street' },
  { id: 'r3', name: 'Namakgale Township', address: 'Namakgale, Phalaborwa' },
];

const SERVICE_FEE = 10;

const MAP_REGION = {
  latitude: PHALABORWA_CENTER.latitude,
  longitude: PHALABORWA_CENTER.longitude,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function BookRideScreen({
  route, navigation,
}: { route: RiderRoute<'BookRide'>; navigation: RiderNav }) {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius, spacing, shadows } = useTheme();
  const styles = createStyles(colors);
  const searchInputRef = useRef<TextInput>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState<BookingStep>('search');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState<Place | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [requestingRide, setRequestingRide] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [showSearchSheet, setShowSearchSheet] = useState(false);

  const pickup = {
    latitude: PHALABORWA_CENTER.latitude,
    longitude: PHALABORWA_CENTER.longitude,
  };

  useEffect(() => {
    if (step === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [step]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (step === 'vehicle' || step === 'confirm') {
      Animated.spring(sheetAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [step]);

  useEffect(() => {
    if (!searchText || searchText.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      let cancelled = false;
      setSearching(true);
      places.search(searchText, pickup.latitude, pickup.longitude)
        .then((res) => {
          if (!cancelled) {
            const data = Array.isArray(res) ? res : (res as any)?.data || [];
            setSearchResults(data);
          }
        })
        .catch(() => { if (!cancelled) setSearchResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
      return () => { cancelled = true; };
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchFare = useCallback(async (dest: Place, vehicle: VehicleOption) => {
    setLoadingFare(true);
    try {
      const dist = calculateDistance(pickup.latitude, pickup.longitude, dest.lat, dest.lng);
      const est = await rides.fareEstimate({
        pickup_lat: pickup.latitude,
        pickup_lng: pickup.longitude,
        dropoff_lat: dest.lat,
        dropoff_lng: dest.lng,
        category: vehicle.category,
      });
      setFareEstimate(est);
      setDistance(dist);
      setDuration(est.duration_minutes);
    } catch {
      const dist = calculateDistance(pickup.latitude, pickup.longitude, dest.lat, dest.lng);
      setDistance(dist);
      setDuration(Math.round(dist * 3));
      setFareEstimate(null);
    } finally {
      setLoadingFare(false);
    }
  }, []);

  const handleSelectDestination = (place: Place) => {
    Keyboard.dismiss();
    setDestination(place);
    setShowSearchSheet(false);
    setStep('vehicle');
    if (selectedVehicle) fetchFare(place, selectedVehicle);
  };

  const handleSelectSavedPlace = (saved: typeof SAVED_PLACES[number]) => {
    const place: Place = {
      id: saved.id,
      name: saved.name,
      address: saved.address,
      lat: pickup.latitude + (Math.random() - 0.5) * 0.05,
      lng: pickup.longitude + (Math.random() - 0.5) * 0.05,
    };
    handleSelectDestination(place);
  };

  const handleSelectRecent = (recent: typeof RECENT_DESTINATIONS[number]) => {
    const place: Place = {
      id: recent.id,
      name: recent.name,
      address: recent.address,
      lat: pickup.latitude + (Math.random() - 0.5) * 0.05,
      lng: pickup.longitude + (Math.random() - 0.5) * 0.05,
    };
    handleSelectDestination(place);
  };

  const handleSelectVehicle = (vehicle: VehicleOption) => {
    setSelectedVehicle(vehicle);
    if (destination) fetchFare(destination, vehicle);
  };

  const handleConfirmVehicle = () => {
    if (!selectedVehicle || !destination) return;
    setStep('confirm');
  };

  const getTotal = (): number => {
    if (fareEstimate) return fareEstimate.breakdown.total_fare + SERVICE_FEE;
    if (selectedVehicle) return selectedVehicle.basePrice + SERVICE_FEE;
    return 0;
  };

  const handleRequestRide = async () => {
    if (!selectedVehicle || !destination) return;
    setRequestingRide(true);
    try {
      const payload = {
        category: selectedVehicle.category,
        pickup_lat: pickup.latitude,
        pickup_lng: pickup.longitude,
        pickup_address: 'Current Location',
        dropoff_lat: destination.lat,
        dropoff_lng: destination.lng,
        dropoff_address: destination.address,
        payment_method: paymentMethod,
      };
      const ride = await rides.create(payload);
      if (!ride || !ride.id) {
        Alert.alert('Error', 'Failed to create ride. Please try again.');
        return;
      }
      navigation.replace('RideTracking', { rideId: ride.id });
    } catch (err: any) {
      Alert.alert('Ride Request Failed', err.message || 'Unable to request a ride. Please try again.');
    } finally {
      setRequestingRide(false);
    }
  };

  const goBack = () => {
    if (step === 'confirm') setStep('vehicle');
    else if (step === 'vehicle') { setStep('search'); setDestination(null); }
    else navigation.goBack();
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BOTTOM_SHEET_MAX_HEIGHT, 0],
  });

  const renderPickupDropoffIcons = () => (
    <View style={styles.routeIcons}>
      <View style={styles.routeDotGreen} />
      <View style={styles.routeLineConnector} />
      <Ionicons name="location" size={16} color={colors.brand} />
    </View>
  );

  const renderSearchStep = () => (
    <View style={styles.stepContainer}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={MAP_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.markerPickup} />
        </Marker>
      </MapView>

      <View style={[styles.searchHeader, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.brand} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EasyRyde</Text>
        <View style={{ width: 40 }} />
      </View>

      <TouchableOpacity
        style={[styles.whereToBtn, { marginTop: insets.top + 72 }]}
        onPress={() => setShowSearchSheet(true)}
        activeOpacity={0.9}
      >
        <View style={styles.whereToLeft}>
          <View style={styles.whereToIcon}>
            <Ionicons name="search" size={18} color={colors.brand} />
          </View>
          <Text style={styles.whereToText}>Where to?</Text>
        </View>
        <View style={styles.nowBadge}>
          <Ionicons name="time" size={14} color={colors.brandContrast} />
          <Text style={styles.nowText}>Now</Text>
          <Ionicons name="chevron-down" size={12} color={colors.brandContrast} />
        </View>
      </TouchableOpacity>

      <View style={styles.homeQuickActions}>
        <Text style={styles.sectionLabel}>RECENT DESTINATIONS</Text>
        {RECENT_DESTINATIONS.map(recent => (
          <TouchableOpacity
            key={recent.id}
            style={styles.recentItem}
            onPress={() => handleSelectRecent(recent)}
          >
            <View style={styles.recentIconWrap}>
              <Ionicons name="time-outline" size={18} color={colors.brand} />
            </View>
            <View style={styles.recentInfo}>
              <Text style={styles.recentName}>{recent.name}</Text>
              <Text style={styles.recentAddress}>{recent.address}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>SAVED PLACES</Text>
        <View style={styles.savedPlacesRow}>
          {SAVED_PLACES.map(sp => (
            <TouchableOpacity key={sp.id} style={styles.savedPlaceCard} onPress={() => handleSelectSavedPlace(sp)}>
              <View style={styles.savedPlaceIcon}>
                <Ionicons name={sp.icon} size={20} color={colors.brand} />
              </View>
              <Text style={styles.savedPlaceName}>{sp.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Modal
        visible={showSearchSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSearchSheet(false)}
      >
        <View style={styles.searchSheetOverlay}>
          <View style={[styles.searchSheet, { paddingTop: insets.top + 12 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.searchInputRow}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search destination..."
                  placeholderTextColor={colors.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                  returnKeyType="search"
                  autoFocus
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={styles.searchSheetContent} keyboardShouldPersistTaps="handled">
              {!searching && searchText.length < 2 && (
                <>
                  <Text style={styles.sheetSectionTitle}>RECENT DESTINATIONS</Text>
                  {RECENT_DESTINATIONS.map(recent => (
                    <TouchableOpacity
                      key={recent.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        const place: Place = {
                          id: recent.id, name: recent.name, address: recent.address,
                          lat: pickup.latitude + (Math.random() - 0.5) * 0.05,
                          lng: pickup.longitude + (Math.random() - 0.5) * 0.05,
                        };
                        handleSelectDestination(place);
                      }}
                    >
                      <View style={styles.searchResultIcon}>
                        <Ionicons name="time-outline" size={18} color={colors.brand} />
                      </View>
                      <View style={styles.searchResultText}>
                        <Text style={styles.searchResultName}>{recent.name}</Text>
                        <Text style={styles.searchResultAddress}>{recent.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <Text style={[styles.sheetSectionTitle, { marginTop: 16 }]}>SAVED PLACES</Text>
                  <View style={styles.savedPlacesSheetRow}>
                    {SAVED_PLACES.map(sp => (
                      <TouchableOpacity key={sp.id} style={styles.savedPlaceSheetCard} onPress={() => handleSelectSavedPlace(sp)}>
                        <Ionicons name={sp.icon} size={22} color={colors.brand} />
                        <Text style={styles.savedPlaceSheetName}>{sp.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {searchText.length >= 2 && (
                <>
                  {searching && (
                    <ActivityIndicator color={colors.brand} style={{ paddingVertical: 20 }} />
                  )}
                  <FlatList
                    data={searchResults}
                    scrollEnabled={false}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                      !searching ? (
                        <Text style={styles.emptyText}>No places found</Text>
                      ) : null
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.searchResultItem} onPress={() => handleSelectDestination(item)}>
                        <View style={styles.searchResultIcon}>
                          <Ionicons name="location" size={18} color={colors.brand} />
                        </View>
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultName}>{item.name}</Text>
                          <Text style={styles.searchResultAddress}>{item.address}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderVehicleStep = () => (
    <View style={styles.stepContainer}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={MAP_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.markerPickup} />
        </Marker>
        {destination && (
          <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerDest} />
          </Marker>
        )}
        {destination && (
          <Polyline
            coordinates={[
              pickup,
              { latitude: (pickup.latitude + destination.lat) / 2 + 0.002, longitude: (pickup.longitude + destination.lng) / 2 - 0.002 },
              { latitude: destination.lat, longitude: destination.lng },
            ]}
            strokeColor={colors.brand}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        )}
      </MapView>

      <Animated.View
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetContent}>
          <View style={styles.routePreview}>
            {renderPickupDropoffIcons()}
            <View style={styles.routeInfo}>
              <View style={styles.routeAddressBlock}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeAddress}>Current Location</Text>
              </View>
              <View style={styles.routeAddressBlock}>
                <Text style={styles.routeLabel}>DROPOFF</Text>
                <Text style={styles.routeAddress}>{destination?.name}</Text>
              </View>
            </View>
            {distance !== null && (
              <View style={styles.routeMeta}>
                <Text style={styles.routeDistance}>{formatDistance(distance)}</Text>
                {duration !== null && <Text style={styles.routeDuration}>{formatDuration(duration)}</Text>}
              </View>
            )}
          </View>

          <ScrollView style={styles.vehicleScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetSectionTitle}>CHOOSE A RIDE</Text>
            {VEHICLE_OPTIONS.map(vehicle => {
              const isSelected = selectedVehicle?.id === vehicle.id;
              return (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                  onPress={() => handleSelectVehicle(vehicle)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isSelected ? ['rgba(255,173,122,0.15)', 'rgba(255,173,122,0.05)'] : ['transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.vehicleGradient}
                  >
                    <View style={[styles.vehicleIconWrap, isSelected && styles.vehicleIconWrapSelected]}>
                      <Ionicons name={vehicle.icon} size={24} color={isSelected ? colors.brandContrast : colors.brand} />
                    </View>
                    <View style={styles.vehicleInfo}>
                      <View style={styles.vehicleNameRow}>
                        <Text style={[styles.vehicleName, isSelected && { color: colors.brand }]}>{vehicle.name}</Text>
                        <View style={styles.seatRow}>
                          <Ionicons name="person" size={12} color={colors.textMuted} />
                          <Text style={styles.seatText}>{vehicle.seats}</Text>
                        </View>
                      </View>
                      <Text style={styles.vehicleDesc}>{vehicle.description}</Text>
                      <Text style={styles.vehicleEta}>{vehicle.eta} away</Text>
                    </View>
                    <View style={styles.vehiclePriceSection}>
                      <Text style={[styles.vehiclePrice, isSelected && { color: colors.brand }]}>R{vehicle.basePrice}</Text>
                      {vehicle.id === 'economy' && (
                        <View style={styles.surgeBadge}>
                          <Text style={styles.surgeText}>1.2x</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity style={styles.paymentButton} onPress={() => navigation.navigate('Payment', { rideId: '' })}>
              <View style={styles.paymentLeft}>
                <Ionicons name="card" size={16} color={colors.brand} />
                <Text style={styles.paymentLabel}>Payment</Text>
                <Text style={styles.paymentValue}>{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name || 'Cash'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Estimated Total
                {fareEstimate?.breakdown.surge > 1 ? ` (${fareEstimate.breakdown.surge}x surge)` : ''}
              </Text>
              <Text style={styles.totalValue}>{selectedVehicle ? `R${getTotal().toFixed(2)}` : '--'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, !selectedVehicle && styles.confirmBtnDisabled]}
              onPress={handleConfirmVehicle}
              disabled={!selectedVehicle}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF6A00', '#E25500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmGradient}
              >
                <Text style={styles.confirmBtnText}>
                  Confirm {selectedVehicle?.name || 'Ride'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.brandContrast} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const renderConfirmStep = () => {
    const baseFare = fareEstimate?.breakdown.base_fare || selectedVehicle?.basePrice || 0;
    const distanceFare = fareEstimate?.breakdown.distance_fare || 0;
    const timeFare = fareEstimate?.breakdown.time_fare || 0;
    const surgeMultiplier = fareEstimate?.breakdown.surge || 1;
    const total = getTotal();

    return (
      <View style={styles.stepContainer}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          initialRegion={MAP_REGION}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerPickup} />
          </Marker>
          {destination && (
            <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerDest} />
            </Marker>
          )}
        </MapView>

        <View style={[styles.confirmHeader, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.brand} />
          </TouchableOpacity>
          <Text style={styles.confirmHeaderTitle}>Confirm Ride</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.sheetHandle} />
          <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <View style={styles.confirmVehicleCard}>
              <View style={styles.confirmVehicleRow}>
                <View style={styles.confirmVehicleIcon}>
                  <Ionicons name={selectedVehicle?.icon || 'car'} size={22} color={colors.brand} />
                </View>
                <View>
                  <Text style={styles.confirmVehicleName}>{selectedVehicle?.name}</Text>
                  <Text style={styles.confirmVehicleDesc}>{selectedVehicle?.description}</Text>
                </View>
              </View>

              <View style={styles.confirmRouteRow}>
                {renderPickupDropoffIcons()}
                <View style={styles.confirmRouteTexts}>
                  <View>
                    <Text style={styles.confirmRouteLabel}>PICKUP</Text>
                    <Text style={styles.confirmRouteName}>Current Location</Text>
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.confirmRouteLabel}>DROPOFF</Text>
                    <Text style={styles.confirmRouteName}>{destination?.name}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.fareCard}>
              <Text style={styles.fareSectionTitle}>FARE DETAILS</Text>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Base Fare</Text>
                <Text style={styles.fareValue}>R{baseFare.toFixed(2)}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Distance ({fareEstimate?.distance_km?.toFixed(1) || '?'} km)</Text>
                <Text style={styles.fareValue}>R{distanceFare.toFixed(2)}</Text>
              </View>
              {timeFare > 0 && (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Time</Text>
                  <Text style={styles.fareValue}>R{timeFare.toFixed(2)}</Text>
                </View>
              )}
              {surgeMultiplier > 1 && (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Surge ({surgeMultiplier}x)</Text>
                  <Text style={[styles.fareValue, { color: colors.brand }]}>
                    R{(fareEstimate?.breakdown.surge || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Service Fee</Text>
                <Text style={styles.fareValue}>R{SERVICE_FEE.toFixed(2)}</Text>
              </View>
              <View style={styles.fareTotalRow}>
                <Text style={styles.fareTotalLabel}>Total</Text>
                <Text style={styles.fareTotalValue}>R{total.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.paymentCard} onPress={() => navigation.navigate('Payment', { rideId: '' })}>
              <View style={styles.paymentRow}>
                <View style={styles.paymentLeftRow}>
                  <Ionicons name="card" size={18} color={colors.brand} />
                  <Text style={styles.paymentText}>{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name || 'Cash'}</Text>
                </View>
                <Text style={styles.changeText}>Change</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBottomBtn, { marginBottom: 16 }]}
              onPress={handleRequestRide}
              disabled={requestingRide}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF6A00', '#E25500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmGradient}
              >
                {requestingRide ? (
                  <ActivityIndicator color={colors.brandContrast} />
                ) : (
                  <>
                    <Text style={styles.confirmBtnText}>Request {selectedVehicle?.name}</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.brandContrast} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {step === 'search' && renderSearchStep()}
      {step === 'vehicle' && renderVehicleStep()}
      {step === 'confirm' && renderConfirmStep()}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  stepContainer: { flex: 1, backgroundColor: colors.bg },

  markerPickup: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 3, borderColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  markerDest: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.brand,
    borderWidth: 3, borderColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },

  searchHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(44,44,46,0.85)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: colors.text, flex: 1,
  },

  whereToBtn: {
    position: 'absolute', left: 18, right: 18, zIndex: 10,
    backgroundColor: colors.glass,
    borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  whereToLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whereToIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,173,122,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  whereToText: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  nowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
  },
  nowText: { fontSize: 13, fontWeight: '700', color: colors.brandContrast },

  homeQuickActions: {
    position: 'absolute',
    top: 220,
    left: 18, right: 18,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.6, marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 4,
  },
  recentIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,173,122,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 15, fontWeight: '600', color: colors.text },
  recentAddress: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  savedPlacesRow: { flexDirection: 'row', gap: 10 },
  savedPlaceCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  savedPlaceIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,173,122,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  savedPlaceName: { fontSize: 12, fontWeight: '600', color: colors.text },

  /* Search Sheet */
  searchSheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  searchSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    minHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 12,
  },
  searchInputRow: { paddingHorizontal: 18, paddingVertical: 12 },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16, paddingHorizontal: 15,
    borderWidth: 1, borderColor: colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: colors.text,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  searchSheetContent: { flex: 1, paddingHorizontal: 18, paddingTop: 4 },
  sheetSectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.6, marginBottom: 12,
  },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    gap: 12,
  },
  searchResultIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,173,122,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  searchResultText: { flex: 1 },
  searchResultName: { fontSize: 15, fontWeight: '600', color: colors.text },
  searchResultAddress: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: colors.textMuted, paddingVertical: 22 },

  savedPlacesSheetRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  savedPlaceSheetCard: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  savedPlaceSheetName: { fontSize: 12, fontWeight: '600', color: colors.text },

  /* Bottom Sheet */
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: BOTTOM_SHEET_MAX_HEIGHT,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 12,
  },
  sheetHandle: {
    width: 36, height: 4,
    backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center',
    marginTop: 10, marginBottom: 6,
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  /* Route Preview */
  routePreview: {
    flexDirection: 'row', gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  routeIcons: { alignItems: 'center', paddingTop: 4 },
  routeDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  routeLineConnector: { width: 2, height: 24, backgroundColor: colors.border, marginVertical: 2 },
  routeInfo: { flex: 1 },
  routeAddressBlock: { marginBottom: 6 },
  routeLabel: {
    fontSize: 10, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 0.5,
  },
  routeAddress: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 1 },
  routeMeta: { alignItems: 'flex-end' },
  routeDistance: { fontSize: 15, fontWeight: '700', color: colors.text },
  routeDuration: { fontSize: 12, color: colors.textMuted },

  /* Vehicle Cards */
  vehicleScroll: { maxHeight: 280 },
  vehicleCard: {
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5, borderColor: colors.border,
    overflow: 'hidden',
  },
  vehicleCardSelected: {
    borderColor: colors.brand,
  },
  vehicleGradient: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  vehicleIconWrap: {
    width: 50, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,173,122,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  vehicleIconWrapSelected: {
    backgroundColor: 'rgba(255,173,122,0.2)',
  },
  vehicleInfo: { flex: 1 },
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: colors.text },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seatText: { fontSize: 11, color: colors.textMuted },
  vehicleDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  vehicleEta: { fontSize: 12, fontWeight: '600', color: colors.brand, marginTop: 2 },
  vehiclePriceSection: { alignItems: 'flex-end' },
  vehiclePrice: { fontSize: 18, fontWeight: '700', color: colors.text },
  surgeBadge: {
    backgroundColor: 'rgba(255,173,122,0.15)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginTop: 2,
  },
  surgeText: { fontSize: 10, fontWeight: '700', color: colors.brand },

  /* Bottom Actions */
  bottomActions: {
    paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    marginTop: 8,
  },
  paymentButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  paymentValue: { fontSize: 12, color: colors.textMuted },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  totalLabel: { fontSize: 13, color: colors.textMuted },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  confirmBtn: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#FF6A00', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20,
    elevation: 8,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  confirmBtnText: {
    fontSize: 16, fontWeight: '700', color: colors.brandContrast,
  },

  /* Confirm Step */
  confirmHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, gap: 12,
  },
  confirmHeaderTitle: {
    fontSize: 17, fontWeight: '700', color: colors.text, flex: 1,
  },

  confirmVehicleCard: {
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  confirmVehicleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 14,
  },
  confirmVehicleIcon: {
    width: 46, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,173,122,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  confirmVehicleName: { fontSize: 16, fontWeight: '700', color: colors.text },
  confirmVehicleDesc: { fontSize: 12, color: colors.textMuted },
  confirmRouteRow: { flexDirection: 'row', gap: 12 },
  confirmRouteTexts: { flex: 1 },
  confirmRouteLabel: {
    fontSize: 11, fontWeight: '600', color: colors.textMuted,
    letterSpacing: 0.5,
  },
  confirmRouteName: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },

  fareCard: {
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  fareSectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1, marginBottom: 12,
  },
  fareRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareLabel: { fontSize: 14, color: colors.textMuted },
  fareValue: { fontSize: 14, color: colors.text },
  fareTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 12, marginTop: 8,
  },
  fareTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  fareTotalValue: { fontSize: 18, fontWeight: '700', color: colors.brand },

  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  paymentLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentText: { fontSize: 15, fontWeight: '600', color: colors.text },
  changeText: { fontSize: 13, color: colors.textMuted },

  confirmBottomBtn: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#FF6A00', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20,
    elevation: 8,
  },
});
