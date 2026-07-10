import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, Alert, Text, SafeAreaView, RefreshControl, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { drivers } from '@easyryde/shared';
import type { Ride } from '@easyryde/shared';

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadTrips(); }, []);

  async function loadTrips() {
    try {
      setError(null);
      const data = await drivers.trips({ per_page: '50' });
      setTrips(data.data);
    } catch {
      setError('Failed to load trips');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrips();
  }, []);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#16a34a';
      case 'cancelled': return '#dc2626';
      case 'in_progress': return '#3b82f6';
      default: return '#98989d';
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.headerGradient}>
        <Text style={styles.headerTitle}>Trip History</Text>
      </LinearGradient>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading trips...</Text>
      </View>
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.headerGradient}>
        <Text style={styles.headerTitle}>Trip History</Text>
      </LinearGradient>
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadTrips(); }}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.headerGradient}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Trip History</Text>
          <Ionicons name="time" size={24} color="rgba(255,255,255,0.6)" />
        </View>
        <Text style={styles.headerSubtitle}>{trips.length} trips completed</Text>
      </LinearGradient>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No trips yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => showTripDetail(item)} activeOpacity={0.7}>
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
                {item.created_at && (
                  <Text style={styles.tripDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                )}
              </View>

              <View style={styles.tripLocations}>
                <View style={styles.tripLocationRow}>
                  <View style={styles.tripDot} />
                  <Text style={styles.tripLocationText}>{item.pickup_address}</Text>
                </View>
                <View style={styles.tripLocationRow}>
                  <View style={styles.tripPin}>
                    <Ionicons name="location" size={10} color="#FFAD7A" />
                  </View>
                  <Text style={styles.tripLocationText}>{item.dropoff_address}</Text>
                </View>
              </View>

              <View style={styles.tripFooter}>
                <Text style={styles.tripRider}>{item.rider?.name || 'Rider'}</Text>
                {item.total_fare != null && (
                  <Text style={styles.tripFare}>R {item.total_fare.toFixed(2)}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1e' },
  headerGradient: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  listContent: { padding: 16, paddingBottom: 100 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#98989d' },
  errorText: { fontSize: 16, color: '#98989d', marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  tripCard: {
    backgroundColor: '#242426', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#3a3a3c',
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  tripDate: { fontSize: 12, color: '#98989d' },

  tripLocations: { gap: 8, marginBottom: 12 },
  tripLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  tripPin: {
    width: 16, height: 16, borderRadius: 4, backgroundColor: '#2c2c2e',
    justifyContent: 'center', alignItems: 'center',
  },
  tripLocationText: { fontSize: 14, color: '#fff', flex: 1 },

  tripFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#3a3a3c', paddingTop: 12,
  },
  tripRider: { fontSize: 13, color: '#98989d' },
  tripFare: { fontSize: 16, fontWeight: '700', color: '#16a34a' },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 16 },
});
