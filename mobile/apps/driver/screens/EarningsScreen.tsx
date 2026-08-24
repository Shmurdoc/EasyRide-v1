import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, SafeAreaView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { drivers, AnimatedNumber, useTheme } from '@easyryde/shared';

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0, total: 0, pendingPayout: 0, trips: 0, hours: 0, rating: 4.8 });
  const [weeklyData, setWeeklyData] = useState<{ day: string; earnings: number; trips: number }[]>([]);
  const [recentTrips, setRecentTrips] = useState<{ id: string; date: string; pickup: string; dropoff: string; fare: number; distance: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month'>('week');
  const [weekTrend, setWeekTrend] = useState(0);
  const [breakdown, setBreakdown] = useState({ fares: 0, tips: 0, promos: 0 });
  const { colors, radius, spacing, shadows } = useTheme();

  async function loadEarnings() {
    try {
      const data: any = await drivers.earnings();
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const txs = data.recent_transactions || [];
      const weekTxs = txs.filter((t: any) => new Date(t.created_at) >= weekAgo);
      const lastWeekTxs = txs.filter((t: any) => new Date(t.created_at) >= lastWeekAgo && new Date(t.created_at) < weekAgo);
      const weekTotalCalc = weekTxs.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      const lastWeekTotal = lastWeekTxs.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      const monthTotal = txs.filter((t: any) => new Date(t.created_at) >= monthAgo).reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      setWeekTrend(lastWeekTotal > 0 ? Math.round(((weekTotalCalc - lastWeekTotal) / lastWeekTotal) * 100) : 0);
      setBreakdown({
        fares: weekTxs.filter((t: any) => t.type === 'credit' || t.type === 'fare').reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0),
        tips: weekTxs.filter((t: any) => t.type === 'tip').reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0),
        promos: weekTxs.filter((t: any) => t.type === 'promo' || t.type === 'bonus').reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0),
      });
      setEarnings({ today: data.today_earnings || 0, week: weekTotalCalc, month: monthTotal, total: data.total_earnings || 0, pendingPayout: data.pending_payout || 0, trips: data.total_trips || 0, hours: data.hours_online || 0, rating: data.rating || 4.8 });
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekMap: Record<string, { earnings: number; trips: number }> = {};
      dayNames.forEach((d) => { weekMap[d] = { earnings: 0, trips: 0 }; });
      const wAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      (data.recent_transactions || []).forEach((tx: any) => { const txDate = new Date(tx.created_at); if (txDate >= wAgo && tx.type === 'credit') { const day = dayNames[txDate.getDay()]; weekMap[day].earnings += tx.amount; weekMap[day].trips += 1; } });
      setWeeklyData(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => ({ day: d, earnings: weekMap[d].earnings, trips: weekMap[d].trips })));
      try { const tripsData = await drivers.trips(); setRecentTrips((tripsData.data || []).slice(0, 10).map((r: any) => ({ id: r.id, date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }) : '', pickup: r.pickup_address || 'Pickup', dropoff: r.dropoff_address || 'Dropoff', fare: r.total_fare || 0, distance: r.distance_km ? `${r.distance_km.toFixed(1)} km` : '? km' }))); } catch { }
    } catch (err) { console.warn('Failed to load earnings:', err); } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { loadEarnings(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadEarnings(); }, []);
  const maxWeekly = weeklyData.length > 0 ? Math.max(...weeklyData.map(d => d.earnings)) : 1;
  const weekTotal = weeklyData.reduce((sum, d) => sum + d.earnings, 0);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollView: { flex: 1 },
    headerSection: { paddingHorizontal: spacing.base, paddingTop: 16, paddingBottom: spacing.lg, borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.brandContrast },
    headerSubtext: { fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 16 },
    weekCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.xl, padding: spacing.lg },
    weekLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.6 },
    weekValue: { fontSize: 32, fontWeight: '800', color: colors.brandContrast, marginTop: 4 },
    weekTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    weekTrendText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },

    content: { padding: spacing.base, gap: spacing.md },

    statsRow: { flexDirection: 'row', gap: spacing.sm },
    statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    statValue: { fontSize: 16, fontWeight: '700', color: colors.success },
    statLabel: { fontSize: 10, fontWeight: '400', color: colors.textMuted, marginTop: 2 },

    periodToggle: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 4, gap: 4 },
    periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
    periodBtnActive: { backgroundColor: colors.success },
    periodBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    periodBtnTextActive: { color: colors.white },

    earningsHighlight: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    earningsMain: { flexDirection: 'row', alignItems: 'baseline' },
    earningsCurrency: { fontSize: 24, fontWeight: '600', color: colors.textMuted, marginRight: 4 },
    earningsAmount: { fontSize: 42, fontWeight: '800', color: colors.text },
    earningsPeriodLabel: { fontSize: 13, fontWeight: '400', color: colors.textMuted, marginTop: spacing.sm },

    pendingCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.base, borderWidth: 1, borderColor: colors.success, borderStyle: 'dashed' },
    pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pendingInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    pendingLabel: { fontSize: 14, fontWeight: '600', color: colors.success },
    pendingHint: { fontSize: 11, fontWeight: '400', color: colors.textMuted, marginTop: 2 },
    pendingValue: { fontSize: 20, fontWeight: '700', color: colors.success },

    sectionCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.base, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.6, marginBottom: spacing.base },

    weeklyBars: { gap: spacing.sm },
    barRow: { flexDirection: 'row', alignItems: 'center' },
    barDay: { fontSize: 13, fontWeight: '500', color: colors.textMuted, width: 32 },
    barTrack: { flex: 1, height: 24, backgroundColor: colors.surfaceLight, borderRadius: radius.full, overflow: 'hidden', marginHorizontal: spacing.sm },
    barFill: { height: '100%', borderRadius: radius.full, justifyContent: 'center', alignItems: 'flex-end', paddingRight: spacing.sm, minWidth: 4 },
    barValue: { fontSize: 10, fontWeight: '600', color: colors.brandContrast },
    barTrips: { fontSize: 11, fontWeight: '400', color: colors.textMuted, width: 24, textAlign: 'right' },

    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    breakdownLabel: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
    breakdownValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    breakdownDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
    breakdownTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
    breakdownTotalValue: { fontSize: 16, fontWeight: '700', color: colors.success },

    tripRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
    tripRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    tripInfo: { flex: 1, marginRight: spacing.md },
    tripLocations: { gap: 4, marginBottom: 6 },
    tripLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tripDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.success },
    tripPin: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.brandSoft, justifyContent: 'center', alignItems: 'center' },
    tripLocationText: { fontSize: 12, fontWeight: '400', color: colors.text, flex: 1 },
    tripMeta: { flexDirection: 'row', gap: spacing.sm },
    tripDate: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
    tripDistance: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
    tripFare: { fontSize: 15, fontWeight: '700', color: colors.success },

    cashOutBtn: { borderRadius: radius.xl, overflow: 'hidden' },
    cashOutGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.base, gap: spacing.sm },
    cashOutText: { fontSize: 18, fontWeight: '700', color: colors.brandContrast },

    emptyContainer: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    emptySubtext: { fontSize: 14, fontWeight: '400', color: colors.textMuted, textAlign: 'center' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.brand, colors.brandStrong] as const} style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Earnings</Text>
            <Ionicons name="cash" size={24} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={styles.headerSubtext}>Track your income in Phalaborwa</Text>
          <View style={styles.weekCard}>
            <Text style={styles.weekLabel}>THIS WEEK</Text>
            <Text style={styles.weekValue}>R{weekTotal.toFixed(0)}</Text>
            <View style={styles.weekTrendRow}>
              <Ionicons name={weekTrend >= 0 ? 'trending-up' : 'trending-down'} size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.weekTrendText}>{weekTrend >= 0 ? '+' : ''}{weekTrend}% from last week</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>R{earnings.today.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{earnings.trips}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{earnings.hours}h</Text>
              <Text style={styles.statLabel}>Online</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{earnings.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.periodToggle}>
            {(['today', 'week', 'month'] as const).map((period) => (
              <TouchableOpacity key={period} style={[styles.periodBtn, activePeriod === period && styles.periodBtnActive]} onPress={() => setActivePeriod(period)}>
                <Text style={[styles.periodBtnText, activePeriod === period && styles.periodBtnTextActive]}>{period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.earningsHighlight}>
            <View style={styles.earningsMain}>
              <Text style={styles.earningsCurrency}>R</Text>
              <Text style={styles.earningsAmount}>{activePeriod === 'today' ? earnings.today : activePeriod === 'week' ? weekTotal : earnings.month}</Text>
            </View>
            <Text style={styles.earningsPeriodLabel}>{activePeriod === 'today' ? "Today's Earnings" : activePeriod === 'week' ? 'Weekly Earnings' : 'Monthly Earnings'}</Text>
          </View>

          {earnings.pendingPayout > 0 && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingRow}>
                <View style={styles.pendingInfo}>
                  <Ionicons name="wallet" size={20} color={colors.success} />
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
                    <LinearGradient colors={[colors.brand, colors.brandStrong] as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.barFill, { width: `${Math.max((day.earnings / maxWeekly) * 100, 4)}%` }]}>
                      {day.earnings > 50 && <Text style={styles.barValue}>R{day.earnings.toFixed(0)}</Text>}
                    </LinearGradient>
                  </View>
                  <Text style={styles.barTrips}>{day.trips}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>EARNINGS BREAKDOWN</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Trip Fares</Text>
              <Text style={styles.breakdownValue}>R{breakdown.fares.toFixed(0)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tips</Text>
              <Text style={styles.breakdownValue}>R{breakdown.tips.toFixed(0)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Promotions</Text>
              <Text style={styles.breakdownValue}>R{breakdown.promos.toFixed(0)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Total</Text>
              <Text style={styles.breakdownTotalValue}>R{weekTotal.toFixed(0)}</Text>
            </View>
          </View>

          {recentTrips.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
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
                          <Ionicons name="location" size={8} color={colors.brand} />
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

          {weekTotal === 0 && recentTrips.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cash-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No earnings yet</Text>
              <Text style={styles.emptySubtext}>Complete rides to start earning</Text>
            </View>
          )}

          <TouchableOpacity style={styles.cashOutBtn} activeOpacity={0.8} onPress={() => Alert.alert('Cash Out', 'Payout processing coming soon. Your earnings are safe!')}>
            <LinearGradient colors={[colors.brand, colors.brandStrong] as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cashOutGrad}>
              <Ionicons name="wallet" size={20} color={colors.brandContrast} />
              <Text style={styles.cashOutText}>Cash Out (R{(activePeriod === 'today' ? earnings.today : activePeriod === 'week' ? weekTotal : earnings.month).toFixed(0)})</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
