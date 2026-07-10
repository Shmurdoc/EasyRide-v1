import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth, wallet, COLORS, SPACING, RADIUS, SHADOWS } from '@easyryde/shared';
import { GlowButton } from '@easyryde/shared';
import type { RiderNav } from '@easyryde/shared';

const PAYMENT_METHODS = [
  { id: 'wallet', name: 'Wallet Balance', icon: 'wallet-outline', detail: 'R 0.00' },
  { id: 'visa', name: 'Visa •••• 4242', icon: 'card-outline', detail: 'Default' },
  { id: 'ozow', name: 'Ozow EFT', icon: 'swap-horizontal-outline', detail: 'Linked' },
] as const;

const QUICK_AMOUNTS = [50, 100, 200, 500];

export default function WalletScreen() {
  const navigation = useNavigation<RiderNav>();
  const [walletData, setWalletData] = useState<{ balance: number; pending_balance: number; currency: string } | null>(null);
  const [transactions, setTransactions] = useState<Array<{ id: string; type: string; amount: number; description: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  async function fetchWalletData() {
    try {
      if (!refreshing) setLoading(true);
      setError(null);
      const walletResponse = await wallet.get();
      setWalletData(walletResponse);
      const transactionsResponse = await wallet.transactions({ per_page: '10' });
      setTransactions(transactionsResponse.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); fetchWalletData(); }, []);

  async function handleDeposit() {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 10) { Alert.alert('Invalid amount', 'Minimum deposit is R10'); return; }
    if (amount > 50000) { Alert.alert('Invalid amount', 'Maximum deposit is R50,000'); return; }
    setDepositing(true);
    try {
      const result = await wallet.deposit(amount, 'stripe');
      setShowDepositModal(false);
      setDepositAmount('');
      Alert.alert(
        'Deposit Initiated',
        result.client_secret
          ? 'Please complete payment with your card to confirm.'
          : `Deposit of R${amount.toFixed(2)} has been initiated.`,
      );
      fetchWalletData();
    } catch (err: any) {
      Alert.alert('Deposit Failed', err.message || 'Could not process deposit');
    } finally {
      setDepositing(false);
    }
  }

  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}R ${Math.abs(amount).toFixed(2)}`;
  };

  const getTransactionIcon = (type: string) => {
    const creditTypes = ['deposit', 'refund', 'topup', 'credit'];
    return creditTypes.some(t => type.toLowerCase().includes(t)) ? 'credit' : 'debit';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.base }}>
          <Text style={{ color: COLORS.error, marginBottom: SPACING.md }}>{error}</Text>
          <GlowButton title="Retry" onPress={fetchWalletData} size="sm" />
        </View>
      </View>
    );
  }

  const balance = walletData?.balance ?? 0;
  const paymentMethods = PAYMENT_METHODS.map(m => m.id === 'wallet' ? { ...m, detail: `R ${balance.toFixed(2)}` } : m);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>R {balance.toFixed(2)}</Text>
          <Text style={styles.balanceSub}>Available for rides and deliveries</Text>
          <View style={styles.balanceActions}>
            <GlowButton
              title="Add Funds"
              onPress={() => setShowDepositModal(true)}
              size="sm"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payment Methods</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity key={method.id} style={styles.methodRow}>
            <View style={styles.methodIcon}>
              <Ionicons name={method.icon as any} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>{method.name}</Text>
              <Text style={styles.methodDetail}>{method.detail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <Text style={{ color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.base }}>
            No transactions yet
          </Text>
        ) : (
          transactions.map((tx) => {
            const txType = getTransactionIcon(tx.type);
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, txType === 'credit' && styles.txIconCredit]}>
                  <Ionicons
                    name={txType === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={txType === 'credit' ? COLORS.success : COLORS.textMuted}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel}>{tx.description}</Text>
                  <Text style={styles.txTime}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.txAmount, txType === 'credit' && styles.txAmountCredit]}>
                  {formatAmount(tx.amount)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showDepositModal} transparent animationType="slide" onRequestClose={() => setShowDepositModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowDepositModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Funds</Text>
            <Text style={styles.modalSubtitle}>Enter amount to deposit to your wallet</Text>

            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={depositAmount}
              onChangeText={setDepositAmount}
            />

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickAmountBtn, depositAmount === String(amt) && styles.quickAmountBtnActive]}
                  onPress={() => setDepositAmount(String(amt))}
                >
                  <Text style={[styles.quickAmountText, depositAmount === String(amt) && styles.quickAmountTextActive]}>
                    R{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <GlowButton
              title={depositing ? 'Processing...' : `Deposit R${parseFloat(depositAmount || '0').toFixed(2)}`}
              onPress={handleDeposit}
              disabled={!depositAmount || depositing}
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.lg + 40,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.moderate,
  },
  balanceLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  balanceSub: {
    color: COLORS.textDim,
    fontSize: 13,
    marginBottom: SPACING.lg,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  methodDetail: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  txIconCredit: {
    backgroundColor: COLORS.successGlow,
  },
  txInfo: {
    flex: 1,
  },
  txLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  txTime: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  txAmountCredit: {
    color: COLORS.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  modalClose: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  amountInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  quickAmountBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  quickAmountText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  quickAmountTextActive: {
    color: COLORS.primary,
  },
});
