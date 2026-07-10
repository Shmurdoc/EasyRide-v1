import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface Payment {
  id: number;
  amount: number;
  status: string;
  method: string;
  gateway_reference: string;
  created_at: string;
  ride: { id: number } | null;
  payer: { id: number; name: string } | null;
  payee: { id: number; name: string } | null;
}

interface PaginatedResponse {
  data: Payment[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  refunded: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const refundReasons = [
  { value: 'admin_override', label: 'Admin Override' },
  { value: 'driver_no_show', label: 'Driver No Show' },
  { value: 'duplicate_charge', label: 'Duplicate Charge' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'customer_complaint', label: 'Customer Complaint' },
];

export default function Payments() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [refundModal, setRefundModal] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['admin-payments', status, method, fromDate, toDate, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (status) params.status = status;
      if (method) params.method = method;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const { data } = await api.get('/admin/manage/payments', { params });
      return data;
    },
  });

  const refundMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(`/admin/manage/payments/${id}/refund`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setRefundModal(null);
      setRefundReason('');
    },
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-ZA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Payments</h2>
        <div className="flex gap-3 items-center">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="wallet">Wallet</option>
            <option value="payfast">PayFast</option>
            <option value="ozow">Ozow</option>
            <option value="stripe">Stripe</option>
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ride</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.data.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">#{payment.id}</td>
                  <td className="px-4 py-3">#{payment.ride?.id ?? '-'}</td>
                  <td className="px-4 py-3">{payment.payer?.name ?? '-'}</td>
                  <td className="px-4 py-3 font-medium">R {payment.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 capitalize">
                      {payment.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px] truncate">
                    {payment.gateway_reference || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[payment.status] || 'bg-gray-100 text-gray-700'}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(payment.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {payment.status === 'completed' && (
                      <button
                        onClick={() => setRefundModal(payment.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {data && data.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-gray-500">
                Page {data.current_page} of {data.last_page} ({data.total} payments)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.last_page, p + 1))}
                  disabled={page === data.last_page}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {refundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Refund Payment</h3>
            <select
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full border rounded-lg p-3 text-sm mb-4"
            >
              <option value="">Select reason...</option>
              {refundReasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRefundModal(null); setRefundReason(''); }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (refundReason) refundMutation.mutate({ id: refundModal, reason: refundReason }); }}
                disabled={!refundReason || refundMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {refundMutation.isPending ? 'Processing...' : 'Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
