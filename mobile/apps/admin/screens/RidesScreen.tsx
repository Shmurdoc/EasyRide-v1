import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  StatusBar, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@easyryde/shared';
import { COLORS, RIDE_STATUS_LABELS, RIDE_STATUS_COLORS } from '@easyryde/shared';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { useAdminRides } from '../hooks/useAdminRides';
import { Card } from '../components/common/Card';
import { Avatar } from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import { ProgressBar } from '../components/common/ProgressBar';

type Nav = NativeStackNavigationProp<any>;
const STATUS_FILTERS = ['all', 'in_progress', 'completed', 'cancelled'];

export default function RidesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const { rides, loading, error, refreshing, refresh, loadMore, filter, setFilter, search, setSearch, hasMore } = useAdminRides();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchSubmit = useCallback(() => { setSearch(search); }, [search, setSearch]);

  const getStatusColor = (status: string) => {
    return RIDE_STATUS_COLORS[status] || COLORS.textMuted;
  };

  const getStatusLabel = (status: string) => {
    return RIDE_STATUS_LABELS[status] || status.replace('_', ' ').toUpperCase();
  };

  const renderRide = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={[styles.rideCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
        onPress={() => navigation.navigate('AdminRideDetail', { id: item.id, ride: item })}
        activeOpacity={0.7}
      >
        <View style={styles.rideHeader}>
          <View style={styles.rideHeaderLeft}>
            <Text style={[styles.rideId, { color: COLORS.brand }]}>{item.id?.slice(0, 8)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
            </View>
          </View>
          <Text style={[styles.rideTime, { color: COLORS.textMuted }]}>
            {item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}
          </Text>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.routeLine}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.success }]} />
            <View style={[styles.routeDash, { backgroundColor: COLORS.border }]} />
            <Ionicons name="location" size={12} color={COLORS.brand} />
          </View>
          <View style={styles.routeText}>
            <Text style={[styles.routeAddress, { color: COLORS.text }]}>{item.pickup_address}</Text>
            <Text style={[styles.routeAddress, { color: COLORS.text }]}>{item.dropoff_address}</Text>
          </View>
        </View>

        {item.driver && (
          <View style={[styles.driverRow, { backgroundColor: COLORS.surfaceLight }]}>
            <Avatar name={item.driver.name || 'Driver'} size={32} />
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: COLORS.text }]}>{item.driver.name}</Text>
              <Text style={[styles.driverVehicle, { color: COLORS.textMuted }]}>
                {item.driver.vehicle ? `${item.driver.vehicle.make} ${item.driver.vehicle.model}` : 'Vehicle'}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.rideFooter, { borderTopColor: COLORS.border }]}>
          <View style={styles.rideActions}>
            <View style={[styles.fareTag, { backgroundColor: 'rgba(255,106,0,0.12)' }]}>
              <Text style={[styles.rideFare, { color: COLORS.brand }]}>R{item.total_fare?.toFixed(0) || '0'}</Text>
            </View>
          </View>
          <View style={styles.rideMeta}>
            <Text style={[styles.metaText, { color: COLORS.textMuted }]}>{item.distance_km ? `${item.distance_km} km` : ''}</Text>
            <Text style={[styles.metaText, { color: COLORS.textMuted }]}>{item.duration_minutes ? `${item.duration_minutes} min` : ''}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ride Management</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
          {STATUS_FILTERS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab === 'all' ? 'All' : tab === 'in_progress' ? 'In Progress' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <View style={[styles.actionRow, { borderBottomColor: COLORS.border }]}>
        <Text style={[styles.rideCount, { color: COLORS.textMuted }]}>{rides.length} rides</Text>
        <View style={styles.actionBtns}>
          <TouchableOpacity onPress={() => setSearchOpen(!searchOpen)} style={styles.iconBtn}>
            <Ionicons name={searchOpen ? 'close' : 'search'} size={16} color={COLORS.brand} />
            <Text style={[styles.iconBtnText, { color: COLORS.brand }]}>{searchOpen ? 'Close' : 'Search'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {searchOpen && (
        <View style={[styles.searchWrap, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: COLORS.text }]}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search rides..."
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
          />
        </View>
      )}

      {loading && !refreshing ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <FlatList
          data={rides}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRide}
          ListEmptyComponent={<EmptyState icon="car" message="No rides found" />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.brand} />}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#f87171' },
  tabScroll: { paddingHorizontal: 20 },
  tabRow: { gap: 8 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: '#ffffff' },
  tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#E25500', fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  rideCount: { fontSize: 13 },
  actionBtns: { flexDirection: 'row', gap: 12 },
  iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtnText: { fontSize: 13, fontWeight: '600' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  rideCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rideHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rideId: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 9, fontWeight: '700' },
  rideTime: { fontSize: 11 },
  routeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  routeLine: { alignItems: 'center', width: 12 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeDash: { width: 2, height: 20, marginVertical: 2 },
  routeText: { flex: 1 },
  routeAddress: { fontSize: 13, marginBottom: 8 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, marginBottom: 12 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 13, fontWeight: '600' },
  driverVehicle: { fontSize: 11 },
  rideFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  rideActions: { flexDirection: 'row', gap: 12 },
  fareTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rideFare: { fontSize: 14, fontWeight: '700' },
  rideMeta: { flexDirection: 'row', gap: 8 },
  metaText: { fontSize: 11 },
});
