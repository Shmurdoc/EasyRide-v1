import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { foodDelivery, wallet, COLORS, GRADIENTS, SPACING, PAYMENT_METHODS } from '@easyryde/shared';
import { Typography, GlowButton, GlassCard, GradientText, Input, Badge } from '@easyryde/shared';
import type { CartItem, RiderNav, RiderRoute } from '@easyryde/shared';

export default function FoodCheckoutScreen({ route, navigation }: { route: RiderRoute<'FoodCheckout'>; navigation: RiderNav }) {
  const { restaurantId, restaurantName, cart, subtotal, deliveryFee } = route.params;
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [tip, setTip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    wallet.get().then(w => setWalletBalance(w.balance)).catch(() => { console.warn('Failed to fetch wallet balance'); }).finally(() => setWalletLoading(false));
  }, []);

  const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + deliveryFee + serviceFee + tip;
  const tipOptions = [0, 10, 20, 30];

  async function placeOrder() {
    if (!deliveryAddress.trim()) { Alert.alert('Missing Address', 'Please enter a delivery address'); return; }
    if (paymentMethod === 'wallet' && !walletLoading && walletBalance < total) { Alert.alert('Insufficient Balance', `Your wallet balance (R${walletBalance.toFixed(2)}) is less than the total (R${total.toFixed(2)}).`); return; }
    setLoading(true);
    try {
      const order = await foodDelivery.createOrder(restaurantId, {
        items: cart.map((item: CartItem) => ({ menu_item_id: item.menuItem.id, quantity: item.quantity, special_instructions: item.specialInstructions })),
        delivery_address: deliveryAddress, delivery_notes: deliveryNotes || undefined,
        payment_method: paymentMethod, tip_amount: tip,
      });
      navigation.navigate('FoodOrderTracking', { orderId: order.id });
    } catch (err: any) { Alert.alert('Error', err.message || 'Failed to place order');
    } finally { setLoading(false); }
  }

  return (
    <LinearGradient colors={GRADIENTS.background as unknown as string[]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.base }}>
        <GradientText colors={GRADIENTS.primary} style={{ fontSize: 26, fontWeight: '700', marginBottom: SPACING.xs }}>
          Checkout
        </GradientText>
        <Typography variant="body" color={COLORS.textMuted} style={{ marginBottom: SPACING.base }}>{restaurantName}</Typography>

        <GlassCard padding={SPACING.base} style={{ marginBottom: SPACING.base }}>
          <Typography variant="h3" style={{ marginBottom: SPACING.md }}>Order Summary</Typography>
          {cart.map((item: CartItem) => (
            <View key={item.menuItem.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs }}>
              <Typography variant="body">{item.quantity}x {item.menuItem.name}</Typography>
              <GradientText colors={GRADIENTS.primary} style={{ fontSize: 16, fontWeight: '500' }}>
                R {(item.menuItem.price * item.quantity).toFixed(2)}
              </GradientText>
            </View>
          ))}
        </GlassCard>

        <GlassCard padding={SPACING.base} style={{ marginBottom: SPACING.base }}>
          <Typography variant="h3" style={{ marginBottom: SPACING.md }}>Delivery Address</Typography>
          <Input value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Enter your delivery address" multiline />
          <Input value={deliveryNotes} onChangeText={setDeliveryNotes} placeholder="Delivery notes (optional)" style={{ marginTop: SPACING.md }} />
        </GlassCard>

        <GlassCard padding={SPACING.base} style={{ marginBottom: SPACING.base }}>
          <Typography variant="h3" style={{ marginBottom: SPACING.md }}>Payment Method</Typography>
          {PAYMENT_METHODS.map(({ id, name }) => (
            <TouchableOpacity key={id} onPress={() => setPaymentMethod(id)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm }}>
                {paymentMethod === id && (
                  <LinearGradient colors={GRADIENTS.primary as unknown as string[]} style={{ width: 4, height: 20, borderRadius: 2, marginRight: SPACING.sm }} />
                )}
                <Typography variant="body" color={paymentMethod === id ? COLORS.primary : COLORS.text} style={{ fontWeight: paymentMethod === id ? '600' : '400', marginLeft: paymentMethod === id ? 0 : SPACING.lg }}>
                  {name}
                </Typography>
              </View>
            </TouchableOpacity>
          ))}
        </GlassCard>

        <GlassCard padding={SPACING.base} style={{ marginBottom: SPACING.base }}>
          <Typography variant="h3" style={{ marginBottom: SPACING.md }}>Tip</Typography>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {tipOptions.map((t) => (
              <TouchableOpacity key={t} onPress={() => setTip(t)} style={{ flex: 1 }}>
                <Badge label={t === 0 ? 'No Tip' : `R${t}`} variant={tip === t ? 'info' : 'default'} />
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <GlassCard padding={SPACING.base} glow style={{ marginBottom: SPACING.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Typography variant="body" color={COLORS.textMuted}>Subtotal</Typography><Typography variant="body">R {subtotal.toFixed(2)}</Typography></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs }}><Typography variant="body" color={COLORS.textMuted}>Delivery</Typography><Typography variant="body">R {deliveryFee.toFixed(2)}</Typography></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs }}><Typography variant="body" color={COLORS.textMuted}>Service</Typography><Typography variant="body">R {serviceFee.toFixed(2)}</Typography></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs }}><Typography variant="body" color={COLORS.textMuted}>Tip</Typography><Typography variant="body">R {tip.toFixed(2)}</Typography></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.glassBorder, paddingTop: SPACING.md }}>
            <Typography variant="h3">Total</Typography>
            <GradientText colors={GRADIENTS.primary} style={{ fontSize: 20, fontWeight: '800' }}>
              R {total.toFixed(2)}
            </GradientText>
          </View>
        </GlassCard>

        <GlowButton title={loading ? 'Placing Order...' : 'Place Order'} onPress={placeOrder} disabled={loading} size="lg" />
      </ScrollView>
    </LinearGradient>
  );
}
