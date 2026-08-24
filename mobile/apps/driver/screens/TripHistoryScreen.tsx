import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, Alert, Text, SafeAreaView, RefreshControl, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { drivers, useTheme } from '@easyryde/shared';
import type { Ride, DriverNav } from '@easyryde/shared';

export default function TripHistoryScreen({ navigation }: { navigation: DriverNav }) {
  const [trips, setTrips] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors, radius, spacing, shadows } = useTheme();

  useEffect(() => { loadTrips(); }, []);
  async function loadTrips() { try { setError(null); const data = await drivers.trips({ per_page: '50' }); setTrips(data.data); } catch { setError('Failed to load trips'); } finally { setLoading(false); setRefreshing(false); } }
  const onRefresh = useCallback(() => { setRefreshing(true); loadTrips(); }, []);

  const showTripDetail = useCallback((item: Ride) => {
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';
    Alert.alert(
      'Trip Details',
      [
        `Date: ${date}`,
        `From: ${item.pickup_address}`,
        `To: ${item.dropoff_address}`,
        `Status: ${item.status}`,
        item.total_fare ? `Fare: R${item.total_fare.toFixed(2)}` : '',
        item.distance_km ? `Distance: ${item.distance_km.toFixed(1)} km` : '',
        item.duration_minutes ? `Duration: ${item.duration_minutes} min` : '',
        item.rider?.name ? `Rider: ${item.rider.name}` : '',
      ].filter(Boolean).join('\n'),
    );
  }, []);

  const getStatusColor = (status: string) => { switch (status) { case 'completed': return colors.success; case 'cancelled': return colors.danger; case 'in_progress': return colors.brand; default: return colors.textMuted; } };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    headerGradient: { paddingHorizontal: spacing.base, paddingTop: 16, paddingBottom: spacing.lg, borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.brandContrast },
    headerSubtitle: { fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    listContent: { padding: spacing.base, paddingBottom: 100 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.base },
    loadingText: { fontSize: 16, fontWeight: '500', color: colors.textMuted },
    errorText: { fontSize: 16, fontWeight: '500', color: colors.textMuted, marginBottom: 16, textAlign: 'center' },
    retryBtn: { backgroundColor: colors.success, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 12 },
    retryBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
    tripCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.base, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
    tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '600' },
    tripDate: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
    tripLocations: { gap: 8, marginBottom: spacing.md },
    tripLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tripDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
    tripPin: { width: 16, height: 16, borderRadius: 4, backgroundColor: colors.brandSoft, justifyContent: 'center', alignItems: 'center' },
    tripLocationText: { fontSize: 13, fontWeight: '400', color: colors.text, flex: 1 },
    tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
    tripRider: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
    tripFareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    tripDistance: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
    tripFare: { fontSize: 16, fontWeight: '700', color: colors.success },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    emptySubtext: { fontSize: 14, fontWeight: '400', color: colors.textMuted, textAlign: 'center' },
  });

  if (loading) return <SafeAreaView style={styles.container}><LinearGradient colors={[colors.brand, colors.brandStrong] as const} style={styles.headerGradient}><Text style={styles.headerTitle}>Trip History</Text></LinearGradient><View style={styles.centerContainer}><Text style={styles.loadingText}>Loading trips...</Text></View></SafeAreaView>;
  if (error) return <SafeAreaView style={styles.container}><LinearGradient colors={[colors.brand, colors.brandStrong] as const} style={styles.headerGradient}><Text style={styles.headerTitle}>Trip History</Text></LinearGradient><View style={styles.centerContainer}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadTrips(); }}><Text style={styles.retryBtnText}>Retry</Text></TouchableOpacity></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[colors.brand, colors.brandStrong] as const} style={styles.headerGradient}>
        <View style={styles.headerRow}><Text style={styles.headerTitle}>Trip History</Text><Ionicons name="time" size={24} color="rgba(255,255,255,0.6)" /></View>
        <Text style={styles.headerSubtitle}>{trips.length} trips completed</Text>
      </LinearGradient>
      <FlatList data={trips} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={refreshing} onRefresh={onRefresh}
        ListEmptyComponent={<View style={styles.emptyContainer}><View style={styles.emptyIconCircle}><Ionicons name="car-outline" size={48} color={colors.textMuted} /></View><Text style={styles.emptyTitle}>No trips yet</Text><Text style={styles.emptySubtext}>Completed rides will appear here</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => showTripDetail(item)} activeOpacity={0.7}>
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}><View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} /><Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text></View>
                {item.created_at && <Text style={styles.tripDate}>{new Date(item.created_at).toLocaleDateString()}</Text>}
              </View>
              <View style={styles.tripLocations}>
                <View style={styles.tripLocationRow}><View style={styles.tripDot} /><Text style={styles.tripLocationText} numberOfLines={1}>{item.pickup_address}</Text></View>
                <View style={styles.tripLocationRow}><View style={styles.tripPin}><Ionicons name="location" size={10} color={colors.brand} /></View><Text style={styles.tripLocationText} numberOfLines={1}>{item.dropoff_address}</Text></View>
              </View>
              <View style={styles.tripFooter}>
                <Text style={styles.tripRider}>{item.rider?.name || 'Rider'}</Text>
                <View style={styles.tripFareRow}>
                  {item.distance_km != null && <Text style={styles.tripDistance}>{item.distance_km.toFixed(1)} km</Text>}
                  {item.total_fare != null && <Text style={styles.tripFare}>R {item.total_fare.toFixed(0)}</Text>}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
