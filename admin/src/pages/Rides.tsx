import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface Ride {
  id: number;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  total_fare: number;
  distance_km: number;
  created_at: string;
  rider: { id: number; name: string } | null;
  driver: { id: number; name: string } | null;
}

interface PaginatedResponse {
  data: Ride[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  requested: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-purple-100 text-purple-700',
  arrived: 'bg-indigo-100 text-indigo-700',
};

export default function Rides() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [disputeModal, setDisputeModal] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [resolveModal, setResolveModal] = useState<{ id: number; resolution: string } | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['admin-rides', status, fromDate, toDate, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (status) params.status = status;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const { data } = await api.get('/admin/manage/rides', { params });
      return data;
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(`/admin/manage/rides/${id}/dispute`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rides'] });
      setDisputeModal(null);
      setDisputeReason('');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution, notes }: { id: number; resolution: string; notes: string }) => {
      await api.post(`/admin/manage/rides/${id}/resolve`, { resolution, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rides'] });
      setResolveModal(null);
      setResolveNotes('');
    },
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-ZA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Rides</h2>
        <div className="flex gap-3 items-center">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rider</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pickup</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dropoff</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fare</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.data.map((ride) => (
                <tr key={ride.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">#{ride.id}</td>
                  <td className="px-4 py-3">{ride.rider?.name || '-'}</td>
                  <td className="px-4 py-3">{ride.driver?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{ride.pickup_address}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{ride.dropoff_address}</td>
                  <td className="px-4 py-3">R {ride.total_fare?.toFixed(2) ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[ride.status] || 'bg-gray-100 text-gray-700'}`}>
                      {ride.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(ride.created_at)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setDisputeModal(ride.id)}
                      className="text-orange-600 hover:text-orange-800 text-xs font-medium"
                    >
                      Dispute
                    </button>
                    <button
                      onClick={() => setResolveModal({ id: ride.id, resolution: 'favor_rider' })}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No rides found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {data && data.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-gray-500">
                Page {data.current_page} of {data.last_page} ({data.total} rides)
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

      {disputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Flag Ride for Review</h3>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Reason for dispute..."
              className="w-full border rounded-lg p-3 text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDisputeModal(null); setDisputeReason(''); }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (disputeReason.trim()) disputeMutation.mutate({ id: disputeModal, reason: disputeReason }); }}
                disabled={!disputeReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Resolve Dispute</h3>
            <select
              value={resolveModal.resolution}
              onChange={(e) => setResolveModal({ ...resolveModal, resolution: e.target.value })}
              className="w-full border rounded-lg p-3 text-sm mb-3"
            >
              <option value="favor_rider">In Favor of Rider</option>
              <option value="favor_driver">In Favor of Driver</option>
              <option value="partial_refund">Partial Refund</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Resolution notes..."
              className="w-full border rounded-lg p-3 text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setResolveModal(null); setResolveNotes(''); }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate({ id: resolveModal.id, resolution: resolveModal.resolution, notes: resolveNotes })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
