import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface Driver {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  is_active: boolean;
  is_online: boolean;
  driver_profile: {
    is_approved: boolean;
    is_verified: boolean;
    license_number: string;
    average_rating: number;
    fleet_type?: string;
  } | null;
}

interface PaginatedResponse {
  data: Driver[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function Drivers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>('');
  const [reasonModal, setReasonModal] = useState<{ id: number; action: string } | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['admin-drivers', search, page, filter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (search) params.search = search;
      if (filter === 'pending') params.is_approved = '0';
      if (filter === 'approved') params.is_approved = '1';
      if (filter === 'online') params.is_online = '1';
      const { data } = await api.get('/admin/manage/drivers', { params });
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/manage/drivers/${id}/approve`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-drivers'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(`/admin/manage/drivers/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setReasonModal(null);
      setReason('');
    },
  });

  const fleetTypeMutation = useMutation({
    mutationFn: async ({ id, fleetType }: { id: number; fleetType: string }) => {
      await api.put(`/admin/drivers/${id}/fleet-type`, { fleet_type: fleetType });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-drivers'] }),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(`/admin/manage/drivers/${id}/suspend`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setReasonModal(null);
      setReason('');
    },
  });

  const handleAction = () => {
    if (!reasonModal || !reason.trim()) return;
    if (reasonModal.action === 'reject') {
      rejectMutation.mutate({ id: reasonModal.id, reason });
    } else if (reasonModal.action === 'suspend') {
      suspendMutation.mutate({ id: reasonModal.id, reason });
    }
  };

  const getStatus = (driver: Driver) => {
    if (!driver.driver_profile) return { label: 'No Profile', color: 'bg-gray-100 text-gray-700' };
    if (driver.driver_profile.is_approved) return { label: 'Approved', color: 'bg-green-100 text-green-700' };
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Drivers</h2>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="online">Online</option>
          </select>
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Online</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fleet</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.data.map((driver) => {
                const status = getStatus(driver);
                return (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{driver.name}</td>
                    <td className="px-4 py-3 text-gray-600">{driver.email}</td>
                    <td className="px-4 py-3 text-gray-600">{driver.phone_number || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${
                          driver.is_online ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {driver.driver_profile?.average_rating?.toFixed(1) ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={driver.driver_profile?.fleet_type ?? 'private'}
                        onChange={(e) => fleetTypeMutation.mutate({ id: driver.id, fleetType: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="private">Private</option>
                        <option value="easyryde">EasyRyde</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {!driver.driver_profile?.is_approved && (
                        <button
                          onClick={() => approveMutation.mutate(driver.id)}
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                        >
                          Approve
                        </button>
                      )}
                      {driver.is_active && (
                        <>
                          <button
                            onClick={() => setReasonModal({ id: driver.id, action: 'reject' })}
                            className="text-orange-600 hover:text-orange-800 text-xs font-medium"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setReasonModal({ id: driver.id, action: 'suspend' })}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Suspend
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No drivers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {data && data.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-gray-500">
                Page {data.current_page} of {data.last_page} ({data.total} drivers)
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

      {reasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 capitalize">
              {reasonModal.action} Driver
            </h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason..."
              className="w-full border rounded-lg p-3 text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setReasonModal(null);
                  setReason('');
                }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={!reason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
