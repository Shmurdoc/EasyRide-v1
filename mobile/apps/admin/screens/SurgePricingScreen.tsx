import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
  StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { useSurgeZones } from '../hooks/useSurgePricing';
import { usePeakHours } from '../hooks/usePeakHours';
import { Card } from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';

type Nav = NativeStackNavigationProp<any>;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SurgePricingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { zones, loading: zonesLoading, error: zonesError, refreshing: zonesRefreshing, refresh: refreshZones } = useSurgeZones();
  const { hours, loading: hoursLoading, error: hoursError, refreshing: hoursRefreshing, refresh: refreshHours } = usePeakHours();

  const loading = zonesLoading && !zonesRefreshing;
  const error = zonesError || hoursError;
  const refreshing = zonesRefreshing || hoursRefreshing;

  const refresh = useCallback(async () => {
    await Promise.all([refreshZones(), refreshHours()]);
  }, [refreshZones, refreshHours]);

  const activeZones = zones.filter(z => z.is_active);
  const activeHours = hours.filter(h => h.is_active);
  const maxMultiplier = Math.max(1, ...activeZones.map(z => z.multiplier), ...activeHours.map(h => h.multiplier));
  const avgMultiplier = activeZones.length > 0
    ? (activeZones.reduce((sum, z) => sum + z.multiplier, 0) / activeZones.length)
    : 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Surge Pricing</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview Stats */}
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>ACTIVE ZONES</Text>
              <Text style={styles.statValue}>{activeZones.length}</Text>
              <Text style={styles.statSub}>of {zones.length} total</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>PEAK HOURS</Text>
              <Text style={styles.statValue}>{activeHours.length}</Text>
              <Text style={styles.statSub}>of {hours.length} total</Text>
            </Card>
          </View>

          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>MAX SURGE</Text>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{maxMultiplier.toFixed(1)}x</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>AVG MULTIPLIER</Text>
              <Text style={[styles.statValue, { color: ADMIN_COLORS.accent }]}>{avgMultiplier.toFixed(1)}x</Text>
            </Card>
          </View>

          {/* Surge Multiplier Visual */}
          <Card style={styles.multiplierCard}>
            <View style={styles.multiplierHeader}>
              <Ionicons name="trending-up" size={22} color="#f59e0b" />
              <Text style={styles.multiplierTitle}>Current Surge Level</Text>
            </View>
            <View style={styles.multiplierDisplay}>
              <Text style={styles.multiplierValue}>{avgMultiplier.toFixed(1)}</Text>
              <Text style={styles.multiplierX}>x</Text>
            </View>
            <View style={styles.multiplierBar}>
              <View style={[styles.multiplierFill, { width: `${Math.min((avgMultiplier / 2.5) * 100, 100)}%` }]} />
            </View>
            <View style={styles.multiplierLabels}>
              <Text style={styles.multiplierLabel}>1.0x</Text>
              <Text style={styles.multiplierLabel}>1.5x</Text>
              <Text style={styles.multiplierLabel}>2.0x</Text>
              <Text style={styles.multiplierLabel}>2.5x</Text>
            </View>
          </Card>

          {/* Active Surge Zones */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={ADMIN_COLORS.accent} />
              <Text style={styles.sectionTitle}>Active Surge Zones</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminSurgeZones')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeZones.length === 0 ? (
              <Text style={styles.emptyText}>No active surge zones</Text>
            ) : (
              activeZones.slice(0, 3).map(zone => (
                <View key={zone.id} style={styles.zoneRow}>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <Text style={styles.zoneDetail}>{zone.radius_meters}m radius</Text>
                  </View>
                  <View style={[styles.zoneMultiplier, { backgroundColor: zone.multiplier >= 2.0 ? '#dc2626' : zone.multiplier >= 1.5 ? '#f59e0b' : '#16a34a' }]}>
                    <Text style={styles.zoneMultiplierText}>{zone.multiplier.toFixed(1)}x</Text>
                  </View>
                </View>
              ))
            )}
          </Card>

          {/* Active Peak Hours */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Active Peak Hours</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminPeakHours')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeHours.length === 0 ? (
              <Text style={styles.emptyText}>No active peak hours</Text>
            ) : (
              activeHours.slice(0, 3).map(hour => (
                <View key={hour.id} style={styles.zoneRow}>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>{hour.name}</Text>
                    <Text style={styles.zoneDetail}>{DAY_NAMES[hour.day_of_week]} {hour.start_time} - {hour.end_time}</Text>
                  </View>
                  <View style={[styles.zoneMultiplier, { backgroundColor: hour.multiplier >= 2.0 ? '#dc2626' : hour.multiplier >= 1.5 ? '#f59e0b' : '#16a34a' }]}>
                    <Text style={styles.zoneMultiplierText}>{hour.multiplier.toFixed(1)}x</Text>
                  </View>
                </View>
              ))
            )}
          </Card>

          {/* Quick Actions */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={20} color={ADMIN_COLORS.accent} />
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminSurgeZones')}>
              <Ionicons name="location-outline" size={20} color={ADMIN_COLORS.accent} />
              <Text style={styles.actionText}>Manage Surge Zones</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminPeakHours')}>
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
              <Text style={styles.actionText}>Manage Peak Hours</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  statCard: { flex: 1, marginBottom: 12 },
  statLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  statSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  multiplierCard: { marginBottom: 16 },
  multiplierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  multiplierTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  multiplierDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 16 },
  multiplierValue: { fontSize: 64, fontWeight: '800', color: '#f59e0b' },
  multiplierX: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginLeft: 4 },
  multiplierBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 8 },
  multiplierFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  multiplierLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  multiplierLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  sectionCard: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', flex: 1 },
  seeAll: { fontSize: 13, fontWeight: '600', color: ADMIN_COLORS.accent },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 16 },
  zoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  zoneDetail: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  zoneMultiplier: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  zoneMultiplierText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  actionText: { fontSize: 14, fontWeight: '600', color: '#ffffff', flex: 1 },
});
