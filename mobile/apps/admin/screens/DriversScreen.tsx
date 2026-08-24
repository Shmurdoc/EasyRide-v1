import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADMIN_COLORS, ADMIN_GRADIENTS, ADMIN_RADIUS } from '../constants/theme';
import { useAdminDrivers } from '../hooks/useAdminDrivers';
import { SearchBar } from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import { Avatar } from '../components/common/Avatar';

type Nav = NativeStackNavigationProp<any>;
const STATUS_FILTERS = ['all', 'online', 'busy', 'offline'];

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { drivers, loading, error, refreshing, refresh, loadMore, filter, setFilter, search, setSearch, hasMore } = useAdminDrivers();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchSubmit = useCallback(() => { setSearch(search); }, [search, setSearch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return ADMIN_COLORS.greenLight;
      case 'busy': return ADMIN_COLORS.orangeLight;
      case 'offline': return ADMIN_COLORS.textMuted;
      default: return ADMIN_COLORS.textMuted;
    }
  };

  const getBorderColor = (st: string) => {
    if (st === 'online') return ADMIN_COLORS.green;
    if (st === 'busy') return ADMIN_COLORS.orange;
    return '#6b7280';
  };

  const renderDriver = ({ item }: { item: any }) => {
    const status = item.driverProfile?.is_approved ? 'online' : 'offline';
    const driverName = item.name || 'Unknown Driver';
    const vehicleStr = item.vehicle ? `${item.vehicle.make} ${item.vehicle.model} • ${item.vehicle.license_plate}` : 'No vehicle';
    const rating = item.driverProfile?.rating ?? 0;
    const trips = item.driverProfile?.total_trips ?? 0;
    const zone = item.driverProfile?.current_zone || 'CBD';

    return (
      <TouchableOpacity
        style={styles.driverCard}
        onPress={() => navigation.navigate('AdminDriverDetail', { id: item.id, driver: item })}
        activeOpacity={0.7}
      >
        <View style={styles.driverTop}>
          <View style={styles.driverTopLeft}>
            <Avatar
              name={driverName}
              size={50}
              imageUrl={`https://ui-avatars.com/api/?name=${driverName.replace(' ', '+')}&background=6366f1&color=fff&size=100`}
              borderColor={getBorderColor(status)}
            />
            <View style={styles.driverMeta}>
              <Text style={styles.driverName}>{driverName}</Text>
              <Text style={styles.driverVehicle}>{vehicleStr}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>{status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trips}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: ADMIN_COLORS.primary }]}>{zone}</Text>
            <Text style={styles.statLabel}>Zone</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: getStatusColor(status) }]}>{status === 'online' ? 'Active' : 'Offline'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        <View style={styles.driverActions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('AdminDriverDetail', { id: item.id, driver: item })}
          >
            <Text style={styles.primaryBtnText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={ADMIN_COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Drivers</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tabRow}>
          {STATUS_FILTERS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={ADMIN_COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search drivers..."
            placeholderTextColor={ADMIN_COLORS.textMuted}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading && !refreshing ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDriver}
          ListEmptyComponent={<EmptyState icon="people" message="No drivers found" />}
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: ADMIN_COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#ffffff', fontWeight: '600' },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: ADMIN_COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: ADMIN_COLORS.surfaceBorder },
  searchInput: { flex: 1, marginLeft: 8, color: '#ffffff', fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  driverCard: { backgroundColor: ADMIN_COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: ADMIN_COLORS.surfaceBorder },
  driverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  driverTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  driverMeta: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  driverVehicle: { fontSize: 12, color: ADMIN_COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 10, padding: 10 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  statLabel: { fontSize: 10, color: ADMIN_COLORS.textMuted, marginTop: 2 },
  driverActions: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, backgroundColor: ADMIN_COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  moreBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: ADMIN_COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center' },
});