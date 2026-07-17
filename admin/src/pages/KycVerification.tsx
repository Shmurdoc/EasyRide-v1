import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface KycVerification {
  id: string;
  user_id: string;
  verification_type: string;
  document_type: string;
  document_number: string;
  document_front_path: string | null;
  document_back_path: string | null;
  selfie_path: string | null;
  status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  expires_at: string | null;
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone_number: string;
    driver_profile?: {
      license_number: string;
      license_expiry: string;
      vehicle_make: string;
      vehicle_model: string;
      vehicle_registration: string;
    };
  };
}

interface KycStats {
  pending: number;
  approved_today: number;
  rejected_today: number;
  avg_review_minutes: number | null;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const DOCUMENT_TYPES: Record<string, string> = {
  id_document: 'ID Document',
  drivers_license: "Driver's License",
  proof_of_address: 'Proof of Address',
  vehicle_registration: 'Vehicle Registration',
  vehicle_insurance: 'Vehicle Insurance',
  psv_license: 'PSV License',
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  under_review: { text: 'Under Review', color: 'bg-blue-100 text-blue-800' },
  approved: { text: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { text: 'Rejected', color: 'bg-red-100 text-red-800' },
  expired: { text: 'Expired', color: 'bg-gray-100 text-gray-800' },
};

export default function KycVerification() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<KycStats>({
    queryKey: ['admin-kyc-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/manage/kyc/stats');
      return data;
    },
  });

  const { data, isLoading } = useQuery<PaginatedResponse<KycVerification>>({
    queryKey: ['admin-kyc', statusFilter, docTypeFilter, fromDate, toDate, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (docTypeFilter) params.set('document_type', docTypeFilter);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);
      params.set('page', String(page));
      const { data } = await api.get(`/admin/manage/kyc?${params.toString()}`);
      return data;
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<{
    verification: KycVerification;
  }>({
    queryKey: ['admin-kyc-detail', reviewingId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/manage/kyc/${reviewingId}`);
      return data;
    },
    enabled: !!reviewingId,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/manage/kyc/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-detail'] });
      setReviewingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.post(`/admin/manage/kyc/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-detail'] });
      setRejectModal(null);
      setRejectReason('');
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post('/admin/manage/kyc/bulk-approve', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-stats'] });
      setSelectedIds(new Set());
    },
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!data) return;
    setSelectedIds((prev) => {
      if (prev.size === data.data.length) return new Set();
      return new Set(data.data.map((v) => v.id));
    });
  }, [data]);

  const getDocumentUrl = (path: string | null) => {
    if (!path) return null;
    return `/api/v1/storage/${path}`;
  };

  const selected = detailData?.verification;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">KYC / Document Verification</h2>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Pending Review',
            value: stats?.pending ?? '-',
            color: 'bg-yellow-500',
            loading: statsLoading,
          },
          {
            label: 'Approved Today',
            value: stats?.approved_today ?? '-',
            color: 'bg-green-500',
            loading: statsLoading,
          },
          {
            label: 'Rejected Today',
            value: stats?.rejected_today ?? '-',
            color: 'bg-red-500',
            loading: statsLoading,
          },
          {
            label: 'Avg Review Time',
            value: stats?.avg_review_minutes != null ? `${stats.avg_review_minutes}m` : '-',
            color: 'bg-blue-500',
            loading: statsLoading,
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <span className="text-sm text-gray-500">{s.label}</span>
            </div>
            <div className="mt-3 text-3xl font-bold text-gray-900">
              {s.loading ? '...' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
            <select
              value={docTypeFilter}
              onChange={(e) => {
                setDocTypeFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              {Object.entries(DOCUMENT_TYPES).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {(statusFilter || docTypeFilter || fromDate || toDate) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setDocTypeFilter('');
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
              className="text-sm text-primary-600 hover:text-primary-800 px-3 py-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedIds.size} document(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => bulkApproveMutation.mutate(Array.from(selectedIds))}
              disabled={bulkApproveMutation.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {bulkApproveMutation.isPending ? 'Approving...' : 'Bulk Approve'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-600 hover:text-gray-800 px-3 py-2 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Table + Review Panel */}
      <div className="flex gap-6">
        {/* Table */}
        <div className={`${reviewingId ? 'flex-1' : 'w-full'} bg-white rounded-xl shadow-sm border`}>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading verifications...</div>
          ) : !data?.data.length ? (
            <div className="text-center py-12 text-gray-500">No verifications found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 w-10">
                      <input
                        type="checkbox"
                        checked={
                          data.data.length > 0 && selectedIds.size === data.data.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">Driver</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Document</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Number</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Submitted</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Preview</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((v) => (
                    <tr
                      key={v.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        reviewingId === v.id ? 'bg-primary-50' : ''
                      }`}
                      onClick={() => setReviewingId(v.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(v.id)}
                          onChange={() => toggleSelect(v.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{v.user?.name ?? 'Unknown'}</div>
                        <div className="text-gray-500 text-xs">{v.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {DOCUMENT_TYPES[v.document_type] ?? v.document_type}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">{v.document_number}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(v.created_at).toLocaleDateString('en-ZA')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            STATUS_LABELS[v.status]?.color ?? 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {STATUS_LABELS[v.status]?.text ?? v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.document_front_path ? (
                          <div
                            className="w-12 h-8 bg-gray-200 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage(getDocumentUrl(v.document_front_path));
                            }}
                          >
                            <img
                              src={getDocumentUrl(v.document_front_path) ?? ''}
                              alt="Document preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {v.status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => approveMutation.mutate(v.id)}
                              disabled={approveMutation.isPending}
                              className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectModal(v.id)}
                              className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-200"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.last_page > 1 && (
            <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {(data.current_page - 1) * data.per_page + 1}-
                {Math.min(data.current_page * data.per_page, data.total)} of {data.total}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.last_page, p + 1))}
                  disabled={page === data.last_page}
                  className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Review Panel */}
        {reviewingId && (
          <div className="w-96 bg-white rounded-xl shadow-sm border p-5 flex flex-col max-h-[calc(100vh-200px)] overflow-y-auto">
            {detailLoading ? (
              <div className="text-center py-8 text-gray-500">Loading details...</div>
            ) : selected ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Review Document</h3>
                  <button
                    onClick={() => setReviewingId(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    &times;
                  </button>
                </div>

                {/* Document Image */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Document Front</label>
                  {selected.document_front_path ? (
                    <div
                      className="bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-400"
                      onClick={() => setZoomedImage(getDocumentUrl(selected.document_front_path))}
                    >
                      <img
                        src={getDocumentUrl(selected.document_front_path) ?? ''}
                        alt="Document front"
                        className="w-full h-48 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect fill="%23f3f4f6" width="100" height="60"/><text x="50" y="35" text-anchor="middle" fill="%239ca3af" font-size="12">No preview</text></svg>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center text-gray-400 text-sm">
                      No document uploaded
                    </div>
                  )}
                </div>

                {selected.document_back_path && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Document Back</label>
                    <div
                      className="bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-400"
                      onClick={() => setZoomedImage(getDocumentUrl(selected.document_back_path))}
                    >
                      <img
                        src={getDocumentUrl(selected.document_back_path) ?? ''}
                        alt="Document back"
                        className="w-full h-48 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect fill="%23f3f4f6" width="100" height="60"/><text x="50" y="35" text-anchor="middle" fill="%239ca3af" font-size="12">No preview</text></svg>';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Driver Info */}
                <div className="border-t pt-4 mt-2 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Driver Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name</span>
                      <span className="text-gray-900 font-medium">{selected.user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="text-gray-900">{selected.user?.phone_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email</span>
                      <span className="text-gray-900">{selected.user?.email}</span>
                    </div>
                    {selected.user?.driver_profile && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Vehicle</span>
                          <span className="text-gray-900">
                            {selected.user.driver_profile.vehicle_make}{' '}
                            {selected.user.driver_profile.vehicle_model}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Registration</span>
                          <span className="text-gray-900 font-mono">
                            {selected.user.driver_profile.vehicle_registration}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Document Details */}
                <div className="border-t pt-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Document Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="text-gray-900">
                        {DOCUMENT_TYPES[selected.document_type] ?? selected.document_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Number</span>
                      <span className="text-gray-900 font-mono">{selected.document_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Submitted</span>
                      <span className="text-gray-900">
                        {new Date(selected.created_at).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {selected.expires_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expires</span>
                        <span
                          className={`${
                            new Date(selected.expires_at) < new Date()
                              ? 'text-red-600 font-medium'
                              : 'text-gray-900'
                          }`}
                        >
                          {new Date(selected.expires_at).toLocaleDateString('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {selected.verified_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Verified</span>
                        <span className="text-gray-900">
                          {new Date(selected.verified_at).toLocaleDateString('en-ZA')}
                        </span>
                      </div>
                    )}
                    {selected.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
                        <span className="text-xs font-medium text-red-700">Rejection reason:</span>
                        <p className="text-sm text-red-800 mt-1">{selected.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {selected.status === 'pending' && (
                  <div className="border-t pt-4 flex gap-3">
                    <button
                      onClick={() => approveMutation.mutate(selected.id)}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {approveMutation.isPending ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setRejectModal(selected.id)}
                      className="flex-1 bg-red-100 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Reject Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this document. The driver will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectReason.trim()) return;
                  rejectMutation.mutate({ id: rejectModal, reason: rejectReason.trim() });
                }}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Document zoomed"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
