import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface PromoCode {
  id: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  max_discount: number | null;
  min_ride_amount: number;
  max_uses: number | null;
  max_uses_per_user: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  ride_types: string[] | null;
  created_at: string;
}

interface PaginatedData {
  data: PromoCode[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface FormData {
  code: string;
  type: 'fixed' | 'percentage';
  value: string;
  max_discount: string;
  min_ride_amount: string;
  max_uses: string;
  max_uses_per_user: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  ride_types: string[];
}

const emptyForm: FormData = {
  code: '',
  type: 'fixed',
  value: '',
  max_discount: '',
  min_ride_amount: '0',
  max_uses: '',
  max_uses_per_user: '1',
  starts_at: '',
  expires_at: '',
  is_active: true,
  ride_types: [],
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PROMO-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDiscount(p: PromoCode): string {
  if (p.type === 'percentage') return `${p.value}%`;
  return `R ${Number(p.value).toFixed(2)}`;
}

export default function PromoCodes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'new' | PromoCode | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<PromoCode | null>(null);

  const { data, isLoading } = useQuery<PaginatedData>({
    queryKey: ['admin-promo-codes', search, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active' ? '1' : '0';
      const { data } = await api.get('/promo-codes', { params });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => { await api.post('/promo-codes', payload); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] }); setModal(null); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      await api.put(`/promo-codes/${id}`, payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] }); setModal(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/promo-codes/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] }); setDeleteConfirm(null); },
  });

  const toggleMutation = useMutation({
    mutationFn: async (promo: PromoCode) => {
      await api.put(`/promo-codes/${promo.id}`, { is_active: !promo.is_active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] }),
  });

  function openNew() {
    setForm({ ...emptyForm, code: generateCode() });
    setModal('new');
  }

  function openEdit(p: PromoCode) {
    setForm({
      code: p.code,
      type: p.type,
      value: String(p.value),
      max_discount: p.max_discount != null ? String(p.max_discount) : '',
      min_ride_amount: String(p.min_ride_amount),
      max_uses: p.max_uses != null ? String(p.max_uses) : '',
      max_uses_per_user: String(p.max_uses_per_user),
      starts_at: p.starts_at ? p.starts_at.slice(0, 16) : '',
      expires_at: p.expires_at ? p.expires_at.slice(0, 16) : '',
      is_active: p.is_active,
      ride_types: p.ride_types ?? [],
    });
    setModal(p);
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      code: form.code.trim(),
      type: form.type,
      value: Number(form.value),
      min_ride_amount: Number(form.min_ride_amount) || 0,
      is_active: form.is_active,
    };
    if (form.type === 'percentage' && form.max_discount) {
      payload.max_discount = Number(form.max_discount);
    }
    if (form.max_uses) payload.max_uses = Number(form.max_uses);
    if (form.max_uses_per_user) payload.max_uses_per_user = Number(form.max_uses_per_user);
    if (form.starts_at) payload.starts_at = form.starts_at;
    if (form.expires_at) payload.expires_at = form.expires_at;
    if (form.ride_types.length) payload.ride_types = form.ride_types;

    if (modal === 'new') {
      createMutation.mutate(payload);
    } else if (modal) {
      updateMutation.mutate({ id: modal.id, payload });
    }
  }

  const isExpired = (p: PromoCode) => p.expires_at && new Date(p.expires_at) < new Date();
  const isPending = (p: PromoCode) => p.starts_at && new Date(p.starts_at) > new Date();
  const isAtLimit = (p: PromoCode) => p.max_uses != null && p.used_count >= p.max_uses;

  function statusBadge(p: PromoCode) {
    if (!p.is_active) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Inactive</span>;
    if (isExpired(p)) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>;
    if (isPending(p)) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Scheduled</span>;
    if (isAtLimit(p)) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Limit Reached</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>;
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading promo codes...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Promo Codes</h2>
        <button onClick={openNew} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          + New Promo Code
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by code..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="px-4 py-3 font-medium text-gray-600">Discount</th>
              <th className="px-4 py-3 font-medium text-gray-600">Usage</th>
              <th className="px-4 py-3 font-medium text-gray-600">Min Fare</th>
              <th className="px-4 py-3 font-medium text-gray-600">Valid From</th>
              <th className="px-4 py-3 font-medium text-gray-600">Expires</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.length ? (
              data.data.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-gray-900">{p.code}</span>
                    {p.ride_types && p.ride_types.length > 0 && (
                      <div className="text-xs text-gray-400 mt-0.5">{p.ride_types.join(', ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{formatDiscount(p)}</span>
                    {p.type === 'percentage' && p.max_discount != null && (
                      <span className="text-xs text-gray-400 ml-1">(max R {Number(p.max_discount).toFixed(2)})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.used_count} / {p.max_uses ?? '∞'}
                    {p.max_uses_per_user > 1 && (
                      <span className="text-xs text-gray-400 block">Per user: {p.max_uses_per_user}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">R {Number(p.min_ride_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(p.starts_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(p.expires_at)}</td>
                  <td className="px-4 py-3">{statusBadge(p)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleMutation.mutate(p)} className="text-gray-500 hover:text-gray-700 text-xs" title="Toggle active">
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => openEdit(p)} className="text-primary-600 hover:text-primary-800 text-xs">
                        Edit
                      </button>
                      <button onClick={() => setDeleteConfirm(p)} className="text-red-600 hover:text-red-800 text-xs">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">No promo codes found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Showing {data.data.length} of {data.total} promo codes</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1">{page} / {data.last_page}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.last_page, p + 1))}
              disabled={page === data.last_page}
              className="px-3 py-1 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{modal === 'new' ? 'Create Promo Code' : 'Edit Promo Code'}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. PROMO-ABC123"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, code: generateCode() })}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    Auto-generate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'fixed' | 'percentage' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="fixed">Fixed Amount (R)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.type === 'percentage' ? 'Discount %' : 'Discount Amount'}
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">
                      {form.type === 'percentage' ? '%' : 'R'}
                    </span>
                    <input
                      type="number"
                      step={form.type === 'percentage' ? '1' : '0.50'}
                      min="0"
                      max={form.type === 'percentage' ? '100' : '5000'}
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {form.type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Cap (R)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                    placeholder="Optional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Maximum Rand value that can be discounted</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Fare (R)</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">R</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={form.min_ride_amount}
                      onChange={(e) => setForm({ ...form, min_ride_amount: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (Total)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty for unlimited</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses Per User</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_uses_per_user}
                  onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicable To</label>
                <div className="flex gap-4">
                  {['rides', 'food_delivery'].map((rt) => (
                    <label key={rt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.ride_types.includes(rt)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, ride_types: [...form.ride_types, rt] });
                          } else {
                            setForm({ ...form, ride_types: form.ride_types.filter((r) => r !== rt) });
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{rt === 'rides' ? 'Rides' : 'Food Delivery'}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Leave empty for both</p>
              </div>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.code.trim() || !form.value || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : modal === 'new' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Delete Promo Code</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-mono font-semibold">{deleteConfirm.code}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
