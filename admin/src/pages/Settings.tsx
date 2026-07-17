import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface Setting {
  key: string;
  value: unknown;
  description?: string;
  type: string;
}

interface PeakHour {
  id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  multiplier: number;
  is_active: boolean;
}

interface SurgeZone {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  multiplier: number;
  is_active: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function InputField({
  label,
  value,
  onChange,
  type = 'number',
  step,
  prefix,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center">
        {prefix && (
          <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">
            {prefix}
          </span>
        )}
        <input
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            prefix ? 'rounded-r-lg' : 'rounded-lg'
          }`}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [platformFee, setPlatformFee] = useState('15');
  const [minFare, setMinFare] = useState('25');
  const [baseFare, setBaseFare] = useState('25');
  const [perKm, setPerKm] = useState('12');
  const [perMin, setPerMin] = useState('2');
  const [cancellationFee, setCancellationFee] = useState('25');
  const [freeCancellationWindow, setFreeCancellationWindow] = useState('2');

  const [surgeEnabled, setSurgeEnabled] = useState(true);
  const [maxSurgeMultiplier, setMaxSurgeMultiplier] = useState('3.0');

  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [autoPayoutSchedule, setAutoPayoutSchedule] = useState('weekly');
  const [minPayoutAmount, setMinPayoutAmount] = useState('100');

  const [peakHourModal, setPeakHourModal] = useState<PeakHour | 'new' | null>(null);
  const [peakHourForm, setPeakHourForm] = useState({
    name: '',
    day_of_week: 1,
    start_time: '07:00',
    end_time: '09:00',
    multiplier: 1.5,
  });

  const [surgeZoneModal, setSurgeZoneModal] = useState<SurgeZone | 'new' | null>(null);
  const [surgeZoneForm, setSurgeZoneForm] = useState({
    name: '',
    center_lat: -23.9468,
    center_lng: 29.4726,
    radius_meters: 5000,
    multiplier: 1.5,
  });

  const { isLoading: settingsLoading } = useQuery<Record<string, Setting>>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await api.get('/admin/settings');
      return data;
    },
  });

  const { data: peakHoursData, isLoading: peakHoursLoading } = useQuery<{ data: PeakHour[] }>({
    queryKey: ['admin-peak-hours'],
    queryFn: async () => {
      const { data } = await api.get('/admin/peak-hours');
      return data;
    },
  });

  const { data: surgeZonesData, isLoading: surgeZonesLoading } = useQuery<{ data: SurgeZone[] }>({
    queryKey: ['admin-surge-zones'],
    queryFn: async () => {
      const { data } = await api.get('/admin/surge-zones');
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings = [
        { key: 'platform_fee_percent', value: platformFee, type: 'number', description: 'Platform fee percentage' },
        { key: 'min_fare', value: minFare, type: 'number', description: 'Minimum fare' },
        { key: 'base_fare', value: baseFare, type: 'number', description: 'Base fare' },
        { key: 'per_km_rate', value: perKm, type: 'number', description: 'Per-kilometre rate' },
        { key: 'per_minute_rate', value: perMin, type: 'number', description: 'Per-minute rate' },
        { key: 'cancellation_fee', value: cancellationFee, type: 'number', description: 'Cancellation fee' },
        { key: 'free_cancellation_window_minutes', value: freeCancellationWindow, type: 'number', description: 'Free cancellation window in minutes' },
        { key: 'surge_enabled', value: String(surgeEnabled), type: 'boolean', description: 'Surge pricing enabled' },
        { key: 'max_surge_multiplier', value: maxSurgeMultiplier, type: 'number', description: 'Maximum surge multiplier' },
        { key: 'payment_method_cash', value: String(cashEnabled), type: 'boolean', description: 'Cash payments enabled' },
        { key: 'payment_method_card', value: String(cardEnabled), type: 'boolean', description: 'Card payments enabled' },
        { key: 'payment_method_wallet', value: String(walletEnabled), type: 'boolean', description: 'Wallet payments enabled' },
        { key: 'auto_payout_schedule', value: autoPayoutSchedule, type: 'string', description: 'Auto payout schedule' },
        { key: 'min_payout_amount', value: minPayoutAmount, type: 'number', description: 'Minimum payout amount' },
      ];
      await Promise.all(settings.map((s) => api.post('/admin/settings', s)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setSaveMessage('Settings saved successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  const createPeakHour = useMutation({
    mutationFn: async () => { await api.post('/admin/peak-hours', peakHourForm); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-peak-hours'] }); setPeakHourModal(null); },
  });

  const updatePeakHour = useMutation({
    mutationFn: async () => {
      if (peakHourModal && peakHourModal !== 'new') await api.put(`/admin/peak-hours/${peakHourModal.id}`, peakHourForm);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-peak-hours'] }); setPeakHourModal(null); },
  });

  const deletePeakHour = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/peak-hours/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-peak-hours'] }),
  });

  const togglePeakHour = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/admin/peak-hours/${id}/toggle`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-peak-hours'] }),
  });

  const createSurgeZone = useMutation({
    mutationFn: async () => { await api.post('/admin/surge-zones', surgeZoneForm); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-surge-zones'] }); setSurgeZoneModal(null); },
  });

  const updateSurgeZone = useMutation({
    mutationFn: async () => {
      if (surgeZoneModal && surgeZoneModal !== 'new') await api.put(`/admin/surge-zones/${surgeZoneModal.id}`, surgeZoneForm);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-surge-zones'] }); setSurgeZoneModal(null); },
  });

  const deleteSurgeZone = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/surge-zones/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-surge-zones'] }),
  });

  const toggleSurgeZone = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/admin/surge-zones/${id}/toggle`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-surge-zones'] }),
  });

  function openPeakHourEdit(ph: PeakHour) {
    setPeakHourForm({ name: ph.name, day_of_week: ph.day_of_week, start_time: ph.start_time, end_time: ph.end_time, multiplier: ph.multiplier });
    setPeakHourModal(ph);
  }

  function openSurgeZoneEdit(sz: SurgeZone) {
    setSurgeZoneForm({ name: sz.name, center_lat: sz.center_lat, center_lng: sz.center_lng, radius_meters: sz.radius_meters, multiplier: sz.multiplier });
    setSurgeZoneModal(sz);
  }

  if (settingsLoading) {
    return <div className="text-center py-12 text-gray-500">Loading settings...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Settings & Pricing</h2>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {saveMessage && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Platform Pricing ── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Platform Pricing</h3>
          <div className="space-y-4">
            <InputField label="Platform Fee (%)" value={platformFee} onChange={setPlatformFee} step="0.5" />
            <InputField label="Minimum Fare" value={minFare} onChange={setMinFare} prefix="R" step="0.50" />
            <InputField label="Base Fare" value={baseFare} onChange={setBaseFare} prefix="R" step="0.50" />
            <InputField label="Per-km Rate" value={perKm} onChange={setPerKm} prefix="R" step="0.50" />
            <InputField label="Per-minute Rate" value={perMin} onChange={setPerMin} prefix="R" step="0.50" />
            <InputField label="Cancellation Fee" value={cancellationFee} onChange={setCancellationFee} prefix="R" step="0.50" />
            <InputField label="Free Cancellation Window (minutes)" value={freeCancellationWindow} onChange={setFreeCancellationWindow} step="1" />
          </div>
        </div>

        {/* ── Surge Pricing ── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Surge Pricing</h3>
          <div className="space-y-4">
            <Toggle label="Enable Surge Pricing" checked={surgeEnabled} onChange={setSurgeEnabled} />
            <InputField label="Max Surge Multiplier" value={maxSurgeMultiplier} onChange={setMaxSurgeMultiplier} step="0.1" />

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Surge Zones</h4>
                <button
                  onClick={() => { setSurgeZoneForm({ name: '', center_lat: -23.9468, center_lng: 29.4726, radius_meters: 5000, multiplier: 1.5 }); setSurgeZoneModal('new'); }}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  + Add Zone
                </button>
              </div>

              {surgeZonesLoading ? (
                <div className="text-sm text-gray-400 py-2">Loading...</div>
              ) : surgeZonesData?.data?.length ? (
                <div className="space-y-2">
                  {surgeZonesData.data.map((sz) => (
                    <div key={sz.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-sm">
                        <span className="font-medium">{sz.name}</span>
                        <span className="text-gray-500 ml-2">{sz.multiplier}x · {sz.radius_meters}m</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${sz.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                          {sz.is_active ? 'Active' : 'Off'}
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <button onClick={() => toggleSurgeZone.mutate(sz.id)} className="text-gray-500 hover:text-gray-700">Toggle</button>
                        <button onClick={() => openSurgeZoneEdit(sz)} className="text-primary-600 hover:text-primary-800">Edit</button>
                        <button onClick={() => { if (confirm('Delete this surge zone?')) deleteSurgeZone.mutate(sz.id); }} className="text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 py-2">No surge zones configured.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Peak Hours ── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Peak Hours</h3>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Configure time-based fare multipliers.</p>
            <button
              onClick={() => { setPeakHourForm({ name: '', day_of_week: 1, start_time: '07:00', end_time: '09:00', multiplier: 1.5 }); setPeakHourModal('new'); }}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              + Add Rule
            </button>
          </div>

          {peakHoursLoading ? (
            <div className="text-sm text-gray-400 py-2">Loading...</div>
          ) : peakHoursData?.data?.length ? (
            <div className="space-y-2">
              {peakHoursData.data.map((ph) => (
                <div key={ph.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-sm">
                    <span className="font-medium">{ph.name}</span>
                    <span className="text-gray-500 ml-2">{DAYS[ph.day_of_week]} {ph.start_time}–{ph.end_time} · {ph.multiplier}x</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${ph.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {ph.is_active ? 'Active' : 'Off'}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => togglePeakHour.mutate(ph.id)} className="text-gray-500 hover:text-gray-700">Toggle</button>
                    <button onClick={() => openPeakHourEdit(ph)} className="text-primary-600 hover:text-primary-800">Edit</button>
                    <button onClick={() => { if (confirm('Delete this peak hour rule?')) deletePeakHour.mutate(ph.id); }} className="text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-2">No peak hour rules configured.</div>
          )}
        </div>

        {/* ── Payment Settings ── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Settings</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Enabled Payment Methods</h4>
              <div className="space-y-1">
                <Toggle label="Cash" checked={cashEnabled} onChange={setCashEnabled} />
                <Toggle label="Card (Stripe / PayFast / Ozow)" checked={cardEnabled} onChange={setCardEnabled} />
                <Toggle label="Wallet" checked={walletEnabled} onChange={setWalletEnabled} />
              </div>
            </div>
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Payout Schedule</label>
              <select
                value={autoPayoutSchedule}
                onChange={(e) => setAutoPayoutSchedule(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <InputField label="Minimum Payout Amount" value={minPayoutAmount} onChange={setMinPayoutAmount} prefix="R" step="10" />
          </div>
        </div>
      </div>

      {/* ── Peak Hour Modal ── */}
      {peakHourModal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{peakHourModal === 'new' ? 'Add Peak Hour Rule' : 'Edit Peak Hour'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={peakHourForm.name} onChange={(e) => setPeakHourForm({ ...peakHourForm, name: e.target.value })} placeholder="e.g. Morning Rush" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select value={peakHourForm.day_of_week} onChange={(e) => setPeakHourForm({ ...peakHourForm, day_of_week: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={peakHourForm.start_time} onChange={(e) => setPeakHourForm({ ...peakHourForm, start_time: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={peakHourForm.end_time} onChange={(e) => setPeakHourForm({ ...peakHourForm, end_time: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Multiplier</label>
                <input type="number" step="0.1" min="1" value={peakHourForm.multiplier} onChange={(e) => setPeakHourForm({ ...peakHourForm, multiplier: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setPeakHourModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => { peakHourModal === 'new' ? createPeakHour.mutate() : updatePeakHour.mutate(); }}
                disabled={!peakHourForm.name.trim() || createPeakHour.isPending || updatePeakHour.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {(createPeakHour.isPending || updatePeakHour.isPending) ? 'Saving...' : peakHourModal === 'new' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Surge Zone Modal ── */}
      {surgeZoneModal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{surgeZoneModal === 'new' ? 'Add Surge Zone' : 'Edit Surge Zone'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
                <input value={surgeZoneForm.name} onChange={(e) => setSurgeZoneForm({ ...surgeZoneForm, name: e.target.value })} placeholder="e.g. CBD" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Center Latitude</label>
                  <input type="number" step="0.0001" value={surgeZoneForm.center_lat} onChange={(e) => setSurgeZoneForm({ ...surgeZoneForm, center_lat: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Center Longitude</label>
                  <input type="number" step="0.0001" value={surgeZoneForm.center_lng} onChange={(e) => setSurgeZoneForm({ ...surgeZoneForm, center_lng: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Radius (meters)</label>
                  <input type="number" step="100" value={surgeZoneForm.radius_meters} onChange={(e) => setSurgeZoneForm({ ...surgeZoneForm, radius_meters: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Multiplier</label>
                  <input type="number" step="0.1" min="1" value={surgeZoneForm.multiplier} onChange={(e) => setSurgeZoneForm({ ...surgeZoneForm, multiplier: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setSurgeZoneModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => { surgeZoneModal === 'new' ? createSurgeZone.mutate() : updateSurgeZone.mutate(); }}
                disabled={!surgeZoneForm.name.trim() || createSurgeZone.isPending || updateSurgeZone.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {(createSurgeZone.isPending || updateSurgeZone.isPending) ? 'Saving...' : surgeZoneModal === 'new' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
