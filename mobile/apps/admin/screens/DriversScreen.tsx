import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  StatusBar, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@easyryde/shared';
import { COLORS } from '@easyryde/shared';
import { ADMIN_COLORS } from '../constants/theme';
import { useAdminDrivers } from '../hooks/useAdminDrivers';
import { approveDriver, rejectDriver } from '../api/admin';
import { Card } from '../components/common/Card';
import { Avatar } from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';

type Nav = NativeStackNavigationProp<any>;
const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'];

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const { drivers, loading, error, refreshing, refresh, loadMore, filter, setFilter, search, setSearch, hasMore } = useAdminDrivers();

  const getStatusColor = (driver: any) => {
    const profile = driver.driverProfile;
    if (!profile) return COLORS.textMuted;
    if (!profile.is_approved) return COLORS.warning;
    if (driver.is_online) return COLORS.success;
    return COLORS.textMuted;
  };

  const getStatusLabel = (driver: any) => {
    const profile = driver.driverProfile;
    if (!profile) return 'UNKNOWN';
    if (!profile.is_approved) return 'PENDING';
    if (driver.is_online) return 'ONLINE';
    return 'OFFLINE';
  };

  const handleApprove = async (driverId: string) => {
    Alert.alert('Approve Driver', 'Approve this driver?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        try {
          await approveDriver(driverId);
          refresh();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to approve');
        }
      }},
    ]);
  };

  const handleReject = async (driverId: string) => {
    Alert.alert('Reject Driver', 'Reject this driver?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await rejectDriver(driverId);
          refresh();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to reject');
        }
      }},
    ]);
  };

  const renderDriver = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item);
    const statusLabel = getStatusLabel(item);
    const profile = item.driverProfile;
    const rating = profile?.rating ?? 0;
    const trips = profile?.total_trips ?? 0;

    return (
      <Card style={styles.driverCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminDriverDetail', { id: item.id, driver: item })}
          activeOpacity={0.7}
        >
          <View style={styles.driverTop}>
            <View style={styles.driverTopLeft}>
              <Avatar name={item.name || 'Unknown'} size={50} borderColor={statusColor} />
              <View style={styles.driverMeta}>
                <Text style={[styles.driverName, { color: COLORS.text }]}>{item.name}</Text>
                <Text style={[styles.driverVehicle, { color: COLORS.textMuted }]}>
                  {item.vehicle ? `${item.vehicle.make} ${item.vehicle.model} • ${item.vehicle.license_plate}` : 'No vehicle'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={[styles.statsRow, { backgroundColor: COLORS.surfaceLight }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.brand }]}>{rating.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.text }]}>{trips}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>Status</Text>
          </View>
        </View>

        <View style={styles.driverActions}>
          {profile && !profile.is_approved && (
            <>
              <TouchableOpacity style={[styles.approveBtn, { backgroundColor: COLORS.success }]} onPress={() => handleApprove(item.id)}>
                <Ionicons name="checkmark" size={16} color="#ffffff" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: COLORS.error }]} onPress={() => handleReject(item.id)}>
                <Ionicons name="close" size={16} color="#ffffff" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.viewBtn, { backgroundColor: COLORS.brand }]}
            onPress={() => navigation.navigate('AdminDriverDetail', { id: item.id, driver: item })}
          >
            <Text style={styles.actionBtnText}>View Profile</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Drivers</Text>
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

      <View style={[styles.searchSection, { backgroundColor: COLORS.bg }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: COLORS.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search drivers..."
            placeholderTextColor={COLORS.textMuted}
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
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: '#ffffff' },
  tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#E25500', fontWeight: '600' },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  driverCard: { marginBottom: 12 },
  driverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  driverTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  driverMeta: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '600' },
  driverVehicle: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, borderRadius: 10, padding: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2 },
  driverActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 10, gap: 4 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 10, gap: 4 },
  viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 10 },
  actionBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
