import React, { useState, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Alert, Linking,
  ScrollView, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  payments, rides, promoCodes, PAYMENT_METHODS, COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS,
} from '@easyryde/shared';
import {
  Typography, GlowButton, GlassCard, GradientText,
} from '@easyryde/shared';
import type { RiderNav, RiderRoute, Ride } from '@easyryde/shared';

const PAYMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash-outline',
  wallet: 'wallet-outline',
  payfast: 'globe-outline',
  ozow: 'swap-horizontal-outline',
  stripe: 'card-outline',
};

export default function PaymentScreen({ route, navigation }: { route: RiderRoute<'Payment'>; navigation: RiderNav }) {
  const { rideId } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [ride, setRide] = useState<Ride | null>(null);
  const [success, setSuccess] = useState(false);
  const [walletBalance] = useState(250.00);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const data = await rides.get(rideId);
        setRide(data);
      } catch {}
    })();
  }, [rideId]);

  useEffect(() => {
    if (success) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 8,
        }),
        Animated.delay(1200),
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        navigation.navigate('Main');
      });
    }
  }, [success]);

  const baseFare = ride?.base_fare ?? 0;
  const distanceFare = ride?.distance_km ? ride.distance_km * (ride.per_km_fare ?? 12) : 0;
  const timeFare = ride?.duration_minutes ? ride.duration_minutes * 2 : 0;
  const serviceFee = (baseFare + distanceFare + timeFare) * 0.05;
  const discount = ride?.discount_amount ?? 0;
  const promoAmount = promoDiscount ?? 0;
  const total = Math.max(0, (baseFare + distanceFare + timeFare + serviceFee) - discount - promoAmount);

  const fareLines = [
    { label: 'Base fare', value: baseFare },
    { label: 'Distance', value: distanceFare },
    { label: 'Time', value: timeFare },
    { label: 'Service fee', value: serviceFee },
  ].filter(f => f.value > 0);

  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await payments.processRide(rideId, selectedMethod);
      if (result.redirect_url) {
        await Linking.openURL(result.redirect_url);
        Alert.alert(
          'Payment Initiated',
          'Complete payment in your browser, then return here.',
          [{ text: 'OK', onPress: () => navigation.navigate('Main') }],
        );
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      Alert.alert('Payment Failed', err.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const result = await promoCodes.validate(promoCode.trim(), total);
      if (result.valid) {
        setPromoDiscount(result.discount);
        setPromoApplied(true);
        Alert.alert('Promo Applied', `You saved R${result.discount.toFixed(2)}!`);
      } else {
        Alert.alert('Invalid Code', 'This promo code is not valid or has expired');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to validate promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  if (success) {
    return (
      <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Animated.View style={[styles.successIcon, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark-circle" size={96} color={COLORS.success} />
        </Animated.View>
        <GradientText
          colors={GRADIENTS.primary}
          style={{ fontSize: 24, fontWeight: '700', marginTop: SPACING.lg }}
        >
          Payment Successful
        </GradientText>
        <Typography variant="body" color={COLORS.textMuted} style={{ marginTop: SPACING.sm }}>
          Thank you for riding with EasyRyde
        </Typography>
      </Animated.View>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.background as unknown as string[]} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <GradientText
            colors={GRADIENTS.primary}
            style={{ fontSize: 22, fontWeight: '700' }}
          >
            Payment
          </GradientText>
          <View style={{ width: 40 }} />
        </View>

        {/* Fare Summary */}
        <GlassCard padding={SPACING.base} style={styles.fareCard}>
          <View style={styles.fareHeader}>
            <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
            <Typography variant="label" color={COLORS.textMuted}>FARE SUMMARY</Typography>
          </View>

          {fareLines.map((f, i) => (
            <View key={i} style={styles.fareRow}>
              <Typography variant="bodySmall" color={COLORS.textSecondary}>{f.label}</Typography>
              <Typography variant="bodySmall" color={COLORS.text}>R {f.value.toFixed(2)}</Typography>
            </View>
          ))}

          {discount > 0 && (
            <View style={styles.fareRow}>
              <Typography variant="bodySmall" color={COLORS.success}>Discount</Typography>
              <Typography variant="bodySmall" color={COLORS.success}>-R {discount.toFixed(2)}</Typography>
            </View>
          )}

          <View style={styles.fareDivider} />

          <View style={styles.fareRow}>
            <Typography variant="h4" color={COLORS.text}>Total</Typography>
            <GradientText
              colors={GRADIENTS.primary}
              style={{ fontSize: 22, fontWeight: '800' }}
            >
              R {total.toFixed(2)}
            </GradientText>
          </View>
        </GlassCard>

        {/* Payment Methods */}
        <View style={styles.sectionHeader}>
          <Ionicons name="card-outline" size={18} color={COLORS.textMuted} />
          <Typography variant="label" color={COLORS.textMuted}>PAYMENT METHOD</Typography>
        </View>

        <View style={styles.methodsList}>
          {PAYMENT_METHODS.map(({ id, name }) => {
            const isSelected = selectedMethod === id;
            return (
              <TouchableOpacity key={id} onPress={() => setSelectedMethod(id)} activeOpacity={0.7}>
                <GlassCard padding={SPACING.md} glow={isSelected} style={[
                  styles.methodCard,
                  isSelected && styles.methodCardSelected,
                ]}>
                  <View style={styles.methodRow}>
                    <View style={[
                      styles.methodIconWrap,
                      isSelected && styles.methodIconWrapActive,
                    ]}>
                      <Ionicons
                        name={PAYMENT_ICONS[id] || 'cash-outline'}
                        size={22}
                        color={isSelected ? COLORS.primary : COLORS.textMuted}
                      />
                    </View>
                    <Typography
                      variant="body"
                      color={isSelected ? COLORS.primary : COLORS.text}
                      style={{ flex: 1, fontWeight: isSelected ? '600' : '400' }}
                    >
                      {name}
                    </Typography>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                    )}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Wallet Balance */}
        {selectedMethod === 'wallet' && (
          <GlassCard padding={SPACING.base} glow style={styles.walletCard}>
            <View style={styles.walletRow}>
              <View style={styles.walletIconWrap}>
                <Ionicons name="wallet" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="small" color={COLORS.textMuted}>WALLET BALANCE</Typography>
                <GradientText
                  colors={GRADIENTS.primary}
                  style={{ fontSize: 24, fontWeight: '800' }}
                >
                  R {walletBalance.toFixed(2)}
                </GradientText>
              </View>
              {walletBalance >= total ? (
                <View style={styles.walletBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Typography variant="small" color={COLORS.success} style={{ marginLeft: 4 }}>
                    Sufficient
                  </Typography>
                </View>
              ) : (
                <View style={[styles.walletBadge, { backgroundColor: 'rgba(220, 38, 38, 0.12)' }]}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Typography variant="small" color={COLORS.error} style={{ marginLeft: 4 }}>
                    Insufficient
                  </Typography>
                </View>
              )}
            </View>
          </GlassCard>
        )}

        {/* Promo Code */}
        <View style={styles.sectionHeader}>
          <Ionicons name="pricetag-outline" size={18} color={COLORS.textMuted} />
          <Typography variant="label" color={COLORS.textMuted}>PROMO CODE</Typography>
        </View>

        <GlassCard padding={SPACING.md} glow={false} style={styles.promoCard}>
          <View style={styles.promoRow}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter promo code"
              placeholderTextColor={COLORS.textDim}
              value={promoCode}
              onChangeText={(text) => {
                setPromoCode(text.toUpperCase());
                if (promoApplied) {
                  setPromoApplied(false);
                  setPromoDiscount(null);
                }
              }}
              editable={!promoApplied}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.promoApplyBtn, promoApplied && styles.promoApplyBtnActive]}
              onPress={handleApplyPromo}
              disabled={promoLoading || promoApplied || !promoCode.trim()}
            >
              <Typography
                variant="small"
                color={promoApplied ? COLORS.bg : COLORS.primary}
                style={{ fontWeight: '600' }}
              >
                {promoLoading ? '...' : promoApplied ? 'Applied' : 'Apply'}
              </Typography>
            </TouchableOpacity>
          </View>
          {promoApplied && promoDiscount !== null && (
            <View style={styles.promoSuccess}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Typography variant="small" color={COLORS.success} style={{ marginLeft: 6 }}>
                -R{promoDiscount.toFixed(2)} discount applied
              </Typography>
            </View>
          )}
        </GlassCard>

        {/* Pay Button */}
        <GlowButton
          title={loading ? 'Processing...' : `Pay R ${total.toFixed(2)}`}
          onPress={handlePay}
          disabled={loading}
          size="lg"
          style={styles.payBtn}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.base, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: SPACING.base,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  fareCard: { marginBottom: SPACING.lg },
  fareHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  fareRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  fareDivider: {
    height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  methodsList: { gap: SPACING.sm, marginBottom: SPACING.lg },
  methodCard: {
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 173, 122, 0.05)',
  },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
  },
  methodIconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  methodIconWrapActive: {
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
  },
  payBtn: { marginTop: SPACING.sm },
  successContainer: {
    flex: 1, backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center',
    padding: SPACING.xl,
  },
  successIcon: { marginBottom: SPACING.base },
  // Wallet
  walletCard: { marginBottom: SPACING.lg },
  walletRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
  },
  walletIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  walletBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  // Promo
  promoCard: { marginBottom: SPACING.lg },
  promoRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  promoInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    letterSpacing: 1,
  },
  promoApplyBtn: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.base,
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  promoApplyBtnActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  promoSuccess: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: SPACING.sm,
  },
});
