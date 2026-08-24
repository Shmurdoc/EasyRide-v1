import React from 'react';
import { waitFor } from '@testing-library/react-native';
import RideHistoryScreen from '../screens/RideHistoryScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    rides: {
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'r1', status: 'completed', category: 'economy',
            pickup_address: '45 Selati Road', dropoff_address: 'Mall of the North',
            total_fare: 145, distance_km: 8.2, duration_minutes: 15,
            payment_method: 'cash', discount_amount: 0, surge_multiplier: 1,
            driver_id: 'd1', driver_eta: null, route_polyline: null,
            driver: { id: 'd1', name: 'John Driver', average_rating: 4.9, total_trips: 234, vehicle: { make: 'Toyota', model: 'Corolla', color: 'White' } },
            completed_at: '2025-01-10T10:00:00Z', cancelled_by: null, cancellation_reason: null,
            created_at: '2025-01-10T09:45:00Z', updated_at: '2025-01-10T10:00:00Z',
            tenant_id: 't1', rider_id: 'r1',
            pickup_latitude: -23.94, pickup_longitude: 31.08,
            dropoff_latitude: -23.88, dropoff_longitude: 31.08,
            base_fare: 35, per_km_fare: 12,
          },
        ],
        current_page: 1, last_page: 1, total: 1, per_page: 20,
      }),
    },
    useAuth: jest.fn(() => ({
      user: { id: 'u1', name: 'Test Rider', email: 'rider@easyryde.com' },
      token: 'test-token',
    })),
  };
});

describe('RideHistoryScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders ride history', async () => {
    const { getByText } = renderWithNavigation(
      <RideHistoryScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getByText('45 Selati Road')).toBeTruthy();
    });
  });

  it('renders empty state', async () => {
    const { rides } = require('@easyryde/shared');
    rides.list.mockResolvedValueOnce({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 20 });
    const { getByText } = renderWithNavigation(
      <RideHistoryScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getByText(/No rides/)).toBeTruthy();
    });
  });
});
