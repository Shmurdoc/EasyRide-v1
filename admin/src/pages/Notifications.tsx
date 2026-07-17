import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  audience: string;
  user_id: string | null;
  sent_count: number;
  failed_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface NotificationListResponse {
  data: AdminNotification[];
  meta: {
    current_page: number;
    last_page: number;
  };
}

const typeBadge: Record<string, { bg: string; text: string; label: string }> = {
  general: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Info' },
  promo: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Promotion' },
  alert: { bg: 'bg-red-100', text: 'text-red-700', label: 'Emergency' },
  ride_update: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'System' },
  account: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Account' },
};

const statusBadge: Record<string, { bg: string; text: string }> = {
  sent: { bg: 'bg-green-100', text: 'text-green-700' },
  sending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  failed: { bg: 'bg-red-100', text: 'text-red-700' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

const audienceLabels: Record<string, string> = {
  all: 'All Users',
  riders: 'All Drivers',
  drivers: 'All Riders',
  user: 'Specific User',
};

const typeOptions = [
  { value: 'general', label: 'Info' },
  { value: 'promo', label: 'Promotion' },
  { value: 'alert', label: 'Emergency' },
  { value: 'ride_update', label: 'System' },
  { value: 'account', label: 'Account' },
];

const audienceOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'riders', label: 'All Riders' },
  { value: 'drivers', label: 'All Drivers' },
  { value: 'user', label: 'Specific User' },
];

type Tab = 'send' | 'history';

export default function Notifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('send');
  const [historyPage, setHistoryPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'general',
    audience: 'all',
    user_id: '',
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<NotificationListResponse>({
    queryKey: ['admin-notifications', historyPage, filterType, filterStatus],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: historyPage, per_page: 15 };
      const { data } = await api.get('/admin/notifications', { params });
      return data;
    },
    enabled: activeTab === 'history',
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data } = await api.post('/admin/notifications', {
        title: payload.title,
        body: payload.body,
        type: payload.type,
        audience: payload.audience,
        user_id: payload.audience === 'user' ? payload.user_id : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      setForm({ title: '', body: '', type: 'general', audience: 'all', user_id: '' });
      setShowConfirm(false);
      setShowPreview(false);
      setScheduleMode('now');
      setScheduleDate('');
      setScheduleTime('');
    },
  });

  const filteredNotifications = historyData?.data?.filter((n) => {
    if (filterType && n.type !== filterType) return false;
    if (filterStatus && n.status !== filterStatus) return false;
    return true;
  });

  const handleSend = () => {
    sendMutation.mutate(form);
  };

  const isFormValid =
    form.title.trim() &&
    form.body.trim() &&
    (form.audience !== 'user' || form.user_id.trim());

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Notification Center</h2>

      <div className="flex gap-1 mb-6 border-b">
        {(['send', 'history'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'send' ? 'Send Notification' : 'Notification History'}
          </button>
        ))}
      </div>

      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Compose Notification</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Notification title..."
                    maxLength={100}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <span className="text-xs text-gray-400 mt-1 block">{form.title.length}/100</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Notification body..."
                    maxLength={500}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <span className="text-xs text-gray-400 mt-1 block">{form.body.length}/500</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {typeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                    <select
                      value={form.audience}
                      onChange={(e) => setForm({ ...form, audience: e.target.value, user_id: '' })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {audienceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.audience === 'user' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <input
                      type="text"
                      value={form.user_id}
                      onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                      placeholder="Enter user ID..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="schedule"
                        checked={scheduleMode === 'now'}
                        onChange={() => setScheduleMode('now')}
                        className="text-primary-600"
                      />
                      <span className="text-sm">Send Now</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="schedule"
                        checked={scheduleMode === 'later'}
                        onChange={() => setScheduleMode('later')}
                        className="text-primary-600"
                      />
                      <span className="text-sm">Schedule for Later</span>
                    </label>
                  </div>
                  {scheduleMode === 'later' && (
                    <div className="flex gap-3 mt-3">
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPreview(true)}
                    disabled={!isFormValid}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!isFormValid || sendMutation.isPending}
                    className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {sendMutation.isPending ? 'Sending...' : 'Send Notification'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[form.type]?.bg} ${typeBadge[form.type]?.text}`}>
                    {typeBadge[form.type]?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Audience</span>
                  <span className="font-medium">{audienceLabels[form.audience]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Schedule</span>
                  <span className="font-medium">
                    {scheduleMode === 'now'
                      ? 'Immediately'
                      : scheduleDate && scheduleTime
                        ? `${scheduleDate} ${scheduleTime}`
                        : 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Type Reference</h3>
              <div className="space-y-2">
                {Object.entries(typeBadge).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${val.bg}`} />
                    <span className="text-gray-600">{val.label}</span>
                    <span className="text-gray-400 ml-auto text-xs">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setHistoryPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setHistoryPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="sending">Sending</option>
              <option value="failed">Failed</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {historyLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Audience</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Sent</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredNotifications?.map((n) => {
                    const badge = typeBadge[n.type] || typeBadge.general;
                    const status = statusBadge[n.status] || statusBadge.sent;
                    return (
                      <tr
                        key={n.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedNotification(n)}
                      >
                        <td className="px-4 py-3 font-medium max-w-[200px] truncate">{n.title}</td>
                        <td className="px-4 py-3 text-gray-600">{audienceLabels[n.audience] || n.audience}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            {n.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {n.sent_count}/{n.sent_count + n.failed_count}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {n.sent_at
                            ? new Date(n.sent_at).toLocaleDateString('en-ZA', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {(!filteredNotifications || filteredNotifications.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        No notifications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {historyData && historyData.meta.last_page > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-gray-500">
                    Page {historyData.meta.current_page} of {historyData.meta.last_page}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setHistoryPage((p) => Math.min(historyData.meta.last_page, p + 1))}
                      disabled={historyPage === historyData.meta.last_page}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Notification Preview</h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[form.type]?.bg} ${typeBadge[form.type]?.text}`}>
                  {typeBadge[form.type]?.label}
                </span>
              </div>
              <div className="font-semibold text-gray-900 mb-1">{form.title || 'Untitled'}</div>
              <div className="text-sm text-gray-600">{form.body || 'No message content'}</div>
              <div className="text-xs text-gray-400 mt-3">
                To: {audienceLabels[form.audience]}
                {form.audience === 'user' && form.user_id && ` (User #${form.user_id})`}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">Confirm Send</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send "{form.title}" to {audienceLabels[form.audience].toLowerCase()}?
              {scheduleMode === 'later' && scheduleDate && scheduleTime && (
                <span className="block mt-1 text-yellow-600">
                  Scheduled for {scheduleDate} at {scheduleTime}
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sendMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {sendMutation.isPending ? 'Sending...' : 'Confirm Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">Notification Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Title:</span>
                <span className="ml-2 font-medium">{selectedNotification.title}</span>
              </div>
              <div>
                <span className="text-gray-500">Body:</span>
                <span className="ml-2">{selectedNotification.body}</span>
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[selectedNotification.type]?.bg} ${typeBadge[selectedNotification.type]?.text}`}>
                      {typeBadge[selectedNotification.type]?.label}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[selectedNotification.status]?.bg} ${statusBadge[selectedNotification.status]?.text}`}>
                      {selectedNotification.status}
                    </span>
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Audience:</span>
                <span className="ml-2">{audienceLabels[selectedNotification.audience]}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="text-gray-500 mb-2">Delivery Stats</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-700">{selectedNotification.sent_count}</div>
                    <div className="text-xs text-green-600">Sent</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-700">{selectedNotification.failed_count}</div>
                    <div className="text-xs text-red-600">Failed</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-700">
                      {selectedNotification.sent_count + selectedNotification.failed_count > 0
                        ? Math.round(
                            (selectedNotification.sent_count /
                              (selectedNotification.sent_count + selectedNotification.failed_count)) *
                              100
                          )
                        : 0}%
                    </div>
                    <div className="text-xs text-blue-600">Delivery Rate</div>
                  </div>
                </div>
              </div>
              {selectedNotification.sent_at && (
                <div>
                  <span className="text-gray-500">Sent at:</span>
                  <span className="ml-2">
                    {new Date(selectedNotification.sent_at).toLocaleString('en-ZA')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
