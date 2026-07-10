import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Alert, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { foodDelivery } from '@easyryde/shared';
import type { FoodOrder, DriverRoute, DriverNav } from '@easyryde/shared';

const TRANSITIONS: Record<string, string[]> = {
  confirmed: ['preparing'],
  preparing: ['ready'],
  ready: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  pending: ['confirmed', 'cancelled'],
};

const ACTIONS: Record<string, string> = {
  confirmed: 'Start Preparing',
  preparing: 'Mark as Ready',
  ready: 'Mark as Picked Up',
  picked_up: 'Start Delivery',
  in_transit: 'Mark as Delivered',
};

export default function FoodOrderDetailScreen({ route }: { route: DriverRoute<'FoodOrderDetail'> }) {
  const navigation = useNavigation<DriverNav>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<FoodOrder | null>(null);

  const loadOrder = useCallback(async () => {
    try { setOrder(await foodDelivery.getOrder(orderId)); } catch (err: any) { console.warn('Polling failed', err?.message); }
  }, [orderId]);

  useEffect(() => { loadOrder(); const interval = setInterval(loadOrder, 10000); return () => clearInterval(interval); }, [loadOrder]);

  const updateStatus = async (newStatus: string) => {
    try { await foodDelivery.updateOrderStatus(orderId, newStatus); loadOrder(); } catch (err: any) { Alert.alert('Error', err.message || 'Failed'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#16a34a';
      case 'cancelled': return '#dc2626';
      case 'pending': return '#FFAD7A';
      default: return '#3b82f6';
    }
  };

  if (!order) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    </SafeAreaView>
  );

  const nextStatus = (TRANSITIONS[order.status] || [])[0];
  const canUpdate = !!nextStatus;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.restaurantName}>{order.restaurant?.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
                {item.special_instructions && (
                  <Text style={styles.itemNote}>Note: {item.special_instructions}</Text>
                )}
              </View>
              <Text style={styles.itemPrice}>R {item.line_total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <Text style={styles.deliveryAddress}>{order.delivery_address}</Text>
          {order.delivery_notes && <Text style={styles.deliveryNotes}>{order.delivery_notes}</Text>}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R {order.total_amount.toFixed(2)}</Text>
          </View>
          <Text style={styles.paymentMethod}>{order.payment_method}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.customerName}>{order.customer?.name || 'Unknown'}</Text>
          <Text style={styles.customerPhone}>{order.customer?.phone_number || 'N/A'}</Text>
        </View>

        {canUpdate && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Alert.alert('Update Status', `${ACTIONS[order.status]}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: ACTIONS[order.status] || nextStatus, onPress: () => updateStatus(nextStatus) },
              ]);
            }}
          >
            <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.actionBtnGradient}>
              <Text style={styles.actionBtnText}>{ACTIONS[order.status] || `Move to ${nextStatus}`}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {order.status === 'delivered' && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Back to Orders</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1e' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#98989d' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  restaurantName: { fontSize: 24, fontWeight: '800', color: '#fff', flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },

  section: {
    backgroundColor: '#242426', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#3a3a3c',
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#98989d', letterSpacing: 1, marginBottom: 12 },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, color: '#fff' },
  itemNote: { fontSize: 12, color: '#98989d', fontStyle: 'italic', marginTop: 2 },
  itemPrice: { fontSize: 15, color: '#fff' },

  deliveryAddress: { fontSize: 15, color: '#fff', marginBottom: 4 },
  deliveryNotes: { fontSize: 13, color: '#98989d', marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#3a3a3c' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#16a34a' },
  paymentMethod: { fontSize: 12, color: '#98989d', marginTop: 4 },

  customerName: { fontSize: 15, color: '#fff' },
  customerPhone: { fontSize: 13, color: '#98989d', marginTop: 2 },

  actionBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  actionBtnGradient: { padding: 16, alignItems: 'center' },
  actionBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },

  backBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#98989d' },
});
