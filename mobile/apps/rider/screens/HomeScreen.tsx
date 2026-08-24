import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  Pressable,
} from 'react-native';
import { ErrorBoundary } from '@easyryde/shared';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuth,
  rides,
  GRADIENTS,
  formatCurrency,
  formatDate,
  useTheme,
  useAppTheme,
  SPACING,
  RADIUS,
} from '@easyryde/shared';
import type { RiderNav, RiderMainTabParamList } from '@easyryde/shared';
import type { RouteProp } from '@react-navigation/native';
import type { Ride } from '@easyryde/shared';

interface PromoSlide {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  code?: string;
}

const PROMOS: PromoSlide[] = [
  { id: '1', kicker: 'RIDES · THIS WEEK', title: '20% off your first ride', subtitle: 'Use code at checkout — all ride categories.', code: 'PHB20' },
  { id: '2', kicker: 'FOOD · FREE DELIVERY', title: 'Free delivery on R150+', subtitle: 'Order from local restaurants, delivered hot.' },
  { id: '3', kicker: 'REFER & EARN', title: 'Get R50 credit each', subtitle: 'Invite friends — you both earn when they ride.' },
];

interface QuickTile {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  primary?: boolean;
}

const QUICK_TILES: QuickTile[] = [
  { id: 'ride', label: 'Ride', icon: 'car-sport', route: 'BookRide', primary: true },
  { id: 'food', label: 'Food', icon: 'restaurant', route: 'RestaurantList' },
  { id: 'trips', label: 'Trips', icon: 'map', route: 'RideHistory' },
];

type Props = {
  navigation: RiderNav;
  route: RouteProp<RiderMainTabParamList, 'Home'>;
};

function PressTile({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 3 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 3 }).start();
  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function HomeScreenInner({ navigation }: Props) {
  const { user } = useAuth();
  const { colors, typography, spacing, radius, shadows } = useTheme();
  const { mode, toggle } = useAppTheme();
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const promoScrollRef = useRef<ScrollView>(null);
  const metrics = { card: 300, gap: SPACING.md };

  const firstName = user?.name?.split(' ')[0] || 'Rider';

  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIndex((prev) => {
        const next = (prev + 1) % PROMOS.length;
        promoScrollRef.current?.scrollTo({ x: next * (metrics.card + metrics.gap), animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
    } catch {}
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
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />
        }
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 44 }]}>
          <View>
            <Text style={[typography.small, { color: colors.textMuted }]}>{getTimeOfDay()}</Text>
            <Text style={[typography.h1, { color: colors.text, marginTop: 2 }]}>{firstName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.themeBtn, { backgroundColor: colors.surfaceAlt }]} onPress={toggle} activeOpacity={0.7}>
              <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.avatar, { backgroundColor: colors.brandSoft }]} onPress={() => navigation.navigate('Main', { screen: 'Profile' })} activeOpacity={0.7}>
              <Ionicons name="person" size={20} color={colors.brand} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <PressTile onPress={() => navigation.navigate('BookRide')} style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}>
          <Ionicons name="search" size={20} color={colors.brand} />
          <Text style={[typography.bodyMedium, { color: colors.textMuted, flex: 1, marginLeft: spacing.base }]}>Where to?</Text>
          <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
        </PressTile>

        {/* ── Quick tiles ── */}
        <View style={styles.tilesWrap}>
          {QUICK_TILES.map((tile) => (
            <PressTile key={tile.id} style={styles.tile} onPress={() => tile.route && navigation.navigate(tile.route as any)}>
              <View style={[
                styles.tileIcon,
                { backgroundColor: tile.primary ? colors.brand : colors.surfaceAlt },
                tile.primary ? shadows.brand : null,
              ]}>
                <Ionicons name={tile.icon} size={22} color={tile.primary ? colors.brandContrast : colors.text} />
              </View>
              <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]} numberOfLines={1}>{tile.label}</Text>
            </PressTile>
          ))}
        </View>

        {/* ── Promo ── */}
        <ScrollView
          ref={promoScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={metrics.card + metrics.gap}
          decelerationRate="fast"
          contentContainerStyle={styles.promoScroll}
        >
          {PROMOS.map((promo) => (
            <View key={promo.id} style={[styles.promoCard, { width: metrics.card }]}>
              <LinearGradient colors={GRADIENTS.brand as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <Text style={[typography.kicker, { color: colors.brandContrast, opacity: 0.85 }]}>{promo.kicker}</Text>
              <Text style={[typography.section, { color: colors.brandContrast, marginTop: 6 }]}>{promo.title}</Text>
              <Text style={[typography.small, { color: colors.brandContrast, opacity: 0.9, marginTop: 4 }]}>{promo.subtitle}</Text>
              {promo.code ? (
                <View style={[styles.promoCodeChip, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Text style={[typography.xs, { color: colors.brandContrast, letterSpacing: 1 }]}>{promo.code}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
        <View style={styles.promoDots}>
          {PROMOS.map((_, i) => (
            <View key={i} style={[styles.promoDot, i === promoIndex && { backgroundColor: colors.brand, width: 18 }]} />
          ))}
        </View>

        {/* ── Account snapshot ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.section, { color: colors.text }]}>Your account</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[typography.priceLg, { color: colors.text }]}>{user?.total_trips ?? 0}</Text>
              <Text style={[typography.xs, { color: colors.textMuted, marginTop: 2 }]}>TRIPS</Text>
            </View>
            <View style={[styles.stat, styles.statDivider, { borderColor: colors.border }]}>
              <Text style={[typography.priceLg, { color: colors.text }]}>{user?.average_rating?.toFixed(1) ?? '5.0'}</Text>
              <Text style={[typography.xs, { color: colors.textMuted, marginTop: 2 }]}>RATING</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[typography.priceLg, { color: colors.brand }]}>{formatCurrency(totalSpent)}</Text>
              <Text style={[typography.xs, { color: colors.textMuted, marginTop: 2 }]}>SPENT</Text>
            </View>
          </View>
        </View>

        {/* ── Recent destinations ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.section, { color: colors.text }]}>Recent destinations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RideHistory')}>
              <Text style={[typography.small, { color: colors.brand }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : recentRides.length > 0 ? (
            recentRides.map((ride) => (
              <PressTile key={ride.id} style={[styles.recentItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('BookRide', { dropoff: ride.dropoff_address })}>
                <View style={[styles.recentIcon, { backgroundColor: colors.brandSoft }]}>
                  <Ionicons name="location" size={16} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMedium, { color: colors.text }]} numberOfLines={1}>{ride.dropoff_address}</Text>
                  <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>{ride.completed_at ? formatDate(ride.completed_at) : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </PressTile>
            ))
          ) : (
            <Text style={[typography.small, { color: colors.textMuted }]}>No recent trips yet</Text>
          )}
        </View>

        {/* ── Local alert ── */}
        <View style={[styles.alert, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.warning }]}>
          <Ionicons name="flash" size={18} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: spacing.base }}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>Load shedding — Stage 4</Text>
            <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>Today 06:00–08:30 · 16:00–18:30</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: SPACING.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  themeBtn: { width: 40, height: 40, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.base },
  avatar: { width: 44, height: 44, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.base,
    borderWidth: 1,
  },

  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  tileIcon: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  promoScroll: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base },
  promoCard: {
    height: 132,
    borderRadius: RADIUS.tile,
    padding: SPACING.base,
    marginRight: SPACING.md,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  promoCodeChip: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
  },
  promoDots: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  promoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(140,140,143,0.4)', marginHorizontal: 3 },

  card: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.base,
    borderRadius: RADIUS.tile,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  statsRow: { flexDirection: 'row', marginTop: SPACING.base },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1 },

  section: { marginTop: SPACING.xl, paddingHorizontal: SPACING.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  loadingRow: { paddingVertical: SPACING.base, alignItems: 'center' },

  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
  },
  recentIcon: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.base,
    marginTop: SPACING.xl,
    padding: SPACING.base,
    borderRadius: RADIUS.tile,
    borderLeftWidth: 3,
  },
});

export default function HomeScreen(props: Props) {
  return (
    <ErrorBoundary>
      <HomeScreenInner {...props} />
    </ErrorBoundary>
  );
}
