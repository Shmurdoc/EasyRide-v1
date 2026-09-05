import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@easyryde/shared';
import { COLORS } from '@easyryde/shared';
import { ADMIN_COLORS } from '../constants/theme';
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
  const theme = useTheme();
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

  const getMultiplierColor = (mult: number) => {
    if (mult >= 2.0) return COLORS.error;
    if (mult >= 1.5) return COLORS.warning;
    return COLORS.success;
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Surge Pricing</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>ACTIVE ZONES</Text>
              <Text style={[styles.statValue, { color: COLORS.text }]}>{activeZones.length}</Text>
              <Text style={[styles.statSub, { color: COLORS.textMuted }]}>of {zones.length} total</Text>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>PEAK HOURS</Text>
              <Text style={[styles.statValue, { color: COLORS.text }]}>{activeHours.length}</Text>
              <Text style={[styles.statSub, { color: COLORS.textMuted }]}>of {hours.length} total</Text>
            </Card>
          </View>
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>MAX SURGE</Text>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{maxMultiplier.toFixed(1)}x</Text>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>AVG MULTIPLIER</Text>
              <Text style={[styles.statValue, { color: COLORS.brand }]}>{avgMultiplier.toFixed(1)}x</Text>
            </Card>
          </View>

          <Card style={[styles.multiplierCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <View style={styles.multiplierHeader}>
              <Ionicons name="trending-up" size={22} color={COLORS.warning} />
              <Text style={[styles.multiplierTitle, { color: COLORS.text }]}>Current Surge Level</Text>
            </View>
            <View style={styles.multiplierDisplay}>
              <Text style={[styles.multiplierValue, { color: COLORS.warning }]}>{avgMultiplier.toFixed(1)}</Text>
              <Text style={[styles.multiplierX, { color: COLORS.textMuted }]}>x</Text>
            </View>
            <View style={[styles.multiplierBar, { backgroundColor: COLORS.surfaceBorder }]}>
              <View style={[styles.multiplierFill, { width: `${Math.min((avgMultiplier / 2.5) * 100, 100)}%`, backgroundColor: COLORS.warning }]} />
            </View>
            <View style={styles.multiplierLabels}>
              <Text style={[styles.multiplierLabel, { color: COLORS.textMuted }]}>1.0x</Text>
              <Text style={[styles.multiplierLabel, { color: COLORS.textMuted }]}>1.5x</Text>
              <Text style={[styles.multiplierLabel, { color: COLORS.textMuted }]}>2.0x</Text>
              <Text style={[styles.multiplierLabel, { color: COLORS.textMuted }]}>2.5x</Text>
            </View>
          </Card>

          <Card style={[styles.sectionCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={COLORS.brand} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Active Surge Zones</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminSurgeZones')}>
                <Text style={[styles.seeAll, { color: COLORS.brand }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeZones.length === 0 ? (
              <Text style={[styles.emptyText, { color: COLORS.textMuted }]}>No active surge zones</Text>
            ) : activeZones.slice(0, 3).map(zone => (
              <View key={zone.id} style={[styles.zoneRow, { borderBottomColor: COLORS.border }]}>
                <View style={styles.zoneInfo}>
                  <Text style={[styles.zoneName, { color: COLORS.text }]}>{zone.name}</Text>
                  <Text style={[styles.zoneDetail, { color: COLORS.textMuted }]}>{zone.radius_meters}m radius</Text>
                </View>
                <View style={[styles.zoneMultiplier, { backgroundColor: getMultiplierColor(zone.multiplier) }]}>
                  <Text style={styles.zoneMultiplierText}>{zone.multiplier.toFixed(1)}x</Text>
                </View>
              </View>
            ))}
          </Card>

          <Card style={[styles.sectionCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Active Peak Hours</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminPeakHours')}>
                <Text style={[styles.seeAll, { color: COLORS.brand }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeHours.length === 0 ? (
              <Text style={[styles.emptyText, { color: COLORS.textMuted }]}>No active peak hours</Text>
            ) : activeHours.slice(0, 3).map(hour => (
              <View key={hour.id} style={[styles.zoneRow, { borderBottomColor: COLORS.border }]}>
                <View style={styles.zoneInfo}>
                  <Text style={[styles.zoneName, { color: COLORS.text }]}>{hour.name}</Text>
                  <Text style={[styles.zoneDetail, { color: COLORS.textMuted }]}>{DAY_NAMES[hour.day_of_week]} {hour.start_time} - {hour.end_time}</Text>
                </View>
                <View style={[styles.zoneMultiplier, { backgroundColor: getMultiplierColor(hour.multiplier) }]}>
                  <Text style={styles.zoneMultiplierText}>{hour.multiplier.toFixed(1)}x</Text>
                </View>
              </View>
            ))}
          </Card>

          <Card style={[styles.sectionCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={20} color={COLORS.brand} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Quick Actions</Text>
            </View>
            <TouchableOpacity style={[styles.actionBtn, { borderBottomColor: COLORS.border }]} onPress={() => navigation.navigate('AdminSurgeZones')}>
              <Ionicons name="location-outline" size={20} color={COLORS.brand} />
              <Text style={[styles.actionText, { color: COLORS.text }]}>Manage Surge Zones</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminPeakHours')}>
              <Ionicons name="time-outline" size={20} color={COLORS.warning} />
              <Text style={[styles.actionText, { color: COLORS.text }]}>Manage Peak Hours</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  statCard: { flex: 1, marginBottom: 12 },
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statSub: { fontSize: 12, marginTop: 2 },
  multiplierCard: { marginBottom: 16 },
  multiplierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  multiplierTitle: { fontSize: 16, fontWeight: '700' },
  multiplierDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 16 },
  multiplierValue: { fontSize: 64, fontWeight: '800' },
  multiplierX: { fontSize: 28, fontWeight: '700', marginLeft: 4 },
  multiplierBar: { height: 8, borderRadius: 4, marginBottom: 8 },
  multiplierFill: { height: '100%', borderRadius: 4 },
  multiplierLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  multiplierLabel: { fontSize: 11 },
  sectionCard: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  zoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 14, fontWeight: '600' },
  zoneDetail: { fontSize: 12, marginTop: 2 },
  zoneMultiplier: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  zoneMultiplierText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  actionText: { fontSize: 14, fontWeight: '600', flex: 1 },
});
