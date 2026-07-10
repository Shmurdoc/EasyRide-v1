import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ScrollView, ActivityIndicator, Keyboard, Platform, Animated, Alert,
} from 'react-native';
let LinearGradient: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS, GRADIENTS, SPACING, RADIUS, PHALABORWA_CENTER,
  RIDE_CATEGORIES, PAYMENT_METHODS,
  formatCurrency, formatDistance, formatDuration,
  rides, places,
} from '@easyryde/shared';
import { GlowButton, GlassCard, GradientText, Shimmer, Typography } from '@easyryde/shared';
import type { RiderNav, RiderRoute } from '@easyryde/shared';

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
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
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
  {
    id: 'economy', category: 'economy', name: 'EasyRyde',
    icon: 'car-sport', seats: 4, description: 'Affordable everyday rides',
    basePrice: 35, eta: '3 min',
  },
  {
    id: 'standard', category: 'standard', name: 'Comfort',
    icon: 'car', seats: 4, description: 'Newer cars with extra legroom',
    basePrice: 55, eta: '5 min',
  },
  {
    id: 'premium', category: 'premium', name: 'Premium',
    icon: 'ribbon', seats: 4, description: 'Luxury vehicles with top drivers',
    basePrice: 95, eta: '8 min',
  },
  {
    id: 'xl', category: 'xl', name: 'GoXL',
    icon: 'bus', seats: 6, description: 'SUVs for groups up to 6',
    basePrice: 120, eta: '6 min',
  },
];

const SAVED_PLACES = [
  { id: 'home', name: 'Home', address: '45 Selati Road, Phalaborwa', icon: 'home' as const },
  { id: 'work', name: 'Work', address: 'Shoprite Business Park, Phalaborwa', icon: 'briefcase' as const },
  { id: 'airport', name: 'Airport', address: 'Phalaborwa Airport', icon: 'airplane' as const },
];

const SERVICE_FEE = 10;

export default function BookRideScreen({
  route, navigation,
}: { route: RiderRoute<'BookRide'>; navigation: RiderNav }) {
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const pickup = route.params?.pickup || {
    lat: PHALABORWA_CENTER.latitude,
    lng: PHALABORWA_CENTER.longitude,
    address: 'Current Location',
  };

  const [step, setStep] = useState<BookingStep>('search');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState<Place | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [promoCode, setPromoCode] = useState('');
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [requestingRide, setRequestingRide] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (step === 'search') {
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      setTimeout(() => searchInputRef.current?.focus(), 300);
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
      places.search(searchText, pickup.lat, pickup.lng)
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
  }, [searchText, pickup.lat, pickup.lng]);

  const fetchFare = useCallback(async (dest: Place, vehicle: VehicleOption) => {
    setLoadingFare(true);
    try {
      const dist = calculateDistance(pickup.lat, pickup.lng, dest.lat, dest.lng);
      const est = await rides.fareEstimate({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dest.lat,
        dropoff_lng: dest.lng,
        category: vehicle.category,
      });
      setFareEstimate(est);
      setDistance(dist);
      setDuration(est.duration_minutes);
    } catch {
      const dist = calculateDistance(pickup.lat, pickup.lng, dest.lat, dest.lng);
      setDistance(dist);
      setDuration(Math.round(dist * 3));
      setFareEstimate(null);
    } finally {
      setLoadingFare(false);
    }
  }, [pickup.lat, pickup.lng]);

  const handleSelectDestination = (place: Place) => {
    Keyboard.dismiss();
    setDestination(place);
    setStep('vehicle');
    if (selectedVehicle) fetchFare(place, selectedVehicle);
  };

  const handleSelectSavedPlace = (saved: typeof SAVED_PLACES[number]) => {
    const place: Place = {
      id: saved.id,
      name: saved.name,
      address: saved.address,
      lat: pickup.lat + (Math.random() - 0.5) * 0.05,
      lng: pickup.lng + (Math.random() - 0.5) * 0.05,
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
    if (!selectedVehicle || !destination) {
      return;
    }
    setRequestingRide(true);
    try {
      const payload = {
        category: selectedVehicle.category,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_address: pickup.address,
        dropoff_lat: destination.lat,
        dropoff_lng: destination.lng,
        dropoff_address: destination.address,
        payment_method: paymentMethod,
        ...(promoCode ? { promo_code: promoCode } : {}),
      };

      if (typeof rides?.create !== 'function') {
        Alert.alert('Booking Failed', 'Internal error: ride service unavailable. Please restart the app.');
        return;
      }

      const ride = await rides.create(payload);

      if (!ride || !ride.id) {
        Alert.alert('Booking Failed', 'Server returned an invalid response. Please try again.');
        return;
      }

      navigation.replace('RideTracking', { rideId: ride.id });
    } catch (err: any) {
      let msg = err?.message || 'Unable to request ride. Please try again.';
      try {
        const validationErrors = err?.data?.errors;
        if (validationErrors && typeof validationErrors === 'object') {
          const details = Object.entries(validationErrors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('\n');
          if (details) msg = `${msg}\n\n${details}`;
        }
      } catch (innerErr) {
        // ignore formatting errors
      }
      Alert.alert('Booking Failed', msg);
    } finally {
      setRequestingRide(false);
    }
  };

  const goBack = () => {
    if (step === 'confirm') setStep('vehicle');
    else if (step === 'vehicle') { setStep('search'); setDestination(null); }
    else navigation.goBack();
  };

  const renderRouteVisual = () => (
    <View style={styles.routeVisual}>
      <View style={styles.routeDots}>
        <View style={styles.greenDot} />
        <View style={styles.routeLine} />
        <Ionicons name="location" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.routeTexts}>
        <Text style={styles.routePickup} numberOfLines={1}>{pickup.address}</Text>
        <Text style={styles.routeDest} numberOfLines={1}>{destination?.name}</Text>
      </View>
      {distance !== null && (
        <View style={styles.routeMeta}>
          <Text style={styles.routeDistance}>{formatDistance(distance)}</Text>
          {duration !== null && <Text style={styles.routeDuration}>{formatDuration(duration)}</Text>}
        </View>
      )}
    </View>
  );

  const renderSearchStep = () => (
    <View style={styles.stepContainer}>
      {LinearGradient ? (
        <LinearGradient colors={['#FFAD7A', '#e89b6a']} style={styles.orangeHeader}>
          <View style={[styles.headerRow, { paddingTop: insets.top + SPACING.sm }]}>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.bg} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Where to?</Text>
          </View>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="rgba(18,18,18,0.6)" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search destination..."
              placeholderTextColor="rgba(18,18,18,0.6)"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color="rgba(18,18,18,0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.orangeHeader, { backgroundColor: '#FFAD7A' }]}>
          <View style={[styles.headerRow, { paddingTop: insets.top + SPACING.sm }]}>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.bg} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Where to?</Text>
          </View>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="rgba(18,18,18,0.6)" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search destination..."
              placeholderTextColor="rgba(18,18,18,0.6)"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color="rgba(18,18,18,0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {searching && (
          <View style={styles.shimmerContainer}>
            {[1, 2, 3].map(i => <Shimmer key={i} height={64} borderRadius={RADIUS.lg} />)}
          </View>
        )}

        {!searching && searchText.length < 2 && (
          <>
            <Text style={styles.sectionLabel}>SAVED PLACES</Text>
            <View style={styles.savedPlacesRow}>
              {SAVED_PLACES.map(sp => (
                <TouchableOpacity key={sp.id} style={styles.savedPlaceCard} onPress={() => handleSelectSavedPlace(sp)}>
                  <View style={styles.savedPlaceIcon}>
                    <Ionicons name={sp.icon} size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.savedPlaceName}>{sp.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>POPULAR DESTINATIONS</Text>
            {[
              { id: 'pop1', name: 'Mall of the North', address: 'Phalaborwa, Limpopo', lat: -23.8800, lng: 31.0800 },
              { id: 'pop2', name: 'Kruger National Park Gate', address: 'Phalaborwa Gate', lat: -23.9500, lng: 31.1500 },
              { id: 'pop3', name: 'Phalaborwa Airport', address: 'PHB Airport', lat: -23.9300, lng: 31.1500 },
            ].map((p) => (
              <TouchableOpacity key={p.id} style={styles.resultItem} onPress={() => handleSelectDestination(p)}>
                <View style={styles.resultIcon}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>{p.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {!searching && (
          <FlatList
            data={searchText.length >= 2 ? searchResults : []}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              searchText.length >= 2 && !searching ? (
                <Text style={styles.emptyText}>No places found</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectDestination(item)}>
                <View style={styles.resultIcon}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </ScrollView>
    </View>
  );

  const renderVehicleStep = () => {
    const headerContent = (
      <>
        <View style={[styles.headerRow, { paddingTop: insets.top + SPACING.sm }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.bg} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSubtitle}>Destination</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{destination?.name}</Text>
          </View>
        </View>
        {renderRouteVisual()}
      </>
    );
    return (
    <View style={styles.stepContainer}>
      {LinearGradient ? (
        <LinearGradient colors={['#FFAD7A', '#e89b6a']} style={styles.orangeHeader}>{headerContent}</LinearGradient>
      ) : (
        <View style={[styles.orangeHeader, { backgroundColor: '#FFAD7A' }]}>{headerContent}</View>
      )}

      <ScrollView style={styles.scrollContent}>
        <Text style={styles.sectionLabel}>CHOOSE A RIDE</Text>
        {VEHICLE_OPTIONS.map(vehicle => {
          const isSelected = selectedVehicle?.id === vehicle.id;
          return (
            <TouchableOpacity
              key={vehicle.id}
              style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
              onPress={() => handleSelectVehicle(vehicle)}
              activeOpacity={0.7}
            >
              <View style={[styles.vehicleIcon, isSelected && styles.vehicleIconSelected]}>
                <Ionicons name={vehicle.icon} size={28} color={isSelected ? COLORS.bg : COLORS.primary} />
              </View>
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleNameRow}>
                  <Text style={[styles.vehicleName, isSelected && { color: '#fff' }]}>{vehicle.name}</Text>
                  <Ionicons name="person" size={12} color={COLORS.textMuted} />
                  <Text style={styles.vehicleSeats}>{vehicle.seats}</Text>
                </View>
                <Text style={styles.vehicleDesc}>{vehicle.description}</Text>
                <Text style={styles.vehicleEta}>{vehicle.eta} away</Text>
              </View>
              <Text style={[styles.vehiclePrice, isSelected && { color: '#fff' }]}>
                R{vehicle.basePrice}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('Payment', { rideId: '' })}>
          <View style={styles.optionLeft}>
            <Ionicons name="card" size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.optionTitle}>Payment</Text>
              <Text style={styles.optionValue}>
                {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name || 'Cash'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <Ionicons name="pricetag" size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.optionTitle}>Promo Code</Text>
              <Text style={styles.optionValue}>{promoCode || 'Add a promo'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setPromoCode('EASY20')}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 80) + SPACING.lg }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Estimated Total
            {fareEstimate?.breakdown.surge > 1 ? ` (${fareEstimate.breakdown.surge}x surge)` : ''}
          </Text>
          <Text style={styles.totalValue}>
            {selectedVehicle ? `R${getTotal().toFixed(2)}` : '--'}
          </Text>
        </View>
        <GlowButton
          title={`Confirm ${selectedVehicle?.name || 'Ride'}`}
          onPress={handleConfirmVehicle}
          disabled={!selectedVehicle}
          size="lg"
          icon={<Ionicons name="arrow-forward" size={20} color={COLORS.bg} />}
        />
      </View>
    </View>
  );
  };

  const renderConfirmStep = () => {
    const baseFare = fareEstimate?.breakdown.base_fare || selectedVehicle?.basePrice || 0;
    const distanceFare = fareEstimate?.breakdown.distance_fare || 0;
    const timeFare = fareEstimate?.breakdown.time_fare || 0;
    const surgeMultiplier = fareEstimate?.breakdown.surge || 1;
    const surgeApplied = surgeMultiplier > 1;
    const promoDiscount = promoCode ? 15 : 0;
    const total = getTotal() - promoDiscount;

    return (
      <View style={styles.stepContainer}>
        {LinearGradient ? (
          <LinearGradient colors={['#FFAD7A', '#e89b6a']} style={styles.orangeHeader}>
            <View style={[styles.headerRow, { paddingTop: insets.top + SPACING.sm }]}>
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={COLORS.bg} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Confirm Ride</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.orangeHeader, { backgroundColor: '#FFAD7A' }]}>
            <View style={[styles.headerRow, { paddingTop: insets.top + SPACING.sm }]}>
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={COLORS.bg} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Confirm Ride</Text>
            </View>
          </View>
        )}

        <ScrollView style={styles.scrollContent}>
          {/* Ride Summary */}
          <View style={styles.confirmCard}>
            <View style={styles.confirmVehicleRow}>
              <View style={styles.confirmVehicleIcon}>
                <Ionicons name={selectedVehicle?.icon || 'car'} size={24} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.confirmVehicleName}>{selectedVehicle?.name}</Text>
                <Text style={styles.confirmVehicleDesc}>{selectedVehicle?.description}</Text>
              </View>
            </View>

            <View style={styles.confirmRoute}>
              <View style={styles.confirmRouteVisual}>
                <View style={styles.greenDotSmall} />
                <View style={styles.routeLineSmall} />
                <Ionicons name="location" size={16} color={COLORS.primary} />
              </View>
              <View style={styles.confirmRouteTexts}>
                <View style={styles.confirmRouteItem}>
                  <Text style={styles.confirmRouteLabel}>PICKUP</Text>
                  <Text style={styles.confirmRouteName} numberOfLines={1}>{pickup.address}</Text>
                </View>
                <View style={[styles.confirmRouteItem, { marginTop: SPACING.md }]}>
                  <Text style={styles.confirmRouteLabel}>DROPOFF</Text>
                  <Text style={styles.confirmRouteName} numberOfLines={1}>{destination?.name}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Fare Breakdown */}
          <View style={styles.confirmCard}>
            <Text style={styles.cardSectionTitle}>FARE DETAILS</Text>
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
            {surgeApplied && (
              <View style={styles.fareRow}>
                <Text style={[styles.fareLabel, { color: COLORS.warning || '#f59e0b' }]}>Surge ({surgeMultiplier}x)</Text>
                <Text style={[styles.fareValue, { color: COLORS.warning || '#f59e0b' }]}>Included</Text>
              </View>
            )}
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Service Fee</Text>
              <Text style={styles.fareValue}>R{SERVICE_FEE.toFixed(2)}</Text>
            </View>
            {promoCode ? (
              <View style={styles.fareRow}>
                <Text style={[styles.fareLabel, { color: COLORS.success }]}>Promo ({promoCode})</Text>
                <Text style={[styles.fareValue, { color: COLORS.success }]}>-R{promoDiscount.toFixed(2)}</Text>
              </View>
            ) : null}
            <View style={styles.fareTotalRow}>
              <Text style={styles.fareTotalLabel}>Total</Text>
              <Text style={styles.fareTotalValue}>R{total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment */}
          <View style={styles.confirmCard}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <Ionicons name="card" size={20} color={COLORS.primary} />
                <Text style={styles.paymentText}>
                  {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name || 'Cash'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Payment', { rideId: '' })}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Safety */}
          <View style={styles.confirmCard}>
            <Text style={styles.cardSectionTitle}>SAFETY</Text>
            <View style={styles.safetyRow}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
              <Text style={styles.safetyText}>Share trip status with emergency contacts</Text>
            </View>
            <View style={styles.safetyRow}>
              <Ionicons name="car" size={18} color={COLORS.success} />
              <Text style={styles.safetyText}>Trip recorded for safety</Text>
            </View>
          </View>

          <View style={{ height: 140 }} />
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.base, gap: SPACING.sm }]}>
          <GlowButton
            title={`Request ${selectedVehicle?.name}`}
            onPress={handleRequestRide}
            loading={requestingRide}
            size="lg"
            icon={!requestingRide ? <Ionicons name="arrow-forward" size={20} color={COLORS.bg} /> : undefined}
          />
          <TouchableOpacity style={styles.modifyBtn} onPress={() => setStep('vehicle')}>
            <Text style={styles.modifyBtnText}>Modify Ride</Text>
          </TouchableOpacity>
        </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  stepContainer: { flex: 1, backgroundColor: COLORS.bg },

  orangeHeader: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(18,18,18,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20, fontWeight: '700', color: COLORS.bg, flex: 1,
  },
  headerSubtitle: {
    fontSize: 12, fontWeight: '500', color: 'rgba(18,18,18,0.7)',
  },

  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(18,18,18,0.2)',
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1, fontSize: 17, fontWeight: '500', color: COLORS.bg,
    paddingVertical: Platform.OS === 'ios' ? SPACING.base : SPACING.md,
  },

  routeVisual: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(18,18,18,0.2)',
    borderRadius: RADIUS.lg, padding: SPACING.base, gap: SPACING.md,
  },
  routeDots: { alignItems: 'center', gap: 2 },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  routeLine: { width: 2, height: 24, backgroundColor: 'rgba(18,18,18,0.3)' },
  routeTexts: { flex: 1 },
  routePickup: { fontSize: 13, color: 'rgba(18,18,18,0.7)' },
  routeDest: { fontSize: 15, fontWeight: '600', color: COLORS.bg },
  routeMeta: { alignItems: 'flex-end' },
  routeDistance: { fontSize: 15, fontWeight: '700', color: COLORS.bg },
  routeDuration: { fontSize: 12, color: 'rgba(18,18,18,0.7)' },

  scrollContent: { flex: 1, paddingHorizontal: SPACING.base, paddingTop: SPACING.base },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.md,
  },

  savedPlacesRow: {
    flexDirection: 'row', gap: SPACING.md,
  },
  savedPlaceCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.base,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  savedPlaceIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,173,122,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  savedPlaceName: { fontSize: 12, fontWeight: '600', color: COLORS.text },

  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.base,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    gap: SPACING.md,
  },
  resultIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  resultText: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  resultAddress: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  shimmerContainer: { gap: SPACING.sm },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, paddingVertical: SPACING.xl },

  vehicleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg, padding: SPACING.base,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    gap: SPACING.md,
  },
  vehicleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255,173,122,0.1)',
  },
  vehicleIcon: {
    width: 56, height: 48, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,173,122,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  vehicleIconSelected: {
    backgroundColor: COLORS.primary,
  },
  vehicleInfo: { flex: 1 },
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  vehicleSeats: { fontSize: 12, color: COLORS.textMuted },
  vehicleDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  vehicleEta: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  vehiclePrice: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg, padding: SPACING.base,
    marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  optionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  optionValue: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  applyText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder,
    paddingHorizontal: SPACING.base, paddingTop: SPACING.base,
    paddingBottom: 32,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.base,
  },
  totalLabel: { fontSize: 14, color: COLORS.textMuted },
  totalValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },

  confirmCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg, padding: SPACING.base,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  confirmVehicleRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    marginBottom: SPACING.base,
  },
  confirmVehicleIcon: {
    width: 48, height: 40, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,173,122,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  confirmVehicleName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  confirmVehicleDesc: { fontSize: 12, color: COLORS.textMuted },

  confirmRoute: { flexDirection: 'row', gap: SPACING.md },
  confirmRouteVisual: { alignItems: 'center', gap: 2, paddingTop: 4 },
  greenDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  routeLineSmall: { width: 2, height: 32, backgroundColor: COLORS.surfaceLight },
  confirmRouteTexts: { flex: 1 },
  confirmRouteItem: {},
  confirmRouteLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.5 },
  confirmRouteName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },

  cardSectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.md,
  },
  fareRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  fareLabel: { fontSize: 14, color: COLORS.textMuted },
  fareValue: { fontSize: 14, color: COLORS.text },
  fareTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: COLORS.surfaceLight,
    paddingTop: SPACING.md, marginTop: SPACING.sm,
  },
  fareTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  fareTotalValue: { fontSize: 18, fontWeight: '700', color: COLORS.primary },

  paymentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  paymentText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  changeText: { fontSize: 13, color: COLORS.textMuted },

  safetyRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  safetyText: { fontSize: 14, color: COLORS.text },

  modifyBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  modifyBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
});
