import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TripHistoryScreen from '../screens/TripHistoryScreen';
import { drivers } from '@easyryde/shared';

jest.spyOn(Alert, 'alert');

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setOptions: jest.fn() } as any;

describe('TripHistoryScreen', () => {
  const mockTrips = drivers.trips as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrips.mockResolvedValue({
      data: [
        {
          id: 'trip-1',
          pickup_address: '123 Main St',
          dropoff_address: '456 Oak Ave',
          total_fare: 85,
          distance_km: 5.2,
          duration_minutes: 15,
          status: 'completed',
          created_at: '2025-01-15T10:30:00Z',
          rider: { name: 'John Rider' },
        },
        {
          id: 'trip-2',
          pickup_address: '789 Pine Rd',
          dropoff_address: '321 Elm St',
          total_fare: 120,
          distance_km: 8.1,
          duration_minutes: 22,
          status: 'cancelled',
          created_at: '2025-01-14T14:00:00Z',
          rider: { name: 'Jane Rider' },
        },
      ],
    });
  });

  it('renders trip history header', async () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    expect(getByText('Trip History')).toBeTruthy();
  });

  it('loads trips on mount', async () => {
    render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    await waitFor(() => {
      expect(mockTrips).toHaveBeenCalledWith({ per_page: '50' });
    });
  });

  it('shows loading state initially', () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    expect(getByText('Loading trips...')).toBeTruthy();
  });

  it('displays trips after loading', async () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    await waitFor(() => {
      expect(getByText('123 Main St')).toBeTruthy();
      expect(getByText('456 Oak Ave')).toBeTruthy();
    });
  });

  it('shows trip count in header subtitle', async () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    await waitFor(() => {
      expect(getByText('2 trips completed')).toBeTruthy();
    });
  });

  it('displays trip fare', async () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    await waitFor(() => {
      expect(getByText('R 85')).toBeTruthy();
      expect(getByText('R 120')).toBeTruthy();
    });
  });

  it('displays trip status badges', async () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    await waitFor(() => {
      expect(getByText('completed')).toBeTruthy();
      expect(getByText('cancelled')).toBeTruthy();
    });
  });

  it('displays rider names', async () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    await waitFor(() => {
      expect(getByText('John Rider')).toBeTruthy();
      expect(getByText('Jane Rider')).toBeTruthy();
    });
  });

  it('shows trip details on press', async () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    await waitFor(() => {
      expect(getByText('123 Main St')).toBeTruthy();
    });

    await waitFor(() => {
      fireEvent.press(getByText('123 Main St'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Trip Details', expect.any(String));
    });
  });

  it('shows error state when trips fail to load', async () => {
    mockTrips.mockRejectedValueOnce(new Error('Network error'));
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);

    await waitFor(() => {
      expect(getByText('Failed to load trips')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  it('retries loading when retry button pressed', async () => {
    mockTrips.mockRejectedValueOnce(new Error('Network error'));
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);

    await waitFor(() => {
      expect(getByText('Retry')).toBeTruthy();
    });

    fireEvent.press(getByText('Retry'));

    await waitFor(() => {
      expect(mockTrips).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty state when no trips', async () => {
    mockTrips.mockResolvedValueOnce({ data: [] });
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);

    await waitFor(() => {
      expect(getByText('No trips yet')).toBeTruthy();
    });
  });

  it('displays trip dates', async () => {
    const { getByText } = render(<TripHistoryScreen {...({ navigation: mockNavigation } as any)} />);
    await waitFor(() => {
      expect(getByText(/15/)).toBeTruthy();
    });
  });
});
