import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADMIN_COLORS, ADMIN_GRADIENTS, ADMIN_RADIUS } from '../constants/theme';
import { useAdminRides } from '../hooks/useAdminRides';
import FilterTabs from '../components/common/FilterTabs';
import { SearchBar } from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import { ProgressBar } from '../components/common/ProgressBar';
import { Avatar } from '../components/common/Avatar';

type Nav = NativeStackNavigationProp<any>;
const STATUS_FILTERS = ['all', 'in_progress', 'completed'];

export default function RidesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { rides, loading, error, refreshing, refresh, loadMore, filter, setFilter, search, setSearch, hasMore } = useAdminRides();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchSubmit = useCallback(() => { setSearch(search); }, [search, setSearch]);

  const renderRide = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => navigation.navigate('AdminRideDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.rideHeader}>
        <View style={styles.rideHeaderLeft}>
          <Text style={styles.rideId}>{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(99,102,241,0.2)' }]}>
            <Text style={[styles.statusText, { color: '#818cf8' }]}>IN PROGRESS</Text>
          </View>
        </View>
        <Text style={styles.rideTime}>{item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}</Text>
      </View>

      <View style={styles.driverRow}>
        <Avatar
          name={item.driver?.name || 'Driver'}
          size={44}
          imageUrl={item.driver?.name ? `https://ui-avatars.com/api/?name=${item.driver.name.replace(' ', '+')}&background=6366f1&color=fff&size=88` : undefined}
          borderColor={ADMIN_COLORS.primary}
        />
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.driver?.name || 'Unassigned'}</Text>
          <Text style={styles.driverVehicle}>
            {item.driver?.vehicle ? `${item.driver.vehicle.make} ${item.driver.vehicle.model}` : 'Vehicle'}
          </Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeLine}>
          <View style={styles.routeDot} />
          <View style={styles.routeDash} />
          <Ionicons name="location" size={12} color={ADMIN_COLORS.orange} />
        </View>
        <View style={styles.routeText}>
          <Text style={styles.routeAddress}>{item.pickup_address}</Text>
          <Text style={styles.routeAddress}>{item.dropoff_address}</Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressPct}>{Math.min(Math.floor(Math.random() * 100), 100)}%</Text>
        </View>
        <ProgressBar progress={Math.min(Math.floor(Math.random() * 100), 100)} height={6} />
      </View>

      <View style={styles.rideFooter}>
        <View style={styles.rideActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={14} color={ADMIN_COLORS.primary} />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-ellipses" size={14} color={ADMIN_COLORS.primary} />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.rideFare}>R{item.total_fare?.toFixed(0) || '0'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ride Management</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.tabRow}>
          {STATUS_FILTERS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab === 'all' ? 'All' : tab === 'in_progress' ? 'In Progress' : 'Completed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.actionRow}>
        <Text style={styles.rideCount}>{rides.length} active rides</Text>
        <View style={styles.actionBtns}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="funnel" size={16} color={ADMIN_COLORS.primary} />
            <Text style={styles.iconBtnText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSearchOpen(!searchOpen)} style={styles.iconBtn}>
            <Ionicons name={searchOpen ? 'close' : 'search'} size={16} color={ADMIN_COLORS.primary} />
            <Text style={styles.iconBtnText}>{searchOpen ? 'Close' : 'Search'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {searchOpen && (
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} onSubmitEditing={handleSearchSubmit} placeholder="Search rides..." />
        </View>
      )}

      {loading && !refreshing ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <FlatList
          data={rides}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRide}
          ListEmptyComponent={<EmptyState icon="car" message="No rides found" />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ADMIN_COLORS.primary} />}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { paddingBottom: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#f87171' },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: ADMIN_COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#ffffff', fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rideCount: { fontSize: 13, color: ADMIN_COLORS.textMuted },
  actionBtns: { flexDirection: 'row', gap: 12 },
  iconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtnText: { fontSize: 13, color: ADMIN_COLORS.primary, fontWeight: '600' },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { padding: 16, paddingBottom: 100 },
  rideCard: { backgroundColor: ADMIN_COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: ADMIN_COLORS.surfaceBorder },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rideHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rideId: { fontSize: 11, fontFamily: 'monospace', color: ADMIN_COLORS.primary, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 9, fontWeight: '700' },
  rideTime: { fontSize: 11, color: ADMIN_COLORS.textMuted },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  driverVehicle: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  routeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  routeLine: { alignItems: 'center', width: 12 },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ADMIN_COLORS.greenLight },
  routeDash: { width: 2, height: 20, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 2 },
  routeText: { flex: 1 },
  routeAddress: { fontSize: 13, color: '#ffffff', marginBottom: 8 },
  progressWrap: { backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: ADMIN_COLORS.textMuted },
  progressPct: { fontSize: 11, fontWeight: '700', color: ADMIN_COLORS.primary },
  rideFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: ADMIN_COLORS.surfaceBorder },
  rideActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: ADMIN_COLORS.primary, fontWeight: '600' },
  rideFare: { fontSize: 16, fontWeight: '800', color: ADMIN_COLORS.primary },
});