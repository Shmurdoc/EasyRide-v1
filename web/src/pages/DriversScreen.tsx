import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import client, { PaginatedResponse } from '@/api/client';
import dayjs from 'dayjs';
import { useToast } from '@/components/Toast';

interface DriverDocument {
  type: string;
  url: string;
  verified: boolean;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  is_online: boolean;
  status: string;
  created_at: string;
  driver_profile?: {
    license_number: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    vehicle_color: string;
    license_plate: string;
    approval_status: string;
  };
  documents?: DriverDocument[];
}

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const toast = useToast();

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), per_page: '15' };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await client.get<PaginatedResponse<Driver>>('/admin/manage/drivers', { params });
      setDrivers(data.data);
      setMeta(data.meta);
    } catch {} finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const loadDocuments = async (driverId: string) => {
    setLoadingDocs(true);
    try {
      const { data } = await client.get(`/admin/manage/drivers/${driverId}/documents`);
      setDocuments(data.documents || data || []);
    } catch {
      toast.error('Failed to load documents');
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const approveDriver = async (id: string) => {
    try {
      await client.post(`/admin/manage/drivers/${id}/approve`);
      toast.success('Driver approved');
      loadDrivers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve driver');
    }
  };

  const rejectDriver = async (id: string) => {
    if (!confirm('Reject this driver?')) return;
    try {
      await client.post(`/admin/manage/drivers/${id}/reject`);
      toast.success('Driver rejected');
      loadDrivers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject driver');
    }
  };

  const suspendDriver = async (id: string) => {
    if (!confirm('Suspend this driver?')) return;
    try {
      await client.post(`/admin/manage/drivers/${id}/suspend`);
      toast.success('Driver suspended');
      loadDrivers();
      setSelected(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to suspend driver');
    }
  };

  const handleRowClick = (driver: Driver) => {
    setSelected(driver);
    if (driver.id) {
      loadDocuments(driver.id);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Driver',
      render: (d: Driver) => (
        <div>
          <p className="font-medium">{d.name}</p>
          <p className="text-xs text-gray-400">{d.email}</p>
        </div>
      ),
    },
    { key: 'phone_number', label: 'Phone', render: (d: Driver) => d.phone_number || '—' },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (d: Driver) => {
        const p = d.driver_profile;
        return p ? <span>{p.vehicle_year} {p.vehicle_make} {p.vehicle_model}</span> : <span className="text-gray-400">—</span>;
      },
    },
    { key: 'is_online', label: 'Status', render: (d: Driver) => <StatusBadge status={d.is_online ? 'online' : 'offline'} /> },
    {
      key: 'approval',
      label: 'Approval',
      render: (d: Driver) => <StatusBadge status={d.driver_profile?.approval_status || 'pending'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (d: Driver) => (
        <div className="flex gap-2">
          {d.driver_profile?.approval_status === 'pending' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); approveDriver(d.id); }} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">
                Approve
              </button>
              <button onClick={(e) => { e.stopPropagation(); rejectDriver(d.id); }} className="text-red-600 hover:text-red-700 text-xs font-medium">
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader 
        title="Drivers" 
        subtitle="Manage driver accounts, approvals, and documents"
        actions={
          <button onClick={loadDrivers} className="btn-secondary btn-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        }
      />

      <div className="flex gap-4 mb-6">
        <input type="text" placeholder="Search drivers..." className="input max-w-xs" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input max-w-[200px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <DataTable columns={columns} data={drivers} loading={loading} emptyMessage="No drivers found" onRowClick={handleRowClick} />

      <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={setPage} />

      <Modal isOpen={!!selected} onClose={() => { setSelected(null); setDocuments([]); }} title="Driver Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium">{selected.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm">{selected.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm">{selected.phone_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Online Status</p>
                <StatusBadge status={selected.is_online ? 'online' : 'offline'} />
              </div>
            </div>
            
            {selected.driver_profile && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Vehicle Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Vehicle</p>
                    <p className="text-sm">{selected.driver_profile.vehicle_year} {selected.driver_profile.vehicle_make} {selected.driver_profile.vehicle_model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Color / Plate</p>
                    <p className="text-sm">{selected.driver_profile.vehicle_color} • {selected.driver_profile.license_plate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">License Number</p>
                    <p className="text-sm">{selected.driver_profile.license_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Approval Status</p>
                    <StatusBadge status={selected.driver_profile.approval_status} />
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Documents</p>
              {loadingDocs ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-12" />
                  ))}
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{doc.type.replace(/_/g, ' ')}</p>
                          <StatusBadge status={doc.verified ? 'verified' : 'pending'} />
                        </div>
                      </div>
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No documents uploaded</p>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              {selected.driver_profile?.approval_status === 'pending' && (
                <>
                  <button onClick={() => { approveDriver(selected.id); setSelected(null); }} className="btn-accent">
                    Approve Driver
                  </button>
                  <button onClick={() => { rejectDriver(selected.id); setSelected(null); }} className="btn-danger">
                    Reject Driver
                  </button>
                </>
              )}
              <button onClick={() => suspendDriver(selected.id)} className="btn-danger">
                Suspend Driver
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
