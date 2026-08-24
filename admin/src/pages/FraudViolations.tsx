import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface Violation {
  id: string;
  driver_id: string;
  rider_id: string | null;
  ride_id: string | null;
  food_order_id: string | null;
  delivery_id: string | null;
  violation_type: string;
  fine_amount: number;
  status: 'pending' | 'paid' | 'waived' | 'disputed';
  distance_to_dropoff_km: number | null;
  reason: string;
  evidence: Record<string, unknown>;
  created_at: string;
  driver?: { id: string; name: string; phone_number?: string };
}

const STATUS_STYLES: Record<Violation['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  waived: 'bg-gray-100 text-gray-600',
  disputed: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  cancel_after_pickup: 'R1 · Cancel after pickup',
  cancel_near_dropoff: 'R2 · Cancel near dropoff',
  collusion_flag: 'R3 · Collusion flag',
  food_cancel_after_pickup: 'R-P1 · Food cancel after pickup',
  food_cancel_near_dropoff: 'R-P2 · Food cancel near dropoff',
  parcel_cancel_after_pickup: 'P-P1 · Parcel cancel after pickup',
  parcel_cancel_near_dropoff: 'P-P2 · Parcel cancel near dropoff',
  other: 'Other',
};

export default function FraudViolations() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<{ data: Violation[] }>({
    queryKey: ['admin-violations', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/admin/violations', {
        params: statusFilter ? { status: statusFilter } : {},
      });
      return data;
    },
  });

  const waiveMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/violations/${id}/waive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-violations'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'uphold' | 'waive' }) =>
      api.post(`/admin/violations/${id}/resolve-dispute`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-violations'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Conduct & Fraud</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
          <option value="disputed">Disputed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading violations...</div>
      ) : !data?.data?.length ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          No violations recorded.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Fine</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-4 py-3">{v.driver?.name ?? v.driver_id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{TYPE_LABELS[v.violation_type] ?? v.violation_type}</span>
                    {v.distance_to_dropoff_km !== null && (
                      <span className="text-xs text-gray-400 block mt-0.5">{v.distance_to_dropoff_km} km from dropoff</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {Number(v.fine_amount) > 0 ? `R${Number(v.fine_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[260px] truncate">{v.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_STYLES[v.status]}`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(v.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      {v.status === 'pending' && (
                        <button
                          onClick={() => { if (confirm('Waive this fine?')) waiveMutation.mutate(v.id); }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Waive
                        </button>
                      )}
                      {v.status === 'disputed' && (
                        <>
                          <button
                            onClick={() => { if (confirm('Uphold this disputed fine?')) resolveMutation.mutate({ id: v.id, decision: 'uphold' }); }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Uphold
                          </button>
                          <button
                            onClick={() => { if (confirm('Waive this disputed fine?')) resolveMutation.mutate({ id: v.id, decision: 'waive' }); }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Waive
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}