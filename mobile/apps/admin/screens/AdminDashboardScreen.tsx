import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Dimensions, StatusBar, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '@easyryde/shared';
import { COLORS } from '@easyryde/shared';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { Card } from '../components/common/Card';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHALABORWA = { latitude: -23.9421, longitude: 31.1408 };

type Nav = NativeStackNavigationProp<any>;

const dummyDrivers = [
  { id: 'D-4521', name: 'John Mkhonto', status: 'online', coords: { latitude: -23.9405, longitude: 31.1390 } },
  { id: 'D-4522', name: 'Sarah Dlamini', status: 'busy', coords: { latitude: -23.9550, longitude: 31.1500 } },
  { id: 'D-4523', name: 'Mike Ndlovu', status: 'online', coords: { latitude: -23.9350, longitude: 31.1250 } },
  { id: 'D-4524', name: 'Anna Khoza', status: 'online', coords: { latitude: -23.9480, longitude: 31.1480 } },
  { id: 'D-4525', name: 'Tom Mulaudzi', status: 'busy', coords: { latitude: -23.9620, longitude: 31.1180 } },
];

const hourlyData = [
  { hour: '6AM', rides: 12 }, { hour: '8AM', rides: 45 }, { hour: '10AM', rides: 38 },
  { hour: '12PM', rides: 52 }, { hour: '2PM', rides: 41 }, { hour: '4PM', rides: 48 },
  { hour: '6PM', rides: 65 }, { hour: '8PM', rides: 58 },
];

const recentActivity = [
  { type: 'ride_completed', message: 'Ride R-28460 completed by John Mkhonto', time: '1 min ago' },
  { type: 'driver_online', message: 'Mike Ndlovu went online', time: '3 min ago' },
  { type: 'new_user', message: 'New user registered: Peter Thabo', time: '5 min ago' },
  { type: 'surge_active', message: 'Surge pricing active in CBD zone (1.4x)', time: '8 min ago' },
];

const topDrivers = [
  { id: 'D-4522', name: 'Sarah Dlamini', trips: 2156, status: 'busy' as const },
  { id: 'D-4521', name: 'John Mkhonto', trips: 1847, status: 'online' as const },
  { id: 'D-4526', name: 'Lisa Mabunda', trips: 1543, status: 'online' as const },
];

const ACTIVITY_COLORS: Record<string, string> = {
  ride_completed: COLORS.success,
  driver_online: COLORS.info,
  new_user: COLORS.brand,
  surge_active: COLORS.warning,
  ride_request: COLORS.brand,
};

interface Props {
  navigation?: Nav;
}

export default function AdminDashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { data, loading, refreshing, refresh } = useAdminDashboard();
  const liveAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(liveAnim, { toValue: 0.4, duration: 750, useNativeDriver: true }),
        Animated.timing(liveAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [liveAnim]);

  const revenueToday = data?.revenueToday ?? 28450;
  const ridesToday = data?.ridesToday ?? 156;
  const fleetOnline = data?.fleetStatus?.online ?? 28;
  const fleetBusy = data?.fleetStatus?.onRide ?? 14;
  const fleetOffline = data?.fleetStatus?.offline ?? 8;
  const activeRides = data?.activeRidesList ?? [];
  const topDriversData = data?.topDrivers ?? topDrivers;
  const activityData = data?.recentActivity ?? recentActivity;
  const chartData = data?.hourly ?? hourlyData;
  const maxRides = Math.max(...chartData.map(d => d.rides), 1);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFill}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...PHALABORWA, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
          provider={PROVIDER_GOOGLE}
          customMapStyle={darkMapStyle}
          zoomEnabled={false}
          scrollEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {dummyDrivers.map(d => (
            <Marker key={d.id} coordinate={d.coords} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={[styles.markerPulse, d.status === 'online' ? styles.markerGreen : styles.markerOrange]}>
                <View style={[styles.markerDot, d.status === 'online' ? styles.markerDotGreen : styles.markerDotOrange]}>
                  <Ionicons name="car" size={12} color="#fff" />
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      </View>

      <ScrollView
        style={styles.scrollOverlay}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.brand} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Dashboard</Text>
              <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.liveBadge}>
                <Animated.View style={[styles.liveDot, { opacity: liveAnim }]} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Avatar name="Admin" size={40} borderColor="rgba(255,255,255,0.3)" />
            </View>
          </View>

          <View style={styles.metricRow}>
            <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.metricCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.metricLabel}>Today's Revenue</Text>
              <Text style={styles.metricValue}>R{revenueToday.toLocaleString()}</Text>
              <View style={styles.metricTrend}>
                <Ionicons name="trending-up" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.metricTrendText}>+12.5%</Text>
              </View>
            </LinearGradient>
            <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.metricCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.metricLabel}>Total Rides</Text>
              <Text style={styles.metricValue}>{ridesToday}</Text>
              <View style={styles.metricTrend}>
                <Ionicons name="trending-up" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.metricTrendText}>+8.3%</Text>
              </View>
            </LinearGradient>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Card>
            <View style={styles.fleetHeader}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Fleet Status</Text>
            </View>
            <View style={styles.fleetGrid}>
              <View style={[styles.fleetItem, { backgroundColor: COLORS.surfaceLight }]}>
                <Text style={[styles.fleetValue, { color: COLORS.success }]}>{fleetOnline}</Text>
                <Text style={[styles.fleetLabel, { color: COLORS.textMuted }]}>Online</Text>
              </View>
              <View style={[styles.fleetItem, { backgroundColor: COLORS.surfaceLight }]}>
                <Text style={[styles.fleetValue, { color: COLORS.brand }]}>{fleetBusy}</Text>
                <Text style={[styles.fleetLabel, { color: COLORS.textMuted }]}>Busy</Text>
              </View>
              <View style={[styles.fleetItem, { backgroundColor: COLORS.surfaceLight }]}>
                <Text style={[styles.fleetValue, { color: COLORS.textMuted }]}>{fleetOffline}</Text>
                <Text style={[styles.fleetLabel, { color: COLORS.textMuted }]}>Offline</Text>
              </View>
              <View style={[styles.fleetItem, { backgroundColor: COLORS.surfaceLight }]}>
                <Text style={[styles.fleetValue, { color: COLORS.brand }]}>{fleetOnline + fleetBusy}</Text>
                <Text style={[styles.fleetLabel, { color: COLORS.textMuted }]}>Active</Text>
              </View>
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Active Rides</Text>
              <Text style={[styles.sectionCount, { color: COLORS.brand }]}>{activeRides.length} in progress</Text>
            </View>
            {(activeRides.length > 0 ? activeRides : dummyActiveRides).slice(0, 3).map((ride) => (
              <TouchableOpacity
                key={ride.id}
                style={[styles.rideItem, { backgroundColor: COLORS.surfaceLight }]}
                onPress={() => navigation?.navigate('AdminRideDetail', { id: ride.id })}
                activeOpacity={0.7}
              >
                <View style={[styles.rideIconWrap, { backgroundColor: 'rgba(255,106,0,0.15)' }]}>
                  <Ionicons name="car" size={16} color={COLORS.brand} />
                </View>
                <View style={styles.rideInfo}>
                  <Text style={[styles.ridePassenger, { color: COLORS.text }]}>{ride.passenger}</Text>
                  <Text style={[styles.rideRoute, { color: COLORS.textMuted }]}>{ride.pickup} → {ride.dropoff}</Text>
                </View>
                <View style={styles.rideRight}>
                  <Text style={[styles.rideFare, { color: COLORS.brand }]}>R{ride.fare}</Text>
                  <ProgressBar progress={ride.progress} height={4} />
                </View>
              </TouchableOpacity>
            ))}
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Hourly Activity</Text>
            <View style={styles.chartContainer}>
              {chartData.map((d, i) => {
                const barHeight = (d.rides / maxRides) * 100;
                return (
                  <View key={i} style={styles.chartCol}>
                    <View style={[styles.chartBar, { height: `${Math.max(barHeight, 4)}%`, backgroundColor: COLORS.brand }]} />
                    <Text style={[styles.chartLabel, { color: COLORS.textMuted }]}>{d.hour}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Recent Activity</Text>
            {activityData.slice(0, 4).map((activity, idx) => (
              <View key={idx} style={[styles.activityItem, { borderBottomColor: COLORS.border }]}>
                <View style={[styles.activityDot, { backgroundColor: ACTIVITY_COLORS[activity.type] || COLORS.brand }]} />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityMessage, { color: COLORS.text }]}>{activity.message}</Text>
                  <Text style={[styles.activityTime, { color: COLORS.textMuted }]}>{activity.time}</Text>
                </View>
              </View>
            ))}
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Top Drivers Today</Text>
            {topDriversData.slice(0, 3).map((driver, idx) => (
              <View key={driver.id} style={[styles.driverItem, { borderBottomColor: COLORS.border }]}>
                <Text style={[styles.driverRank, { color: COLORS.brand }]}>#{idx + 1}</Text>
                <Avatar name={driver.name} size={32} />
                <View style={styles.driverInfo}>
                  <Text style={[styles.driverName, { color: COLORS.text }]}>{driver.name}</Text>
                  <Text style={[styles.driverTrips, { color: COLORS.textMuted }]}>{driver.trips} trips</Text>
                </View>
                <Badge variant={driver.status as any} label={driver.status} />
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const dummyActiveRides = [
  { id: 'R-28471', passenger: 'Sarah Anderson', pickup: 'Shoprite Centre', dropoff: 'Kruger Gate', fare: 185, progress: 45 },
  { id: 'R-28470', passenger: 'Michael Brown', pickup: 'Town Center', dropoff: 'Namakgale', fare: 95, progress: 72 },
  { id: 'R-28469', passenger: 'Emma Wilson', pickup: 'Airport', dropoff: 'Letaba Ranch', fare: 245, progress: 23 },
];

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A8A8F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0F' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#161618' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8A8A8F' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A0A0F' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollOverlay: { flex: 1, position: 'relative', zIndex: 1 },
  header: { paddingBottom: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  date: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#f87171' },
  metricRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  metricCard: { flex: 1, borderRadius: 16, padding: 16 },
  metricLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  metricTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metricTrendText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionCount: { fontSize: 12, fontWeight: '600' },
  fleetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fleetGrid: { flexDirection: 'row', gap: 8 },
  fleetItem: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  fleetValue: { fontSize: 20, fontWeight: '700' },
  fleetLabel: { fontSize: 10, marginTop: 2 },
  rideItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, marginBottom: 8 },
  rideIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rideInfo: { flex: 1 },
  ridePassenger: { fontSize: 14, fontWeight: '600' },
  rideRoute: { fontSize: 11 },
  rideRight: { alignItems: 'flex-end', width: 80 },
  rideFare: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, gap: 4 },
  chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 4, minHeight: 4, opacity: 0.9 },
  chartLabel: { fontSize: 10, marginTop: 4 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginRight: 10 },
  activityContent: { flex: 1 },
  activityMessage: { fontSize: 14 },
  activityTime: { fontSize: 11, marginTop: 2 },
  driverItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  driverRank: { fontSize: 13, fontWeight: '700', width: 28 },
  driverInfo: { flex: 1, marginLeft: 10 },
  driverName: { fontSize: 14, fontWeight: '600' },
  driverTrips: { fontSize: 11 },
  markerPulse: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  markerGreen: { backgroundColor: 'rgba(31,157,85,0.25)' },
  markerOrange: { backgroundColor: 'rgba(255,106,0,0.25)' },
  markerDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  markerDotGreen: { backgroundColor: COLORS.success },
  markerDotOrange: { backgroundColor: COLORS.brand },
});
