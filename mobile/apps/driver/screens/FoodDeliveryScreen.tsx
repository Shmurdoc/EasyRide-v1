import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, FlatList, Alert, Text, SafeAreaView, RefreshControl, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { foodDelivery, COLORS, SPACING, RADIUS, GRADIENTS, SHADOWS } from '@easyryde/shared';
import type { FoodOrder, DriverNav } from '@easyryde/shared';

export default function FoodDeliveryScreen({ navigation }: { navigation: DriverNav }) {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('available');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => { try { setLoadError(null); const data = filter === 'available' ? await foodDelivery.availableOrders() : await foodDelivery.driverOrders(); setOrders(data); } catch (err: any) { setLoadError(err?.message || 'Failed to load orders'); } finally { if (loading) setLoading(false); setRefreshing(false); } }, [filter]);
  useEffect(() => { loadOrders(); const interval = setInterval(loadOrders, 15000); return () => clearInterval(interval); }, [loadOrders]);
  const filteredOrders = orders.filter((o) => { if (filter === 'available') return o.status === 'pending' && !o.driver_id; if (filter === 'active') return !['delivered', 'cancelled'].includes(o.status); return o.status === 'delivered'; });
  const getStatusColor = (status: string) => { switch (status) { case 'delivered': return COLORS.primary; case 'cancelled': return COLORS.red; case 'pending': return COLORS.amber; default: return COLORS.blue; } };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={GRADIENTS.primary} style={styles.headerGradient}>
        <View style={styles.headerRow}><Text style={styles.headerTitle}>Food Delivery</Text><Ionicons name="restaurant" size={24} color="rgba(255,255,255,0.6)" /></View>
      </LinearGradient>
      <View style={styles.tabBar}>
        {['available', 'active', 'delivered'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, filter === tab && styles.tabActive]} onPress={() => setFilter(tab)}>
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loadError && !refreshing ? (
        <View style={styles.errorContainer}><Text style={styles.errorText}>{loadError}</Text><TouchableOpacity style={styles.retryBtn} onPress={() => { setRefreshing(true); loadOrders(); }}><Text style={styles.retryBtnText}>Retry</Text></TouchableOpacity></View>
      ) : (
        <FlatList data={filteredOrders} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={loading ? null : <View style={styles.emptyContainer}><Ionicons name="restaurant-outline" size={48} color={COLORS.textDim} /><Text style={styles.emptyText}>No orders</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => { if (item.driver_id) navigation.navigate('FoodOrderDetail', { orderId: item.id }); }}>
              <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.restaurantName}>{item.restaurant?.name || 'Restaurant'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}><View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} /><Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text></View>
                </View>
                <View style={styles.orderItems}>
                  {item.items?.slice(0, 3).map((i) => <Text key={i.id} style={styles.orderItem}>{i.quantity}x {i.name}</Text>)}
                  {(item.items?.length || 0) > 3 && <Text style={styles.orderItemMore}>+{item.items!.length - 3} more</Text>}
                </View>
                <View style={styles.orderFooter}>
                  <Text style={styles.orderPrice}>R {item.total_amount.toFixed(2)}</Text>
                  <Text style={styles.orderAddress} numberOfLines={1}>{item.delivery_address}</Text>
                </View>
                {filter === 'available' && (
                  <TouchableOpacity style={styles.acceptBtn} onPress={async () => { try { setAcceptingId(item.id); await foodDelivery.acceptOrder(item.id); navigation.navigate('FoodOrderDetail', { orderId: item.id }); } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to accept'); } finally { setAcceptingId(null); } }} disabled={acceptingId === item.id}>
                    <LinearGradient colors={GRADIENTS.primary} style={styles.acceptBtnGradient}><Text style={styles.acceptBtnText}>{acceptingId === item.id ? 'Accepting...' : 'Accept Order'}</Text></LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerGradient: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 26, color: '#fff' },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: COLORS.line, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.primary, ...SHADOWS.glowSuccess },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: COLORS.muted },
  tabTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 100 },
  orderCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.line, ...SHADOWS.subtle },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  restaurantName: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: COLORS.ink },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  orderItems: { marginBottom: 12 },
  orderItem: { fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.muted, marginBottom: 2 },
  orderItemMore: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textDim, marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderPrice: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: COLORS.primary },
  orderAddress: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.muted, flex: 1, textAlign: 'right', marginLeft: 12 },
  acceptBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  acceptBtnGradient: { padding: 12, alignItems: 'center' },
  acceptBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: COLORS.muted, marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: COLORS.ink, marginTop: 16 },
});
