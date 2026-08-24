import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import PromoCodeScreen from '../screens/PromoCodeScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    promoCodes: {
      list: jest.fn().mockResolvedValue({
        data: [
          { id: 'pc-1', code: 'SAVE20', type: 'percentage', value: 20, min_ride_amount: 50, max_discount: 100, max_uses: 1000, used_count: 234, is_active: true, starts_at: null, expires_at: '2025-12-31T00:00:00Z', tenant_id: null },
          { id: 'pc-2', code: 'RIDE50', type: 'fixed', value: 50, min_ride_amount: 100, max_discount: 50, max_uses: 500, used_count: 89, is_active: true, starts_at: null, expires_at: '2025-12-31T00:00:00Z', tenant_id: null },
        ],
        current_page: 1, last_page: 1, total: 2, per_page: 20,
      }),
    },
    useAuth: jest.fn(() => ({
      user: { id: 'u1', name: 'Test', email: 'test@test.com' },
      token: 'test-token',
    })),
  };
});

describe('PromoCodeScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders promo codes list', async () => {
    const { getByText } = renderWithNavigation(
      <PromoCodeScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getByText('SAVE20')).toBeTruthy();
      expect(getByText('RIDE50')).toBeTruthy();
    });
  });

  it('renders empty state', async () => {
    const { promoCodes } = require('@easyryde/shared');
    promoCodes.list.mockResolvedValueOnce({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 20 });
    const { getByText } = renderWithNavigation(
      <PromoCodeScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getByText('No active promotions right now')).toBeTruthy();
    });
  });
});
