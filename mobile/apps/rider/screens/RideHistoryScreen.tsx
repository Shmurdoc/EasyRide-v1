import { useTheme } from '@easyryde/shared';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlatList, TouchableOpacity, StyleSheet, View, Text, Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rides, COLORS, GRADIENTS, SPACING, RADIUS } from '@easyryde/shared';
import {
  Shimmer, GradientText, Typography, GlowButton, GlassCard,
} from '@easyryde/shared';
import type { Ride } from '@easyryde/shared';
import type { RiderNav } from '@easyryde/shared';

type DateGroup = { label: string; data: Ride[] };

function groupRidesByDate(rideList: Ride[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: Record<string, Ride[]> = {};

  for (const ride of rideList) {
    const d = new Date(ride.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let key: string;
    if (day.getTime() >= today.getTime()) key = 'Today';
    else if (day.getTime() >= yesterday.getTime()) key = 'Yesterday';
    else key = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(ride);
  }

  return Object.entries(groups).map(([label, data]) => ({ label, data }));
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed': return { color: COLORS.success, bg: COLORS.successGlow, label: 'Completed' };
    case 'cancelled': return { color: COLORS.error, bg: COLORS.errorGlow, label: 'Cancelled' };
    case 'in_progress': return { color: COLORS.primary, bg: COLORS.primaryGlow, label: 'Active' };
    default: return { color: COLORS.textMuted, bg: COLORS.surfaceElevated, label: status };
  }
}

function getCategoryBadge(cat: string) {
  const map: Record<string, string> = {
    economy: 'Economy', standard: 'Standard', premium: 'Premium', xl: 'XL',
  };
  return map[cat] || 'Ride';
}

export default function RideHistoryScreen({ navigation }: { navigation: RiderNav }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    try {
      const data = await rides.list({ per_page: '50' });
      setRideHistory(data.data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setLoadError(false);
    loadHistory();
  }, []);

  const grouped = groupRidesByDate(rideHistory);

  function RideItem({ item, index }: { item: Ride; index: number }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 4,
        delay: index * 50,
      }).start();
    }, []);

    const badge = getStatusBadge(item.status);
    const catLabel = getCategoryBadge(item.category);
    const date = new Date(item.created_at);

    return (
      <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('RideDetail', { rideId: item.id })}
          style={styles.rideCard}
          activeOpacity={0.7}
        >
          <View style={styles.rideTop}>
            <View style={styles.rideIconWrap}>
              <Ionicons name="car-sport-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.rideAddresses}>
              <View style={styles.addressRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                <Typography variant="bodySmall" color={COLORS.text} numberOfLines={1} style={styles.addressText}>
                  {item.pickup_address}
                </Typography>
              </View>
              <View style={styles.addressRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.textMuted }]} />
                <Typography variant="bodySmall" color={COLORS.textMuted} numberOfLines={1} style={styles.addressText}>
                  {item.dropoff_address}
                </Typography>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </View>

          <View style={styles.rideBottom}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{catLabel}</Text>
            </View>
            <View style={styles.rideMeta}>
              <Typography variant="small" color={COLORS.textDim}>
                {date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
              </Typography>
              {item.total_fare != null && (
                <GradientText colors={GRADIENTS.primary} style={{ fontSize: 15, fontWeight: '700', marginLeft: SPACING.sm }}>
                  R {item.total_fare.toFixed(0)}
                </GradientText>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function ShimmerLoader() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ width: 100, height: 28, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceElevated }} />
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.surfaceElevated }} />
        </View>
        <View style={{ padding: SPACING.base }}>
          <Shimmer height={80} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.md }} />
          {[1, 2, 3, 4].map(i => (
            <Shimmer key={i} height={96} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.sm }} />
          ))}
        </View>
      </View>
    );
  }

  if (loading) return <ShimmerLoader />;

  if (loadError) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <GradientText colors={GRADIENTS.primary} style={{ fontSize: 26, fontWeight: '700' }}>Activity</GradientText>
          <Ionicons name="time-outline" size={22} color={COLORS.textMuted} />
        </View>
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textDim} />
          <Typography variant="body" color={COLORS.textMuted} style={{ marginTop: SPACING.md, textAlign: 'center' }}>
            Failed to load ride history
          </Typography>
          <GlowButton
            title="Retry"
            onPress={() => { setLoading(true); setLoadError(false); loadHistory(); }}
            size="md"
            style={{ marginTop: SPACING.base }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.headerRow}>
        <GradientText colors={GRADIENTS.primary} style={{ fontSize: 26, fontWeight: '700' }}>Activity</GradientText>
        <Ionicons name="time-outline" size={22} color={COLORS.textMuted} />
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => 'dummy'}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {grouped.map((group) => (
              <View key={group.label} style={styles.groupSection}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.data.map((item, i) => (
                  <RideItem key={item.id} item={item} index={i} />
                ))}
              </View>
            ))}
          </>
        }
        ListEmptyComponent={
          rideHistory.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="car-outline" size={64} color={COLORS.textDim} />
              <Typography variant="h4" color={COLORS.textMuted} style={{ marginTop: SPACING.base }}>
                No rides yet
              </Typography>
              <Typography variant="bodySmall" color={COLORS.textDim} style={{ marginTop: SPACING.sm, textAlign: 'center' }}>
                Your completed rides will appear here
              </Typography>
            </View>
          ) : null
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.base, paddingBottom: SPACING.sm,
  },
  listContent: { padding: SPACING.base, paddingTop: 0 },
  groupSection: { marginBottom: SPACING.lg },
  groupLabel: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: SPACING.sm, marginTop: SPACING.sm,
  },
  rideCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  rideTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  rideIconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  rideAddresses: { flex: 1, gap: 6 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  addressText: { flex: 1 },
  rideBottom: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.md, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder,
  },
  badge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  categoryPill: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  categoryText: { fontSize: 11, fontWeight: '500', color: COLORS.textMuted },
  rideMeta: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  emptyWrap: {
    alignItems: 'center', paddingVertical: SPACING['3xl'],
  },
  errorWrap: {
    alignItems: 'center', paddingVertical: SPACING['2xl'],
  },
});
