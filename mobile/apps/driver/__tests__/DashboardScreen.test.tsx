import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DashboardScreen from '../screens/DashboardScreen';
import { useAuth, useSocket, drivers } from '@easyryde/shared';

jest.spyOn(Alert, 'alert');

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() } as any;

describe('DashboardScreen', () => {
  const mockEmit = jest.fn();
  const mockOn = jest.fn().mockReturnValue(jest.fn());
  const mockToggleOnline = drivers.toggleOnline as jest.Mock;
  const mockEarnings = drivers.earnings as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEarnings.mockResolvedValue({
      today_earnings: 450,
      week_earnings: 2800,
      month_earnings: 12000,
      total_earnings: 56000,
      total_trips: 12,
      rating: 4.8,
      hours_online: 6.5,
      pending_payout: 0,
      recent_transactions: [],
    });
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      emit: mockEmit,
      on: mockOn,
      socket: { on: jest.fn(), off: jest.fn() },
    });
  });

  it('renders dashboard with greeting and driver name', async () => {
    const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(getByText(/Good/)).toBeTruthy();
    expect(getByText('Test Driver')).toBeTruthy();
  });

  it('renders today earnings card', async () => {
    const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(getByText("TODAY'S EARNINGS")).toBeTruthy();
  });

  it('renders online toggle', () => {
    const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(getByText('Go Online')).toBeTruthy();
    expect(getByText('Offline')).toBeTruthy();
  });

  it('shows offline state initially', () => {
    const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(getByText('Go Online')).toBeTruthy();
  });

  it('toggles to online when button pressed', async () => {
    mockToggleOnline.mockResolvedValueOnce({ is_online: true });
    const { getByTestId } = render(<DashboardScreen navigation={mockNavigation} />);

    await act(async () => {
      fireEvent.press(getByTestId('toggleOnline'));
    });

    await waitFor(() => {
      expect(mockToggleOnline).toHaveBeenCalledWith(true);
    });
  });

  it('shows error alert when toggle online fails', async () => {
    mockToggleOnline.mockRejectedValueOnce(new Error('Server error'));
    const { getByTestId } = render(<DashboardScreen navigation={mockNavigation} />);

    await act(async () => {
      fireEvent.press(getByTestId('toggleOnline'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Server error');
    });
  });

  it('displays quick stats cards', () => {
    const { getAllByText } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(getAllByText('Acceptance').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Cancellation').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Rating').length).toBeGreaterThanOrEqual(2);
  });

  it('displays vehicle info card', () => {
    const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(getByText('VEHICLE')).toBeTruthy();
    expect(getByText('Toyota Corolla')).toBeTruthy();
    expect(getByText('White - ABC 123 GP - 2023')).toBeTruthy();
  });

  it('displays verified badge on vehicle', () => {
    const { getByText } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(getByText('Verified')).toBeTruthy();
  });

  it('loads earnings on mount', async () => {
    render(<DashboardScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(mockEarnings).toHaveBeenCalled();
    });
  });

  it('renders pull-to-refresh', () => {
    const queries = render(<DashboardScreen navigation={mockNavigation} />);
    expect(queries).toBeTruthy();
  });

  it('does not show zone card when offline', () => {
    const { queryByText } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(queryByText('CURRENT ZONE')).toBeNull();
  });

  it('shows zone card when online', async () => {
    mockToggleOnline.mockResolvedValueOnce({ is_online: true });
    const { getByTestId, findByText } = render(<DashboardScreen navigation={mockNavigation} />);

    await act(async () => {
      fireEvent.press(getByTestId('toggleOnline'));
    });

    expect(await findByText('CURRENT ZONE')).toBeTruthy();
  });
});
