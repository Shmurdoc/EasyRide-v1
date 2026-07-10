import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  is_active: boolean;
  role: string;
  created_at: string;
}

interface PaginatedResponse {
  data: User[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function Users() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [suspendModal, setSuspendModal] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['admin-users', search, page],
    queryFn: async () => {
      const { data } = await api.get('/admin/manage/users', {
        params: { search: search || undefined, page, per_page: 15 },
      });
      return data;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(`/admin/manage/users/${id}/suspend`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuspendModal(null);
      setSuspendReason('');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/manage/users/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Users</h2>
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-4 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.data.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.phone_number || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.is_active ? (
                      <button
                        onClick={() => setSuspendModal(user.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => activateMutation.mutate(user.id)}
                        className="text-green-600 hover:text-green-800 text-xs font-medium"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {data && data.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-gray-500">
                Page {data.current_page} of {data.last_page} ({data.total} users)
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

      {suspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Suspend User</h3>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension..."
              className="w-full border rounded-lg p-3 text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSuspendModal(null);
                  setSuspendReason('');
                }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (suspendReason.trim()) {
                    suspendMutation.mutate({ id: suspendModal, reason: suspendReason });
                  }
                }}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {suspendMutation.isPending ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
