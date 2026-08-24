import { getAdminDashboard, getAdminRides, getAdminDrivers, getAdminUsers, getAdminSettings, updateAdminSetting } from '../api/admin';

jest.mock('../../../packages/shared/src/api/index', () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  return {
    api: mockApi,
    admin: {
      dashboard: jest.fn(),
      rides: jest.fn(),
      drivers: jest.fn(),
      users: jest.fn(),
      settings: jest.fn(),
      updateSettings: jest.fn(),
      approveDriver: jest.fn(),
      rejectDriver: jest.fn(),
    },
  };
});

describe('Admin API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAdminDashboard calls shared admin dashboard', async () => {
    const { admin } = require('../../../packages/shared/src/api/index');
    (admin.dashboard as jest.Mock).mockResolvedValue({ total_users: 100 });
    const result = await getAdminDashboard();
    expect(admin.dashboard).toHaveBeenCalled();
    expect(result.total_users).toBe(100);
  });

  it('getAdminRides passes pagination params', async () => {
    const { admin } = require('../../../packages/shared/src/api/index');
    (admin.rides as jest.Mock).mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 15 });
    await getAdminRides({ page: 1, per_page: 15, status: 'completed' });
    expect(admin.rides).toHaveBeenCalledWith({ page: '1', per_page: '15', status: 'completed' });
  });

  it('getAdminRides skips empty params', async () => {
    const { admin } = require('../../../packages/shared/src/api/index');
    (admin.rides as jest.Mock).mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 15 });
    await getAdminRides({ page: 1, per_page: 15, status: 'all', search: '' });
    expect(admin.rides).toHaveBeenCalledWith({ page: '1', per_page: '15', status: 'all' });
  });

  it('getAdminDrivers calls shared admin drivers', async () => {
    const { admin } = require('../../../packages/shared/src/api/index');
    (admin.drivers as jest.Mock).mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 15 });
    await getAdminDrivers({ page: 1, per_page: 15 });
    expect(admin.drivers).toHaveBeenCalled();
  });

  it('getAdminUsers calls shared admin users', async () => {
    const { admin } = require('../../../packages/shared/src/api/index');
    (admin.users as jest.Mock).mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 15 });
    await getAdminUsers({ page: 1, per_page: 15 });
    expect(admin.users).toHaveBeenCalled();
  });

  it('getAdminSettings calls shared admin settings', async () => {
    const { admin } = require('../../../packages/shared/src/api/index');
    (admin.settings as jest.Mock).mockResolvedValue({ base_fare: { value: '25', type: 'number', description: '' } });
    const result = await getAdminSettings();
    expect(admin.settings).toHaveBeenCalled();
    expect(result.base_fare.value).toBe('25');
  });

  it('updateAdminSetting calls shared admin updateSettings', async () => {
    const { admin } = require('../../../packages/shared/src/api/index');
    (admin.updateSettings as jest.Mock).mockResolvedValue({ id: 's1' });
    await updateAdminSetting({ key: 'base_fare', value: '30', type: 'number', description: 'Base fare' });
    expect(admin.updateSettings).toHaveBeenCalledWith({ key: 'base_fare', value: '30', type: 'number', description: 'Base fare' });
  });
});
