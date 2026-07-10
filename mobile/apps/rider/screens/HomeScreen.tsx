import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuth,
  rides,
  COLORS,
  MAP_REGION,
  PHALABORWA_CENTER,
  SPACING,
  RADIUS,
  formatCurrency,
  formatDate,
} from '@easyryde/shared';
import type { RiderNav, RiderMainTabParamList } from '@easyryde/shared';
import type { RouteProp } from '@react-navigation/native';
import type { Ride } from '@easyryde/shared';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry', stylers: [{ color: '#121212' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#1d3c4d' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

interface ServiceCard {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  route?: string;
  serviceType: string;
}

const SERVICES: ServiceCard[] = [
  { id: 'ride', label: 'Ride', icon: 'car-sport', badge: 'Promo', route: 'BookRide', serviceType: 'ride' },
  { id: 'delivery', label: 'Delivery', icon: 'cube', serviceType: 'delivery' },
  { id: 'airport', label: 'Airport', icon: 'airplane', serviceType: 'airport' },
  { id: 'parcel', label: 'Parcel', icon: 'package', serviceType: 'parcel' },
];

interface SavedPlaceItem {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SAVED_PLACES: SavedPlaceItem[] = [
  { id: 'home', name: 'Home', icon: 'home' },
  { id: 'work', name: 'Work', icon: 'briefcase' },
  { id: 'airport', name: 'Airport', icon: 'airplane' },
];

const RIDE_TYPES = [
  { id: 'standard', label: 'Standard', icon: 'car-sport' as const, desc: 'Everyday rides' },
  { id: 'premium', label: 'Premium', icon: 'diamond' as const, desc: 'Luxury vehicles' },
  { id: 'minivan', label: 'Minivan', icon: 'bus' as const, desc: 'Groups up to 6' },
  { id: 'pets', label: 'Pets', icon: 'paw' as const, desc: 'Pet-friendly' },
];

type Props = {
  navigation: RiderNav;
  route: RouteProp<RiderMainTabParamList, 'Home'>;
};

export default function HomeScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [selectedRideType, setSelectedRideType] = useState('standard');

  const firstName = user?.name?.split(' ')[0] || 'Rider';

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } else {
        setLocation({ lat: PHALABORWA_CENTER.latitude, lng: PHALABORWA_CENTER.longitude });
      }
    } catch {
      setLocationPermission(false);
      setLocation({ lat: PHALABORWA_CENTER.latitude, lng: PHALABORWA_CENTER.longitude });
    }
  }, []);

  const fetchRecentRides = useCallback(async () => {
    try {
      const response = await rides.list({ status: 'completed', per_page: '3' });
      const completed = response.data ?? response ?? [];
      const rideList = Array.isArray(completed) ? completed.slice(0, 3) : [];
      setRecentRides(rideList);
      const spent = rideList.reduce((sum, r) => sum + (r.total_fare ?? 0), 0);
      setTotalSpent(spent);
    } catch {
      setRecentRides([]);
    }
  }, []);

  const checkActiveRide = useCallback(async () => {
    try {
      const response = await rides.current();
      if (response && (response as any).id && ['searching', 'accepted', 'arrived', 'in_progress'].includes((response as any).status)) {
        navigation.navigate('RideTracking', { rideId: (response as any).id });
        return true;
      }
    } catch {}
    return false;
  }, [navigation]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const hasActiveRide = await checkActiveRide();
    if (!hasActiveRide) {
      await Promise.all([requestLocation(), fetchRecentRides()]);
    }
    setLoading(false);
  }, [requestLocation, fetchRecentRides, checkActiveRide]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const handleServicePress = (service: ServiceCard) => {
    if (service.route) {
      navigation.navigate(service.route as any, { serviceType: service.serviceType } as any);
    }
  };

  const handleSearchPress = () => {
    navigation.navigate('BookRide');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const mapRegion = location
    ? { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.025, longitudeDelta: 0.025 }
    : MAP_REGION;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Map as background */}
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        region={mapRegion}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={locationPermission === true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
      />

      {/* Scrollable overlay content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header with orange gradient */}
        <LinearGradient
          colors={['#FFAD7A', '#e89b6a'] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greetingText}>Good {getTimeOfDay()},</Text>
              <Text style={styles.nameText}>{firstName} 👋</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={handleProfilePress}
              activeOpacity={0.7}
            >
              {user?.avatar_url ? (
                <View style={styles.avatarContainer}>
                  <Ionicons name="person" size={22} color={COLORS.primary} />
                </View>
              ) : (
                <View style={styles.avatarContainer}>
                  <Ionicons name="person" size={22} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Service cards 2x2 grid */}
          <View style={styles.servicesGrid}>
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceCardTop}>
                  <Ionicons name={service.icon} size={32} color={COLORS.white} />
                  {service.badge && (
                    <View style={styles.promoBadge}>
                      <Text style={styles.promoBadgeText}>{service.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {/* Content area with semi-transparent dark background */}
        <View style={styles.contentArea}>
          {/* Search bar */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={handleSearchPress}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <Text style={styles.searchPlaceholder}>Where to?</Text>
            <View style={styles.nowPill}>
              <Ionicons name="time" size={14} color={COLORS.bg} />
              <Text style={styles.nowText}>Now</Text>
              <Ionicons name="chevron-down" size={12} color={COLORS.bg} />
            </View>
          </TouchableOpacity>

          {/* Ride Type Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rideTypeScroll}
          >
            {RIDE_TYPES.map((type) => {
              const isSelected = selectedRideType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.rideTypeChip, isSelected && styles.rideTypeChipSelected]}
                  onPress={() => setSelectedRideType(type.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={isSelected ? COLORS.bg : COLORS.primary}
                  />
                  <Text style={[styles.rideTypeLabel, isSelected && styles.rideTypeLabelSelected]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Recent Destinations */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recent Destinations</Text>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : recentRides.length > 0 ? (
              recentRides.map((ride) => (
                <TouchableOpacity
                  key={ride.id}
                  style={styles.recentItem}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('BookRide', {
                      dropoff: ride.dropoff_address,
                    })
                  }
                >
                  <View style={styles.recentIconContainer}>
                    <Ionicons name="location" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.recentTextContainer}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {ride.dropoff_address}
                    </Text>
                    <Text style={styles.recentDate}>
                      {ride.completed_at ? formatDate(ride.completed_at) : ''}
                    </Text>
                  </View>
                  <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No recent trips yet</Text>
            )}
          </View>

          {/* Saved Places */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Saved Places</Text>
            <View style={styles.savedPlacesRow}>
              {SAVED_PLACES.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.savedPlaceCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('BookRide')}
                >
                  <View style={styles.savedPlaceIconContainer}>
                    <Ionicons name={place.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.savedPlaceLabel}>{place.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{user?.total_trips ?? 0}</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{user?.average_rating?.toFixed(1) ?? '—'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header gradient overlay
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: RADIUS['2xl'],
    borderBottomRightRadius: RADIUS['2xl'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(18, 18, 18, 0.7)',
    letterSpacing: 0.3,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.bg,
    marginTop: 2,
  },
  profileButton: {
    padding: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(18, 18, 18, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Service cards
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  serviceCard: {
    width: '47%',
    backgroundColor: 'rgba(18, 18, 18, 0.35)',
    borderRadius: RADIUS['2xl'],
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 110,
    justifyContent: 'space-between',
  },
  serviceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  promoBadge: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Content area
  contentArea: {
    backgroundColor: 'rgba(18, 18, 18, 0.92)',
    paddingTop: SPACING.base,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    marginTop: -4,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    paddingHorizontal: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginLeft: SPACING.md,
  },
  nowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 5,
  },
  nowText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.bg,
  },

  // Ride type selector
  rideTypeScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  rideTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: SPACING.base,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  rideTypeChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rideTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  rideTypeLabelSelected: {
    color: COLORS.bg,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },

  // Recent destinations
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  recentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  recentTextContainer: {
    flex: 1,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  recentDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  loadingRow: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textDim,
    textAlign: 'center',
    paddingVertical: SPACING.base,
  },

  // Saved places
  savedPlacesRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  savedPlaceCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  savedPlaceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  savedPlaceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
});
