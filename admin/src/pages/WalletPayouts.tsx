import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

/* ── Types ── */

interface WalletOverview {
  total_platform_balance: number;
  pending_payouts: number;
  completed_this_month: number;
  drivers_with_pending: number;
}

interface DriverUser {
  id: string;
  name: string;
  email: string;
}

interface DriverWallet {
  id: string;
  user: DriverUser;
  balance: number;
  currency: string;
  total_earned: number;
  total_withdrawn: number;
  last_transaction: { type: string; amount: number; created_at: string } | null;
}

interface Payout {
  id: string;
  driver: DriverUser;
  amount: number;
  status: string;
  bank_name?: string;
  account_last_four?: string;
  requested_at: string;
  processed_at?: string;
  notes?: string;
}

interface WalletTransaction {
  id: string;
  wallet: { user: DriverUser };
  type: string;
  amount: number;
  status: string;
  reference?: string;
  created_at: string;
}

interface CashPayment {
  id: string;
  payer: DriverUser;
  amount: number;
  cash_received: number;
  cash_discrepancy: number;
  cash_reconciled: boolean;
  created_at: string;
}

interface CashReconciliationSummary {
  total_cash_received: number;
  total_discrepancy: number;
  reconciled_count: number;
  unreconciled_count: number;
}

/* ── Helpers ── */

function formatZar(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    reconciled: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function typeBadge(type: string) {
  const styles: Record<string, string> = {
    earning: 'bg-green-50 text-green-700',
    deposit: 'bg-blue-50 text-blue-700',
    withdrawal: 'bg-orange-50 text-orange-700',
    refund: 'bg-purple-50 text-purple-700',
    bonus: 'bg-yellow-50 text-yellow-700',
    commission: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[type] || 'bg-gray-50 text-gray-600'}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

/* ── Stats Cards ── */

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

/* ── Tabs ── */

const TABS = ['Driver Wallets', 'Payout Queue', 'Transaction History', 'Cash Reconciliation'] as const;
type Tab = (typeof TABS)[number];

/* ── Main Component ── */

export default function WalletPayouts() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('Driver Wallets');
  const [page, setPage] = useState(1);
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  /* ── Filters ── */
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [txFromDate, setTxFromDate] = useState('');
  const [txToDate, setTxToDate] = useState('');
  const [txType, setTxType] = useState('');
  const [cashFrom, setCashFrom] = useState('');
  const [cashTo, setCashTo] = useState('');

  /* ── Data: Stats ── */
  const { data: stats } = useQuery<WalletOverview>({
    queryKey: ['wallet-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/wallets/stats');
      return data;
    },
  });

  /* ── Data: Driver Wallets ── */
  const { data: walletsData, isLoading: walletsLoading } = useQuery({
    queryKey: ['driver-wallets', page, minBalance, maxBalance],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (minBalance) params.min_balance = minBalance;
      if (maxBalance) params.max_balance = maxBalance;
      const { data } = await api.get('/admin/wallets', { params: { ...params, per_page: String(params.per_page) } });
      return data;
    },
  });

  /* ── Data: Expanded Wallet Transactions ── */
  const { data: walletTxData, isLoading: walletTxLoading } = useQuery({
    queryKey: ['wallet-transactions', expandedWallet],
    queryFn: async () => {
      if (!expandedWallet) return null;
      const { data } = await api.get(`/admin/wallets/${expandedWallet}/transactions`);
      return data;
    },
    enabled: !!expandedWallet,
  });

  /* ── Data: Payout Queue ── */
  const { data: payoutData, isLoading: payoutLoading } = useQuery({
    queryKey: ['payout-queue', page],
    queryFn: async () => {
      const { data } = await api.get('/admin/wallets/payout-queue', { params: { page, per_page: '15' } });
      return data;
    },
    enabled: activeTab === 'Payout Queue',
  });

  /* ── Data: Transaction History ── */
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transaction-history', page, txFromDate, txToDate, txType],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (txFromDate) params.from_date = txFromDate;
      if (txToDate) params.to_date = txToDate;
      if (txType) params.type = txType;
      const { data } = await api.get('/admin/wallets/transactions', { params });
      return data;
    },
    enabled: activeTab === 'Transaction History',
  });

  /* ── Data: Cash Reconciliation ── */
  const { data: cashData, isLoading: cashLoading } = useQuery({
    queryKey: ['cash-reconciliation', page, cashFrom, cashTo],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (cashFrom) params.from = cashFrom;
      if (cashTo) params.to = cashTo;
      const { data } = await api.get('/admin/wallets/cash-reconciliation', { params });
      return data;
    },
    enabled: activeTab === 'Cash Reconciliation',
  });

  /* ── Mutations ── */
  const approvePayout = useMutation({
    mutationFn: async (id: string) => { await api.post(`/admin/wallets/payouts/${id}/approve`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-queue'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
    },
  });

  const rejectPayout = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.post(`/admin/wallets/payouts/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-queue'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
      setRejectModal(null);
      setRejectReason('');
    },
  });

  const processPayout = useMutation({
    mutationFn: async (id: string) => { await api.post(`/admin/wallets/payouts/${id}/process`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-queue'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
    },
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post('/admin/wallets/payouts/bulk-approve', { payout_ids: ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-queue'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-stats'] });
      setSelectedPayouts(new Set());
    },
  });

  const reconcilePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      await api.post(`/admin/wallets/cash-reconciliation/${paymentId}/reconcile`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-reconciliation'] });
    },
  });

  /* ── Reset page on tab/filter change ── */
  useEffect(() => {
    setPage(1);
  }, [activeTab, minBalance, maxBalance, txFromDate, txToDate, txType, cashFrom, cashTo]);

  /* ── CSV Export ── */
  function exportCsv(transactions: WalletTransaction[]) {
    const headers = ['Date', 'Driver', 'Type', 'Amount', 'Status', 'Reference'];
    const rows = transactions.map((tx) => [
      tx.created_at,
      tx.wallet?.user?.name || '-',
      tx.type,
      String(tx.amount),
      tx.status,
      tx.reference || '-',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Pagination helper ── */
  function Pagination({ total }: { total: number }) {
    const totalPages = Math.ceil(total / 15);
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} of {total}</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="px-3 py-1">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  /* ── Tab: Driver Wallets ── */
  function DriverWalletsTab() {
    const wallets: DriverWallet[] = walletsData?.data || [];
    return (
      <div>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Min Balance</label>
            <input
              type="number"
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Max Balance</label>
            <input
              type="number"
              value={maxBalance}
              onChange={(e) => setMaxBalance(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {walletsLoading ? (
          <div className="text-center py-12 text-gray-500">Loading wallets...</div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No driver wallets found.</div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Driver</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Balance</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Total Earned</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Total Withdrawn</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Last Transaction</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {wallets.map((w) => (
                  <>
                    <tr
                      key={w.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedWallet(expandedWallet === w.id ? null : w.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{w.user?.name || '-'}</div>
                        <div className="text-xs text-gray-400">{w.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatZar(w.balance)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatZar(w.total_earned)}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{formatZar(w.total_withdrawn)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {w.last_transaction ? `${w.last_transaction.type} · ${formatDate(w.last_transaction.created_at)}` : 'No transactions'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {expandedWallet === w.id ? '▼' : '▶'}
                      </td>
                    </tr>
                    {expandedWallet === w.id && (
                      <tr key={`${w.id}-expanded`}>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          {walletTxLoading ? (
                            <div className="text-sm text-gray-400 py-2">Loading transactions...</div>
                          ) : walletTxData?.data?.length ? (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400">
                                  <th className="text-left py-1">Date</th>
                                  <th className="text-left py-1">Type</th>
                                  <th className="text-right py-1">Amount</th>
                                  <th className="text-left py-1">Reference</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {walletTxData.data.map((tx: WalletTransaction) => (
                                  <tr key={tx.id}>
                                    <td className="py-1.5">{formatDate(tx.created_at)}</td>
                                    <td className="py-1.5">{typeBadge(tx.type)}</td>
                                    <td className={`py-1.5 text-right font-medium ${tx.type === 'withdrawal' || tx.type === 'commission' ? 'text-red-600' : 'text-green-600'}`}>
                                      {tx.type === 'withdrawal' || tx.type === 'commission' ? '-' : '+'}{formatZar(tx.amount)}
                                    </td>
                                    <td className="py-1.5 text-gray-400">{tx.reference || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-sm text-gray-400">No transactions for this wallet.</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {walletsData?.total && <Pagination total={walletsData.total} />}
      </div>
    );
  }

  /* ── Tab: Payout Queue ── */
  function PayoutQueueTab() {
    const payouts: Payout[] = payoutData?.data || [];

    function toggleSelectAll() {
      if (selectedPayouts.size === payouts.length) {
        setSelectedPayouts(new Set());
      } else {
        setSelectedPayouts(new Set(payouts.map((p) => p.id)));
      }
    }

    function toggleSelect(id: string) {
      const next = new Set(selectedPayouts);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedPayouts(next);
    }

    return (
      <div>
        {selectedPayouts.size > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-gray-500">{selectedPayouts.size} selected</span>
            <button
              onClick={() => bulkApprove.mutate(Array.from(selectedPayouts))}
              disabled={bulkApprove.isPending}
              className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {bulkApprove.isPending ? 'Approving...' : 'Bulk Approve'}
            </button>
          </div>
        )}

        {payoutLoading ? (
          <div className="text-center py-12 text-gray-500">Loading payout queue...</div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No pending payouts.</div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedPayouts.size === payouts.length && payouts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Driver</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Bank Details</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Requested</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPayouts.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.driver?.name || '-'}</div>
                      <div className="text-xs text-gray-400">{p.driver?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatZar(p.amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.bank_name || '-'} ··· {p.account_last_four || '----'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(p.requested_at)}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => approvePayout.mutate(p.id)}
                            disabled={approvePayout.isPending}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectModal(p.id); setRejectReason(''); }}
                            className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {(p.status === 'pending' || p.status === 'approved') && (
                        <button
                          onClick={() => processPayout.mutate(p.id)}
                          disabled={processPayout.isPending}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 ml-2"
                        >
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {payoutData?.total && <Pagination total={payoutData.total} />}
      </div>
    );
  }

  /* ── Tab: Transaction History ── */
  function TransactionHistoryTab() {
    const transactions: WalletTransaction[] = txData?.data || [];
    return (
      <div>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={txFromDate}
              onChange={(e) => setTxFromDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={txToDate}
              onChange={(e) => setTxToDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="earning">Earning</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="refund">Refund</option>
              <option value="bonus">Bonus</option>
              <option value="commission">Commission</option>
            </select>
          </div>
          <button
            onClick={() => exportCsv(transactions)}
            className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>

        {txLoading ? (
          <div className="text-center py-12 text-gray-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No transactions found.</div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Driver</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(tx.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{tx.wallet?.user?.name || '-'}</td>
                    <td className="px-4 py-3">{typeBadge(tx.type)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${tx.type === 'withdrawal' || tx.type === 'commission' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.type === 'withdrawal' || tx.type === 'commission' ? '-' : '+'}{formatZar(tx.amount)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(tx.status || 'completed')}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{tx.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {txData?.total && <Pagination total={txData.total} />}
      </div>
    );
  }

  /* ── Tab: Cash Reconciliation ── */
  function CashReconciliationTab() {
    const summary: CashReconciliationSummary | undefined = cashData?.summary;
    const payments: CashPayment[] = cashData?.payments?.data || [];
    return (
      <div>
        {/* Filters & Summary */}
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={cashFrom}
              onChange={(e) => setCashFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={cashTo}
              onChange={(e) => setCashTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="text-xs text-gray-500">Total Cash Received</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{formatZar(summary.total_cash_received)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="text-xs text-gray-500">Total Discrepancy</div>
              <div className="mt-1 text-xl font-bold text-red-600">{formatZar(summary.total_discrepancy)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="text-xs text-gray-500">Reconciled</div>
              <div className="mt-1 text-xl font-bold text-green-600">{summary.reconciled_count}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="text-xs text-gray-500">Pending Reconciliation</div>
              <div className="mt-1 text-xl font-bold text-orange-600">{summary.unreconciled_count}</div>
            </div>
          </div>
        )}

        {cashLoading ? (
          <div className="text-center py-12 text-gray-500">Loading cash payments...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No cash payments found.</div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Rider</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Cash Received</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Discrepancy</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.payer?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">{formatZar(p.amount)}</td>
                    <td className="px-4 py-3 text-right">{formatZar(p.cash_received)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatZar(p.cash_discrepancy)}</td>
                    <td className="px-4 py-3">
                      {p.cash_reconciled ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Reconciled</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!p.cash_reconciled && (
                        <button
                          onClick={() => reconcilePayment.mutate(p.id)}
                          disabled={reconcilePayment.isPending}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Reconcile
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cashData?.payments?.total && <Pagination total={cashData.payments.total} />}
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Wallet & Payout Management</h2>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Platform Balance" value={formatZar(stats.total_platform_balance)} color="bg-blue-500" />
          <StatCard label="Pending Payouts" value={formatZar(stats.pending_payouts)} color="bg-yellow-500" />
          <StatCard label="Completed This Month" value={formatZar(stats.completed_this_month)} color="bg-green-500" />
          <StatCard label="Drivers With Pending" value={String(stats.drivers_with_pending)} color="bg-orange-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Driver Wallets' && <DriverWalletsTab />}
      {activeTab === 'Payout Queue' && <PayoutQueueTab />}
      {activeTab === 'Transaction History' && <TransactionHistoryTab />}
      {activeTab === 'Cash Reconciliation' && <CashReconciliationTab />}

      {/* Reject Payout Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Reject Payout</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter rejection reason..."
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectReason.trim()) {
                    rejectPayout.mutate({ id: rejectModal, reason: rejectReason.trim() });
                  }
                }}
                disabled={!rejectReason.trim() || rejectPayout.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {rejectPayout.isPending ? 'Rejecting...' : 'Reject Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
