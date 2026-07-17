import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, RefreshControl, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { promoCodes, COLORS, SPACING, RADIUS, SHADOWS } from '@easyryde/shared';
import { GlowButton } from '@easyryde/shared';
import type { PromoCode } from '@easyryde/shared';
import type { RiderNav } from '@easyryde/shared';

export default function PromoCodeScreen() {
  const navigation = useNavigation<RiderNav>();
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validatedPromo, setValidatedPromo] = useState<{ valid: boolean; discount: number; promo_code?: PromoCode } | null>(null);
  const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  useEffect(() => { fetchPromos(); }, []);

  async function fetchPromos() {
    try {
      if (!refreshing) setLoading(true);
      setError(null);
      const response = await promoCodes.list({ per_page: '20' });
      setAvailablePromos(response.data.filter(p => p.is_active));
    } catch (err: any) {
      setError(err.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); fetchPromos(); }, []);

  async function handleValidate() {
    if (!code.trim()) { Alert.alert('Enter a code', 'Please enter a promo code to validate.'); return; }
    setValidating(true);
    setValidatedPromo(null);
    try {
      const result = await promoCodes.validate(code.trim().toUpperCase());
      setValidatedPromo(result);
    } catch (err: any) {
      Alert.alert('Validation Failed', err.message || 'Could not validate promo code.');
    } finally {
      setValidating(false);
    }
  }

  function handleApply() {
    if (validatedPromo?.promo_code) {
      setAppliedId(validatedPromo.promo_code.id);
      Alert.alert('Promo Applied', 'This code will be applied to your next ride.');
    }
  }

  async function handleCopyCode(promoCode: string) {
    try {
      await Share.share({ message: promoCode, title: 'EasyRyde Promo Code' });
    } catch {}
  }

  function getDiscountText(promo: PromoCode) {
    if (promo.type === 'percentage') return `${promo.value}% off`;
    return `R ${promo.value.toFixed(0)} off`;
  }

  function getExpiryText(expiresAt?: string) {
    if (!expiresAt) return 'No expiry';
    const exp = new Date(expiresAt);
    const now = new Date();
    if (exp < now) return 'Expired';
    const diff = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
    if (diff <= 1) return 'Expires tomorrow';
    if (diff <= 7) return `Expires in ${diff} days`;
    return `Expires ${exp.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`;
  }

  function renderDiscountDetails() {
    if (!validatedPromo) return null;
    const promo = validatedPromo.promo_code;
    if (!promo) return (
      <View style={styles.validationError}>
        <Ionicons name="close-circle" size={24} color={COLORS.error} />
        <Text style={styles.validationErrorText}>Invalid promo code</Text>
      </View>
    );

    return (
      <View style={styles.discountCard}>
        <View style={styles.discountHeader}>
          <Ionicons name="pricetag" size={20} color={COLORS.success} />
          <Text style={styles.discountTitle}>Valid Code!</Text>
        </View>
        <View style={styles.discountDetail}>
          <Text style={styles.discountLabel}>Discount</Text>
          <Text style={styles.discountValue}>{getDiscountText(promo)}</Text>
        </View>
        <View style={styles.discountDetail}>
          <Text style={styles.discountLabel}>Minimum Fare</Text>
          <Text style={styles.discountValue}>R {promo.min_ride_amount.toFixed(0)}</Text>
        </View>
        {promo.max_discount > 0 && (
          <View style={styles.discountDetail}>
            <Text style={styles.discountLabel}>Max Discount</Text>
            <Text style={styles.discountValue}>R {promo.max_discount.toFixed(0)}</Text>
          </View>
        )}
        <View style={styles.discountDetail}>
          <Text style={styles.discountLabel}>Expires</Text>
          <Text style={styles.discountValue}>{getExpiryText(promo.expires_at)}</Text>
        </View>
        {appliedId === promo.id ? (
          <View style={styles.appliedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.appliedText}>Applied to next ride</Text>
          </View>
        ) : (
          <GlowButton title="Use on Next Ride" onPress={handleApply} size="md" style={{ marginTop: SPACING.md }} />
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Promo Codes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promo Codes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {error ? (
          <View style={styles.errorWrap}>
            <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textDim} />
            <Text style={{ color: COLORS.textMuted, marginTop: SPACING.md }}>{error}</Text>
            <GlowButton title="Retry" onPress={fetchPromos} size="sm" style={{ marginTop: SPACING.base }} />
          </View>
        ) : (
          <>
            {/* Manual Code Entry */}
            <Text style={styles.sectionTitle}>Have a Code?</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="Enter promo code"
                placeholderTextColor={COLORS.textDim}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.validateBtn, validating && styles.validateBtnDisabled]}
                onPress={handleValidate}
                disabled={validating}
              >
                {validating ? (
                  <ActivityIndicator size="small" color={COLORS.text} />
                ) : (
                  <Text style={styles.validateBtnText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>

            {renderDiscountDetails()}

            {/* Available Promotions */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Available Promotions</Text>
            {availablePromos.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="pricetag-outline" size={48} color={COLORS.textDim} />
                <Text style={styles.emptyText}>No active promotions right now</Text>
                <Text style={styles.emptySubtext}>Check back later for deals!</Text>
              </View>
            ) : (
              availablePromos.map((promo) => (
                <View key={promo.id} style={styles.promoCard}>
                  <View style={styles.promoLeft}>
                    <View style={styles.promoBadge}>
                      <Text style={styles.promoBadgeText}>{getDiscountText(promo)}</Text>
                    </View>
                  </View>
                  <View style={styles.promoInfo}>
                    <Text style={styles.promoCode}>{promo.code}</Text>
                    <Text style={styles.promoExpiry}>{getExpiryText(promo.expires_at)}</Text>
                    <Text style={styles.promoMin}>Min fare: R {promo.min_ride_amount.toFixed(0)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => handleCopyCode(promo.code)}
                  >
                    <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.copyBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingTop: SPACING.lg + 40, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  content: { padding: SPACING.base, paddingBottom: 40 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: {
    color: COLORS.textMuted, fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.md,
  },

  inputRow: { flexDirection: 'row', gap: SPACING.sm },
  codeInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
    fontSize: 16, fontWeight: '600', color: COLORS.text,
    letterSpacing: 1,
  },
  validateBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, justifyContent: 'center', alignItems: 'center',
  },
  validateBtnDisabled: { opacity: 0.6 },
  validateBtnText: { color: COLORS.bg, fontSize: 15, fontWeight: '700' },

  discountCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: COLORS.success, padding: SPACING.md, marginTop: SPACING.md,
    ...SHADOWS.moderate,
  },
  discountHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  discountTitle: { color: COLORS.success, fontSize: 16, fontWeight: '700' },
  discountDetail: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  discountLabel: { color: COLORS.textMuted, fontSize: 13 },
  discountValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },

  validationError: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.md, marginTop: SPACING.md,
    backgroundColor: COLORS.errorGlow, borderRadius: RADIUS.md,
  },
  validationErrorText: { color: COLORS.error, fontSize: 14, fontWeight: '500' },

  appliedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  appliedText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },

  promoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  promoLeft: { marginRight: SPACING.md },
  promoBadge: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2,
  },
  promoBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  promoInfo: { flex: 1 },
  promoCode: { color: COLORS.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  promoExpiry: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  promoMin: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  copyBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
  emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginTop: SPACING.md },
  emptySubtext: { color: COLORS.textDim, fontSize: 13, marginTop: SPACING.xs },

  errorWrap: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
});
