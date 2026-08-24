import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EarningsScreen from '../screens/EarningsScreen';
import { drivers } from '@easyryde/shared';

describe('EarningsScreen', () => {
  const mockEarnings = drivers.earnings as jest.Mock;
  const mockTrips = drivers.trips as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEarnings.mockResolvedValue({
      today_earnings: 450,
      week_earnings: 2800,
      month_earnings: 12000,
      total_earnings: 56000,
      total_trips: 245,
      rating: 4.8,
      hours_online: 6.5,
      pending_payout: 1200,
      recent_transactions: [],
    });
    mockTrips.mockResolvedValue({
      data: [
        {
          id: 'trip-1',
          pickup_address: '123 Main St',
          dropoff_address: '456 Oak Ave',
          total_fare: 85,
          distance_km: 5.2,
          created_at: '2025-01-15T10:30:00Z',
        },
      ],
    });
  });

  it('renders earnings header', async () => {
    const { getByText } = render(<EarningsScreen />);
    expect(getByText('Earnings')).toBeTruthy();
    expect(getByText('Track your income in Phalaborwa')).toBeTruthy();
  });

  it('loads earnings data on mount', async () => {
    render(<EarningsScreen />);
    await waitFor(() => {
      expect(mockEarnings).toHaveBeenCalled();
    });
  });

  it('displays period toggle buttons', () => {
    const { getAllByText, getByText } = render(<EarningsScreen />);
    expect(getAllByText('Today').length).toBeGreaterThanOrEqual(1);
    expect(getByText('This Week')).toBeTruthy();
    expect(getByText('This Month')).toBeTruthy();
  });

  it('switches to Today period', async () => {
    const { getAllByText, getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByText('Today')[1]);
    });
    await waitFor(() => {
      expect(getByText("Today's Earnings")).toBeTruthy();
    });
  });

  it('switches to This Month period', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      fireEvent.press(getByText('This Month'));
    });
    await waitFor(() => {
      expect(getByText('Monthly Earnings')).toBeTruthy();
    });
  });

  it('defaults to week period', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(getByText('Weekly Earnings')).toBeTruthy();
    });
  });

  it('displays weekly breakdown section', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(getByText('WEEKLY BREAKDOWN')).toBeTruthy();
    });
  });

  it('displays earnings breakdown section', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(getByText('EARNINGS BREAKDOWN')).toBeTruthy();
      expect(getByText('Trip Fares')).toBeTruthy();
      expect(getByText('Tips')).toBeTruthy();
      expect(getByText('Promotions')).toBeTruthy();
    });
  });

  it('shows pending payout when available', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(getByText('Pending Payout')).toBeTruthy();
      expect(getByText('R1200')).toBeTruthy();
    });
  });

  it('hides pending payout when zero', async () => {
    mockEarnings.mockResolvedValueOnce({
      today_earnings: 450,
      week_earnings: 2800,
      month_earnings: 12000,
      total_earnings: 56000,
      pending_payout: 0,
    });
    const { queryByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(queryByText('Pending Payout')).toBeNull();
    });
  });

  it('displays cash out button', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(getByText(/Cash Out/)).toBeTruthy();
    });
  });

  it('shows recent rides section when trips are loaded', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(getByText('RECENT TRANSACTIONS')).toBeTruthy();
    });
  });

  it('renders recent trip data', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(getByText('123 Main St')).toBeTruthy();
      expect(getByText('456 Oak Ave')).toBeTruthy();
    });
  });

  it('shows week total in header', async () => {
    const { getByText } = render(<EarningsScreen />);
    await waitFor(() => {
      expect(getByText('THIS WEEK')).toBeTruthy();
    });
  });
});
