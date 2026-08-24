import { useTheme } from '@easyryde/shared';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { rides, COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '@easyryde/shared';
import {
  GlassCard, Shimmer, ErrorState, RideStatusBadge, GlowButton, GradientText, Typography,
} from '@easyryde/shared';
import type { Ride, RiderRoute, RiderNav } from '@easyryde/shared';

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return COLORS.success;
    case 'cancelled': return COLORS.error;
    case 'in_progress': return COLORS.primary;
    case 'arrived': return COLORS.info;
    default: return COLORS.textMuted;
  }
}

export default function RideDetailScreen({ navigation, route }: { navigation: RiderNav; route: RiderRoute<'RideDetail'> }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { rideId } = route.params;
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadRide(); }, [rideId]);

  async function loadRide() {
    setLoading(true);
    setError('');
    try {
      const data = await rides.get(rideId);
      setRide(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ride details');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Header title="Ride Details" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Shimmer height={48} borderRadius={RADIUS.md} style={{ marginBottom: SPACING.base }} />
          <Shimmer height={140} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.base }} />
          <Shimmer height={100} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.base }} />
          <Shimmer height={180} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.base }} />
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Header title="Ride Details" onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={loadRide} />
      </View>
    );
  }

  if (!ride) return null;

  const baseFare = ride.base_fare ?? 0;
  const distanceFare = ride.distance_km ? ride.distance_km * (ride.per_km_fare ?? 12) : 0;
  const timeFare = ride.duration_minutes ? ride.duration_minutes * 2 : 0;
  const platformFee = (baseFare + distanceFare + timeFare) * 0.05;
  const discount = ride.discount_amount ?? 0;
  const totalFare = ride.total_fare ?? (baseFare + distanceFare + timeFare + platformFee - discount);

  const fareLines = [
    { label: 'Base fare', value: baseFare },
    { label: 'Distance', value: distanceFare },
    { label: 'Time', value: timeFare },
    { label: 'Platform fee', value: platformFee },
  ].filter(f => f.value > 0);

  const isInProgress = ride.status === 'in_progress' || ride.status === 'accepted' || ride.status === 'arrived';
  const statusColor = getStatusColor(ride.status);
  const statusLabel = ride.status.charAt(0).toUpperCase() + ride.status.slice(1).replace('_', ' ');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Header title="Ride Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
          <Ionicons
            name={ride.status === 'completed' ? 'checkmark-circle' : ride.status === 'cancelled' ? 'close-circle' : 'information-circle'}
            size={20}
            color={statusColor}
          />
          <Text style={[styles.statusBannerText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {/* Route Card */}
        <GlassCard padding={SPACING.md} style={styles.card}>
          <View style={styles.routeRow}>
            <View style={styles.dotColumn}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <View style={styles.dotLine} />
              <View style={[styles.dot, { backgroundColor: COLORS.textMuted }]} />
            </View>
            <View style={styles.routeAddresses}>
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>Pickup</Text>
                <Text style={styles.addressText}>{ride.pickup_address}</Text>
              </View>
              <View style={{ height: 20 }} />
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>Drop-off</Text>
                <Text style={styles.addressText}>{ride.dropoff_address}</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Ride Info */}
        <GlassCard padding={SPACING.md} style={styles.card}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoText}>
                {new Date(ride.created_at).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoText}>
                {new Date(ride.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {ride.distance_km != null && (
              <View style={styles.infoItem}>
                <Ionicons name="navigate-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{ride.distance_km.toFixed(1)} km</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Ionicons name="car-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoText}>
                {ride.category ? ride.category.charAt(0).toUpperCase() + ride.category.slice(1) : 'Standard'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Driver Info */}
        {ride.driver && (
          <GlassCard padding={SPACING.md} style={styles.card}>
            <Text style={styles.sectionTitle}>Driver</Text>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color={COLORS.text} />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{ride.driver.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={COLORS.primary} />
                  <Text style={styles.ratingText}>
                    {(ride.driver as any).average_rating?.toFixed(1) ?? '4.5'}
                  </Text>
                  <Text style={styles.tripsText}> · {(ride.driver as any).total_trips ?? 0} trips</Text>
                </View>
              </View>
            </View>
            {(ride.driver as any).vehicle && (
              <View style={styles.vehicleRow}>
                <Ionicons name="car-sport-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.vehicleText}>
                  {(ride.driver as any).vehicle.color} {(ride.driver as any).vehicle.make} {(ride.driver as any).vehicle.model}
                </Text>
                <Text style={styles.plateText}>{(ride.driver as any).vehicle.license_plate}</Text>
              </View>
            )}
          </GlassCard>
        )}

        {/* Fare Breakdown */}
        <GlassCard padding={SPACING.md} style={styles.card}>
          <Text style={styles.sectionTitle}>Fare Breakdown</Text>
          {fareLines.map((f, i) => (
            <View key={i} style={styles.fareRow}>
              <Text style={styles.fareLabel}>{f.label}</Text>
              <Text style={styles.fareValue}>R {f.value.toFixed(2)}</Text>
            </View>
          ))}
          {discount > 0 && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: COLORS.success }]}>Discount</Text>
              <Text style={[styles.fareValue, { color: COLORS.success }]}>-R {discount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.fareDivider} />
          <View style={styles.fareRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <GradientText colors={GRADIENTS.primary} style={{ fontSize: 20, fontWeight: '800' }}>
              R {totalFare.toFixed(2)}
            </GradientText>
          </View>
        </GlassCard>

        {/* Payment */}
        {ride.payment_method && (
          <GlassCard padding={SPACING.md} style={styles.card}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.paymentRow}>
              <View style={styles.paymentIcon}>
                <Ionicons name="card-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.paymentMethod}>{ride.payment_method}</Text>
              {ride.payment_status && (
                <View style={[
                  styles.paymentBadge,
                  { backgroundColor: ride.payment_status === 'completed' ? COLORS.successGlow : COLORS.surfaceElevated },
                ]}>
                  <Text style={[
                    styles.paymentBadgeText,
                    { color: ride.payment_status === 'completed' ? COLORS.success : COLORS.textMuted },
                  ]}>
                    {ride.payment_status.charAt(0).toUpperCase() + ride.payment_status.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </GlassCard>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isInProgress && (
            <GlowButton
              title="Request Help"
              onPress={() => Alert.alert('Help', 'Contact support at support@easyryde.com or call 015 000 0000')}
              size="lg"
              style={{ marginBottom: SPACING.sm }}
            />
          )}
          <TouchableOpacity
            style={styles.rebookBtn}
            onPress={() => navigation.navigate('BookRide', { dropoff: ride.dropoff_address })}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
            <Text style={styles.rebookText}>Re-book this route</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={headerStyles.container}>
      <TouchableOpacity onPress={onBack} style={headerStyles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={headerStyles.title}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, paddingTop: 56,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
});

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: SPACING.base, paddingBottom: 48 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.md, borderRadius: RADIUS.lg,
    marginBottom: SPACING.base, borderWidth: 1,
  },
  statusBannerText: { fontSize: 15, fontWeight: '600' },
  card: { marginBottom: SPACING.base },
  routeRow: { flexDirection: 'row', gap: SPACING.md },
  dotColumn: { alignItems: 'center', width: 12, paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  routeAddresses: { flex: 1 },
  addressBlock: {},
  addressLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  addressText: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '48%' },
  infoText: { color: COLORS.text, fontSize: 13, flex: 1 },
  sectionTitle: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.md,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  driverAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  driverInfo: { flex: 1 },
  driverName: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  tripsText: { color: COLORS.textMuted, fontSize: 13 },
  vehicleRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.md, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder,
  },
  vehicleText: { color: COLORS.textSecondary, fontSize: 13, flex: 1 },
  plateText: {
    color: COLORS.textMuted, fontSize: 12, fontWeight: '600',
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xs,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  fareRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  fareLabel: { color: COLORS.textMuted, fontSize: 14 },
  fareValue: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  fareDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  totalLabel: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  paymentIcon: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  paymentMethod: { color: COLORS.text, fontSize: 15, fontWeight: '500', flex: 1 },
  paymentBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  paymentBadgeText: { fontSize: 12, fontWeight: '600' },
  actions: { marginTop: SPACING.sm },
  rebookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary,
  },
  rebookText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
});
