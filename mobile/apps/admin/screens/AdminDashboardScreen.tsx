import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Dimensions, StatusBar, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import FleetStatus from '../components/dashboard/FleetStatus';
import ActiveRidesCard from '../components/dashboard/ActiveRidesCard';
import PoolRidesCard from '../components/dashboard/PoolRidesCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import HourlyChart from '../components/dashboard/HourlyChart';
import TopDrivers from '../components/dashboard/TopDrivers';
import ApiHealthCard from '../components/inspector/ApiHealthCard';
import RideFlowCard from '../components/inspector/RideFlowCard';
import QueueHealthCard from '../components/inspector/QueueHealthCard';
import { useInspectorStats } from '../hooks/useInspectorStats';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onMenuPress?: () => void;
}

export default function AdminDashboardScreen({ onMenuPress }: Props) {
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, refresh } = useAdminDashboard();
  const { apiStats, rideFlow, queueHealth } = useInspectorStats(30000);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
              <Ionicons name="menu" size={22} color="#ffffff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSub}>EasyRyde Admin Panel</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color="#ffffff" />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      <Animated.ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ADMIN_COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <FleetStatus
          online={data?.fleetStatus?.online ?? 0}
          offline={data?.fleetStatus?.offline ?? 0}
          onRide={data?.fleetStatus?.onRide ?? 0}
          total={data?.fleetStatus?.total ?? 0}
        />

        <ActiveRidesCard rides={data?.activeRidesList ?? []} />

        <PoolRidesCard
          activePoolRides={data?.activePoolRides ?? data?.active_pool_rides ?? 0}
          totalPoolPassengers={data?.totalPoolPassengers ?? data?.total_pool_passengers ?? 0}
        />

        <HourlyChart data={data?.hourly ?? []} />

        <TopDrivers drivers={data?.topDrivers ?? []} />

        <ActivityFeed items={data?.recentActivity ?? []} />

        <ApiHealthCard stats={apiStats} />
        <RideFlowCard stats={rideFlow} />
        <QueueHealthCard stats={queueHealth} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: '#1a1a2e' },
  body: { flex: 1 },
});
