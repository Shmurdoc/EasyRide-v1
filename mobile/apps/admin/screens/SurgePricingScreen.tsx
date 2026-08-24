import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADMIN_COLORS, ADMIN_GRADIENTS, ADMIN_RADIUS } from '../constants/theme';
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
  const refresh = useCallback(async () => { await Promise.all([refreshZones(), refreshHours()]); }, [refreshZones, refreshHours]);
  const activeZones = zones.filter(z => z.is_active);
  const activeHours = hours.filter(h => h.is_active);
  const maxMultiplier = Math.max(1, ...activeZones.map(z => z.multiplier), ...activeHours.map(h => h.multiplier));
  const avgMultiplier = activeZones.length > 0 ? (activeZones.reduce((sum, z) => sum + z.multiplier, 0) / activeZones.length) : 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="chevron-back" size={22} color="#ffffff" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Surge Pricing</Text>
          </View>
        </View>
      </LinearGradient>
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}><Text style={styles.statLabel}>ACTIVE ZONES</Text><Text style={styles.statValue}>{activeZones.length}</Text><Text style={styles.statSub}>of {zones.length} total</Text></Card>
            <Card style={styles.statCard}><Text style={styles.statLabel}>PEAK HOURS</Text><Text style={styles.statValue}>{activeHours.length}</Text><Text style={styles.statSub}>of {hours.length} total</Text></Card>
          </View>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}><Text style={styles.statLabel}>MAX SURGE</Text><Text style={[styles.statValue, { color: '#F5A524' }]}>{maxMultiplier.toFixed(1)}x</Text></Card>
            <Card style={styles.statCard}><Text style={styles.statLabel}>AVG MULTIPLIER</Text><Text style={[styles.statValue, { color: ADMIN_COLORS.accent }]}>{avgMultiplier.toFixed(1)}x</Text></Card>
          </View>

          <Card style={styles.multiplierCard}>
            <View style={styles.multiplierHeader}><Ionicons name="trending-up" size={22} color="#F5A524" /><Text style={styles.multiplierTitle}>Current Surge Level</Text></View>
            <View style={styles.multiplierDisplay}><Text style={styles.multiplierValue}>{avgMultiplier.toFixed(1)}</Text><Text style={styles.multiplierX}>x</Text></View>
            <View style={styles.multiplierBar}><View style={[styles.multiplierFill, { width: `${Math.min((avgMultiplier / 2.5) * 100, 100)}%` }]} /></View>
            <View style={styles.multiplierLabels}><Text style={styles.multiplierLabel}>1.0x</Text><Text style={styles.multiplierLabel}>1.5x</Text><Text style={styles.multiplierLabel}>2.0x</Text><Text style={styles.multiplierLabel}>2.5x</Text></View>
          </Card>

          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={ADMIN_COLORS.accent} />
              <Text style={styles.sectionTitle}>Active Surge Zones</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminSurgeZones')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            {activeZones.length === 0 ? <Text style={styles.emptyText}>No active surge zones</Text> : activeZones.slice(0, 3).map(zone => (
              <View key={zone.id} style={styles.zoneRow}>
                <View style={styles.zoneInfo}><Text style={styles.zoneName}>{zone.name}</Text><Text style={styles.zoneDetail}>{zone.radius_meters}m radius</Text></View>
                <View style={[styles.zoneMultiplier, { backgroundColor: zone.multiplier >= 2.0 ? '#E5484D' : zone.multiplier >= 1.5 ? '#F5A524' : '#0A7C4E' }]}><Text style={styles.zoneMultiplierText}>{zone.multiplier.toFixed(1)}x</Text></View>
              </View>
            ))}
          </Card>

          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#F5A524" />
              <Text style={styles.sectionTitle}>Active Peak Hours</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminPeakHours')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            {activeHours.length === 0 ? <Text style={styles.emptyText}>No active peak hours</Text> : activeHours.slice(0, 3).map(hour => (
              <View key={hour.id} style={styles.zoneRow}>
                <View style={styles.zoneInfo}><Text style={styles.zoneName}>{hour.name}</Text><Text style={styles.zoneDetail}>{DAY_NAMES[hour.day_of_week]} {hour.start_time} - {hour.end_time}</Text></View>
                <View style={[styles.zoneMultiplier, { backgroundColor: hour.multiplier >= 2.0 ? '#E5484D' : hour.multiplier >= 1.5 ? '#F5A524' : '#0A7C4E' }]}><Text style={styles.zoneMultiplierText}>{hour.multiplier.toFixed(1)}x</Text></View>
              </View>
            ))}
          </Card>

          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}><Ionicons name="flash" size={20} color={ADMIN_COLORS.accent} /><Text style={styles.sectionTitle}>Quick Actions</Text></View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminSurgeZones')}>
              <Ionicons name="location-outline" size={20} color={ADMIN_COLORS.accent} /><Text style={styles.actionText}>Manage Surge Zones</Text><Ionicons name="chevron-forward" size={18} color="rgba(15,23,19,0.2)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminPeakHours')}>
              <Ionicons name="time-outline" size={20} color="#F5A524" /><Text style={styles.actionText}>Manage Peak Hours</Text><Ionicons name="chevron-forward" size={18} color="rgba(15,23,19,0.2)" />
            </TouchableOpacity>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F1' },
  header: { paddingBottom: 16, borderBottomLeftRadius: ADMIN_RADIUS.xl, borderBottomRightRadius: ADMIN_RADIUS.xl },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#ffffff' },
  body: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  statCard: { flex: 1, marginBottom: 12 },
  statLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#8A978F', marginBottom: 4 },
  statValue: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: '#0F1713' },
  statSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#8A978F', marginTop: 2 },
  multiplierCard: { marginBottom: 16 },
  multiplierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  multiplierTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0F1713' },
  multiplierDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 16 },
  multiplierValue: { fontFamily: 'Poppins_800ExtraBold', fontSize: 64, color: '#F5A524' },
  multiplierX: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#8A978F', marginLeft: 4 },
  multiplierBar: { height: 8, backgroundColor: '#E5EAE4', borderRadius: 4, marginBottom: 8 },
  multiplierFill: { height: '100%', backgroundColor: '#F5A524', borderRadius: 4 },
  multiplierLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  multiplierLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#8A978F' },
  sectionCard: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0F1713', flex: 1 },
  seeAll: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#0A7C4E' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#8A978F', textAlign: 'center', paddingVertical: 16 },
  zoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5EAE4' },
  zoneInfo: { flex: 1 },
  zoneName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0F1713' },
  zoneDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#8A978F', marginTop: 2 },
  zoneMultiplier: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  zoneMultiplierText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#ffffff' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5EAE4' },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0F1713', flex: 1 },
});
