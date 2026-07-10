import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import client, { PaginatedResponse } from '@/api/client';
import dayjs from 'dayjs';
import { useToast } from '@/components/Toast';

interface User {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const toast = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), per_page: '15' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await client.get<PaginatedResponse<User>>('/admin/manage/users', { params });
      setUsers(data.data);
      setMeta(data.meta);
    } catch {} finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const suspendUser = async (id: string) => {
    if (!confirm('Suspend this user?')) return;
    try {
      await client.post(`/admin/manage/users/${id}/suspend`);
      toast.success('User suspended');
      loadUsers();
      setSelected(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to suspend user');
    }
  };

  const activateUser = async (id: string) => {
    if (!confirm('Activate this user?')) return;
    try {
      await client.post(`/admin/manage/users/${id}/activate`);
      toast.success('User activated');
      loadUsers();
      setSelected(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate user');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await client.delete(`/admin/manage/users/${id}`);
      toast.success('User deleted');
      loadUsers();
      setSelected(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (u: User) => (
        <div>
          <p className="font-medium">{u.name}</p>
          <p className="text-xs text-gray-400">{u.email}</p>
        </div>
      ),
    },
    { key: 'phone_number', label: 'Phone', render: (u: User) => u.phone_number || '—' },
    { key: 'role', label: 'Role', render: (u: User) => <span className="capitalize">{u.role}</span> },
    { key: 'status', label: 'Status', render: (u: User) => <StatusBadge status={u.status || 'active'} /> },
    { key: 'created_at', label: 'Joined', render: (u: User) => dayjs(u.created_at).format('MMM D, YYYY') },
  ];

  return (
    <div>
      <PageHeader 
        title="Users" 
        subtitle="Manage all registered users"
        actions={
          <button onClick={loadUsers} className="btn-secondary btn-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        }
      />

      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Search users..." 
          className="input max-w-xs" 
          value={search} 
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
        />
        <select 
          className="input max-w-[200px]" 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <DataTable columns={columns} data={users} loading={loading} emptyMessage="No users found" onRowClick={setSelected} />

      <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={setPage} />

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="User Details">
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
                <p className="text-sm">{selected.phone_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="text-sm capitalize">{selected.role}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge status={selected.status || 'active'} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Joined</p>
                <p className="text-sm">{dayjs(selected.created_at).format('MMM D, YYYY')}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              {selected.status === 'suspended' ? (
                <button onClick={() => activateUser(selected.id)} className="btn-accent">
                  Activate User
                </button>
              ) : (
                <button onClick={() => suspendUser(selected.id)} className="btn-danger">
                  Suspend User
                </button>
              )}
              <button onClick={() => deleteUser(selected.id)} className="btn-danger opacity-60 hover:opacity-100">
                Delete User
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
