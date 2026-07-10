import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { drivers, COLORS, SPACING, RADIUS, GRADIENTS, AnimatedNumber } from '@easyryde/shared';

// FIX BUG 5: Removed hardcoded WEEKLY_DATA. Weekly breakdown is now derived from real API transactions.

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0, total: 0, pendingPayout: 0 });
  const [weeklyData, setWeeklyData] = useState<{ day: string; earnings: number; trips: number }[]>([]);
  const [recentTrips, setRecentTrips] = useState<{ id: string; date: string; pickup: string; dropoff: string; fare: number; distance: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month'>('week');

  async function loadEarnings() {
    try {
      const data: any = await drivers.earnings();
      setEarnings({
        today: data.today_earnings || 0,
        week: data.week_earnings || data.total_earnings * 0.25 || 0,
        month: data.month_earnings || data.total_earnings || 0,
        total: data.total_earnings || 0,
        pendingPayout: data.pending_payout || 0,
      });

      // Derive weekly breakdown from recent transactions
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekMap: Record<string, { earnings: number; trips: number }> = {};
      dayNames.forEach((d) => { weekMap[d] = { earnings: 0, trips: 0 }; });

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      (data.recent_transactions || []).forEach((tx: any) => {
        const txDate = new Date(tx.created_at);
        if (txDate >= weekAgo && tx.type === 'credit') {
          const day = dayNames[txDate.getDay()];
          weekMap[day].earnings += tx.amount;
          weekMap[day].trips += 1;
        }
      });

      // Order: Mon-Sun
      const ordered = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => ({
        day: d,
        earnings: weekMap[d].earnings,
        trips: weekMap[d].trips,
      }));
      setWeeklyData(ordered);

      // Load recent trips for ride-by-ride breakdown
      try {
        const tripsData = await drivers.trips();
        setRecentTrips(
          (tripsData.data || []).slice(0, 10).map((r: any) => ({
            id: r.id,
            date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }) : '',
            pickup: r.pickup_address || 'Pickup',
            dropoff: r.dropoff_address || 'Dropoff',
            fare: r.total_fare || 0,
            distance: r.distance_km ? `${r.distance_km.toFixed(1)} km` : '? km',
          }))
        );
      } catch (err) {
        console.warn('Failed to load recent trips:', err);
      }
    } catch (err) {
      console.warn('Failed to load earnings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadEarnings(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEarnings();
  }, []);

  const maxWeekly = weeklyData.length > 0 ? Math.max(...weeklyData.map(d => d.earnings)) : 1;
  const weekTotal = weeklyData.reduce((sum, d) => sum + d.earnings, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#16a34a', '#15803d']} style={styles.headerGradient}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Earnings</Text>
            <Ionicons name="cash" size={24} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={styles.headerSubtitle}>Track your income in Phalaborwa</Text>

          <View style={styles.weekCard}>
            <Text style={styles.weekLabel}>THIS WEEK</Text>
            <Text style={styles.weekValue}>R{weekTotal.toFixed(0)}</Text>
            <View style={styles.weekTrend}>
              <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.weekTrendText}>+15% from last week</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.periodToggle}>
            {(['today', 'week', 'month'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodBtn, activePeriod === period && styles.periodBtnActive]}
                onPress={() => setActivePeriod(period)}
              >
                <Text style={[styles.periodBtnText, activePeriod === period && styles.periodBtnTextActive]}>
                  {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.earningsHighlight}>
            <View style={styles.earningsMain}>
              <Text style={styles.earningsCurrency}>R</Text>
              <AnimatedNumber
                value={activePeriod === 'today' ? earnings.today : activePeriod === 'week' ? weekTotal : earnings.month}
                style={{ fontSize: 42, color: COLORS.white, fontWeight: '800' }}
              />
            </View>
            <Text style={styles.earningsPeriodLabel}>
              {activePeriod === 'today' ? "Today's Earnings" : activePeriod === 'week' ? 'Weekly Earnings' : 'Monthly Earnings'}
            </Text>
          </View>

          {earnings.pendingPayout > 0 && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingRow}>
                <View style={styles.pendingInfo}>
                  <Ionicons name="wallet" size={20} color="#FFAD7A" />
                  <View>
                    <Text style={styles.pendingLabel}>Pending Payout</Text>
                    <Text style={styles.pendingHint}>Available in 24-48 hours</Text>
                  </View>
                </View>
                <Text style={styles.pendingValue}>R{earnings.pendingPayout.toFixed(0)}</Text>
              </View>
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>WEEKLY BREAKDOWN</Text>
            <View style={styles.weeklyBars}>
              {weeklyData.map((day) => (
                <View key={day.day} style={styles.barRow}>
                  <Text style={styles.barDay}>{day.day}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(day.earnings / maxWeekly) * 100}%` }]}>
                      {day.earnings > 100 && (
                        <Text style={styles.barValue}>R{day.earnings.toFixed(0)}</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.barTrips}>{day.trips}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>EARNINGS BREAKDOWN</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Trip Fares (85%)</Text>
              <Text style={styles.breakdownValue}>R{(weekTotal * 0.85).toFixed(0)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tips</Text>
              <Text style={styles.breakdownValue}>R{(weekTotal * 0.10).toFixed(0)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Promotions</Text>
              <Text style={styles.breakdownValue}>R{(weekTotal * 0.05).toFixed(0)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Total</Text>
              <Text style={styles.breakdownTotalValue}>R{weekTotal.toFixed(0)}</Text>
            </View>
          </View>

          {recentTrips.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>RECENT RIDES</Text>
              {recentTrips.map((trip, index) => (
                <View key={trip.id} style={[styles.tripRow, index < recentTrips.length - 1 && styles.tripRowBorder]}>
                  <View style={styles.tripInfo}>
                    <View style={styles.tripLocations}>
                      <View style={styles.tripLocationRow}>
                        <View style={styles.tripDot} />
                        <Text style={styles.tripLocationText} numberOfLines={1}>{trip.pickup}</Text>
                      </View>
                      <View style={styles.tripLocationRow}>
                        <View style={styles.tripPin}>
                          <Ionicons name="location" size={8} color="#FFAD7A" />
                        </View>
                        <Text style={styles.tripLocationText} numberOfLines={1}>{trip.dropoff}</Text>
                      </View>
                    </View>
                    <View style={styles.tripMeta}>
                      <Text style={styles.tripDate}>{trip.date}</Text>
                      <Text style={styles.tripDistance}>{trip.distance}</Text>
                    </View>
                  </View>
                  <Text style={styles.tripFare}>R{trip.fare.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.cashOutBtn} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.success, COLORS.successLight]} style={styles.cashOutGradient}>
              <Ionicons name="wallet" size={20} color="#fff" />
              <Text style={styles.cashOutText}>Cash Out (R{(activePeriod === 'today' ? earnings.today : activePeriod === 'week' ? weekTotal : earnings.month).toFixed(0)})</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  scrollView: { flex: 1 },
  headerGradient: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'],
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 16 },
  weekCard: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, padding: 16,
  },
  weekLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  weekValue: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4 },
  weekTrend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  weekTrendText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  content: { padding: SPACING.base, gap: 12 },

  periodToggle: {
    flexDirection: 'row', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
    padding: 4, gap: 4,
  },
  periodBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm,
  },
  periodBtnActive: { backgroundColor: COLORS.success },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  periodBtnTextActive: { color: '#fff' },

  earningsHighlight: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  earningsMain: { flexDirection: 'row', alignItems: 'baseline' },
  earningsCurrency: { fontSize: 24, fontWeight: '600', color: COLORS.textMuted, marginRight: 4 },
  earningsPeriodLabel: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },

  pendingCard: {
    backgroundColor: 'rgba(255, 173, 122, 0.15)', borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255, 173, 122, 0.3)',
  },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pendingLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  pendingHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  pendingValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },

  sectionCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 16 },

  weeklyBars: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barDay: { fontSize: 13, color: COLORS.textMuted, width: 32 },
  barTrack: {
    flex: 1, height: 24, backgroundColor: COLORS.surfaceLight, borderRadius: 12,
    overflow: 'hidden', marginHorizontal: 8,
  },
  barFill: {
    height: '100%', backgroundColor: COLORS.success, borderRadius: 12,
    justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8,
    minWidth: 40,
  },
  barValue: { fontSize: 10, fontWeight: '600', color: '#fff' },
  barTrips: { fontSize: 11, color: COLORS.textMuted, width: 24, textAlign: 'right' },

  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: 14, color: COLORS.textMuted },
  breakdownValue: { fontSize: 14, color: '#fff' },
  breakdownDivider: { height: 1, backgroundColor: COLORS.surfaceBorder, marginVertical: 8 },
  breakdownTotalLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
  breakdownTotalValue: { fontSize: 16, fontWeight: '700', color: COLORS.success },

  tripRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
  tripRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.surfaceBorder },
  tripInfo: { flex: 1, marginRight: 12 },
  tripLocations: { gap: 4, marginBottom: 6 },
  tripLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.success },
  tripPin: {
    width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  tripLocationText: { fontSize: 12, color: '#fff', flex: 1 },
  tripMeta: { flexDirection: 'row', gap: 8 },
  tripDate: { fontSize: 11, color: COLORS.textMuted },
  tripDistance: { fontSize: 11, color: COLORS.textMuted },
  tripFare: { fontSize: 15, fontWeight: '700', color: COLORS.success },

  cashOutBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: 4 },
  cashOutGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, gap: 8,
  },
  cashOutText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
