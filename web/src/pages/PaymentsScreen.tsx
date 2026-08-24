import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import client, { PaginatedResponse } from '@/api/client';
import dayjs from 'dayjs';
import { useToast } from '@/components/Toast';

interface Payment {
  id: string;
  amount: number;
  platform_fee: number;
  driver_payout: number;
  method: string;
  gateway: string;
  status: string;
  paid_at: string;
  refunded_at: string;
  refund_amount: number;
  refund_reason: string;
  escrow_released: boolean;
  cash_reconciled: boolean;
  created_at: string;
  ride?: { id: string; pickup_address: string; dropoff_address: string };
  payer?: { id: string; name: string; email: string };
}

interface ReconciliationData {
  total_cash_payments: number;
  total_cash_amount: number;
  reconciled_count: number;
  unreconciled_count: number;
  unreconciled_amount: number;
}

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);
  const toast = useToast();

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), per_page: '15' };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;
      const { data } = await client.get<PaginatedResponse<Payment>>('/admin/manage/payments', { params });
      setPayments(data.data);
      setMeta(data.meta);
    } catch (err) {
      console.error('[Payments] Failed to load:', err);
      toast.error('Failed to load payments');
    } finally { setLoading(false); }
  }, [page, statusFilter, methodFilter]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const loadReconciliation = async () => {
    setLoadingReconciliation(true);
    try {
      const { data } = await client.get('/admin/manage/payments/reconciliation');
      setReconciliation(data);
      setShowReconciliation(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load reconciliation data');
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const refundPayment = async (id: string) => {
    const reason = prompt('Refund reason (admin_override, driver_no_show, duplicate_charge, technical_issue):');
    if (!reason) return;
    try {
      await client.post(`/admin/manage/payments/${id}/refund`, { reason });
      toast.success('Payment refunded');
      loadPayments();
      setSelected(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to refund payment');
    }
  };

  const columns = [
    {
      key: 'created_at',
      label: 'Date',
      render: (p: Payment) => <span className="text-gray-500">{dayjs(p.created_at).format('MMM D, HH:mm')}</span>,
    },
    { key: 'payer', label: 'Payer', render: (p: Payment) => p.payer?.name || '—' },
    { key: 'method', label: 'Method', render: (p: Payment) => <span className="capitalize">{p.method}</span> },
    { key: 'amount', label: 'Amount', render: (p: Payment) => <span className="font-medium">R{p.amount}</span> },
    { key: 'platform_fee', label: 'Fee', render: (p: Payment) => <span className="text-gray-500">R{p.platform_fee}</span> },
    { key: 'driver_payout', label: 'Driver', render: (p: Payment) => <span className="text-gray-500">R{p.driver_payout || 0}</span> },
    { key: 'status', label: 'Status', render: (p: Payment) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div>
      <PageHeader 
        title="Payments" 
        subtitle="Manage payments, refunds, and reconciliation"
        actions={
          <div className="flex gap-2">
            <button onClick={loadPayments} className="btn-secondary btn-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
            <button onClick={loadReconciliation} className="btn-primary btn-sm" disabled={loadingReconciliation}>
              {loadingReconciliation ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4Z" />
                  </svg>
                  Loading...
                </>
              ) : (
                'Reconciliation'
              )}
            </button>
          </div>
        }
      />

      <div className="flex gap-4 mb-6">
        <select className="input max-w-[200px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select className="input max-w-[200px]" value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}>
          <option value="">All methods</option>
          <option value="wallet">Wallet</option>
          <option value="cash">Cash</option>
          <option value="payfast">PayFast</option>
          <option value="ozow">Ozow</option>
          <option value="stripe">Stripe</option>
        </select>
      </div>

      <DataTable columns={columns} data={payments} loading={loading} emptyMessage="No payments found" onRowClick={setSelected} />

      <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={setPage} />

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Payment Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-lg font-bold">R{selected.amount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Method</p>
                <p className="text-sm capitalize">{selected.method}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gateway</p>
                <p className="text-sm capitalize">{selected.gateway || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Platform Fee</p>
                <p className="text-sm">R{selected.platform_fee}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Driver Payout</p>
                <p className="text-sm">R{selected.driver_payout || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Escrow Released</p>
                <StatusBadge status={selected.escrow_released ? 'active' : 'pending'} />
              </div>
              {selected.method === 'cash' && (
                <div>
                  <p className="text-xs text-gray-500">Cash Reconciled</p>
                  <StatusBadge status={selected.cash_reconciled ? 'active' : 'pending'} />
                </div>
              )}
              {selected.refunded_at && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Refund Details</p>
                  <p className="text-sm">R{selected.refund_amount} — {selected.refund_reason}</p>
                  <p className="text-xs text-gray-400">{dayjs(selected.refunded_at).format('MMM D, YYYY HH:mm')}</p>
                </div>
              )}
            </div>
            
            {selected.ride && (
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500">Related Ride</p>
                <p className="text-sm">{selected.ride.pickup_address} → {selected.ride.dropoff_address}</p>
              </div>
            )}

            {selected.payer && (
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500">Payer</p>
                <p className="text-sm">{selected.payer.name} ({selected.payer.email})</p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm">{dayjs(selected.created_at).format('DD MMM YYYY, HH:mm')}</p>
            </div>

            {selected.status === 'completed' && !selected.refunded_at && (
              <div className="pt-4 border-t">
                <button onClick={() => refundPayment(selected.id)} className="btn-danger">Process Refund</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={showReconciliation} onClose={() => setShowReconciliation(false)} title="Cash Reconciliation" size="lg">
        {reconciliation ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Cash Payments</p>
                <p className="text-2xl font-bold">{reconciliation.total_cash_payments}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Cash Amount</p>
                <p className="text-2xl font-bold">R{reconciliation.total_cash_amount.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-accent-50 rounded-lg">
                <p className="text-sm text-accent-700">Reconciled</p>
                <p className="text-2xl font-bold text-accent-700">{reconciliation.reconciled_count}</p>
              </div>
              <div className="p-4 bg-warn-50 rounded-lg">
                <p className="text-sm text-warn-700">Unreconciled</p>
                <p className="text-2xl font-bold text-warn-700">{reconciliation.unreconciled_count}</p>
              </div>
            </div>
            {reconciliation.unreconciled_amount > 0 && (
              <div className="p-4 bg-danger-50 rounded-lg">
                <p className="text-sm text-danger-700">Unreconciled Amount</p>
                <p className="text-2xl font-bold text-danger-700">R{reconciliation.unreconciled_amount.toLocaleString()}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
