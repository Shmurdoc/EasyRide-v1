import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { foodDelivery, COLORS, GRADIENTS, SPACING } from '@easyryde/shared';
import { Typography, GlowButton, GlassCard, GradientText, ProgressBar, RideStatusBadge, LoadingOverlay } from '@easyryde/shared';
import type { FoodOrder, RiderNav, RiderRoute } from '@easyryde/shared';

const STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];
const LABELS: Record<string, string> = { pending: 'Order Placed', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready for Pickup', picked_up: 'Picked Up', in_transit: 'On the Way', delivered: 'Delivered', cancelled: 'Cancelled' };
const COLORS_MAP: Record<string, string> = { pending: COLORS.warning, confirmed: COLORS.info, preparing: '#8B5CF6', ready: COLORS.success, picked_up: '#6366F1', in_transit: COLORS.primary, delivered: COLORS.success, cancelled: COLORS.error };

export default function FoodOrderTrackingScreen({ route, navigation }: { route: RiderRoute<'FoodOrderTracking'>; navigation: RiderNav }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<FoodOrder | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const loadOrder = useCallback(async () => { try { setOrder(await foodDelivery.getOrder(orderId)); } catch (err: any) { console.warn('Polling order failed', err?.message); } }, [orderId]);

  useEffect(() => { loadOrder(); const interval = setInterval(loadOrder, 10000); return () => clearInterval(interval); }, [loadOrder]);

  useEffect(() => { if (order) { const idx = STEPS.indexOf(order.status); setCurrentStep(idx >= 0 ? idx : 0); } }, [order]);

  const cancelOrder = () => {
    Alert.alert('Cancel Order', 'Are you sure?', [{ text: 'No', style: 'cancel' }, { text: 'Yes, Cancel', style: 'destructive', onPress: async () => { try { await foodDelivery.cancelOrder(orderId); loadOrder(); } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to cancel order'); } } }]);
  };

  if (!order) return <LoadingOverlay />;

  const isCancelled = order.status === 'cancelled';
  const progress = isCancelled ? 0 : ((currentStep + 1) / STEPS.length) * 100;

  return (
    <LinearGradient colors={GRADIENTS.background as unknown as string[]} style={{ flex: 1, padding: SPACING.base }}>
      <GradientText colors={GRADIENTS.primary} style={{ fontSize: 26, fontWeight: '700', marginBottom: SPACING.base }}>
        Order Tracking
      </GradientText>

      <GlassCard padding={SPACING.base} style={{ marginBottom: SPACING.base }}>
        <Typography variant="body" color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }}>{order.restaurant?.name || 'Restaurant'}</Typography>
        <RideStatusBadge status={order.status} style={{ marginBottom: SPACING.md }} />
        {!isCancelled && <ProgressBar progress={progress} />}
      </GlassCard>

      <GlassCard padding={SPACING.base} style={{ marginBottom: SPACING.base }}>
        {STEPS.map((step, i) => {
          const isCompleted = i <= currentStep && !isCancelled;
          const isCurrent = i === currentStep && !isCancelled;
          return (
            <View key={step} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm }}>
              <LinearGradient
                colors={isCompleted ? [COLORS_MAP[step], COLORS_MAP[step]] : [COLORS.surfaceLight, COLORS.surfaceLight]}
                style={{ width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
              >
                {isCompleted && <Typography variant="xs" color={COLORS.bg}>✓</Typography>}
              </LinearGradient>
              <Typography variant="body" color={isCurrent ? COLORS_MAP[step] : isCompleted ? COLORS.text : COLORS.textMuted} style={{ marginLeft: SPACING.md, fontWeight: isCurrent ? '600' : '400' }}>
                {LABELS[step]}
              </Typography>
            </View>
          );
        })}
      </GlassCard>

      <GlassCard padding={SPACING.base} glow style={{ marginBottom: SPACING.base }}>
        <Typography variant="body">{order.delivery_address}</Typography>
        <GradientText colors={GRADIENTS.primary} style={{ fontSize: 18, fontWeight: '700', marginTop: SPACING.sm }}>
          R {order.total_amount.toFixed(2)}
        </GradientText>
        <Typography variant="xs" color={COLORS.textMuted}>{order.payment_method}</Typography>
      </GlassCard>

      {['pending', 'confirmed'].includes(order.status) && (
        <GlowButton title="Cancel Order" onPress={cancelOrder} glowColor={COLORS.error} />
      )}
    </LinearGradient>
  );
}
