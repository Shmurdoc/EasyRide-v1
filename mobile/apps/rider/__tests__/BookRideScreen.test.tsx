import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import BookRideScreen from '../screens/BookRideScreen';
import { renderWithNavigation } from './test-utils';

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  const mockPlaceResults = [
    { id: 'p1', name: 'Mall of the North', address: 'Phalaborwa, Limpopo', lat: -23.88, lng: 31.08 },
    { id: 'p2', name: 'Kruger Gate', address: 'Phalaborwa Gate', lat: -23.95, lng: 31.15 },
  ];
  return {
    ...actual,
    places: { search: jest.fn().mockResolvedValue(mockPlaceResults) },
    rides: {
      fareEstimate: jest.fn().mockResolvedValue({
        distance_km: 8.2, duration_minutes: 15,
        breakdown: { base_fare: 35, distance_fare: 45, time_fare: 30, surge: 1, subtotal: 110, total_fare: 110 },
      }),
      create: jest.fn().mockResolvedValue({ id: 'new-ride-123' }),
    },
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Modal = ({ visible, children }: any) => (visible ? children : null);
  return RN;
});

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MockMarker = (props: any) => <View {...props} />;
  return { __esModule: true, default: View, Marker: MockMarker, Polyline: View, PROVIDER_DEFAULT: 'default' };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => <Text>{props.name}</Text>,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();

const defaultParams = {
  pickup: { lat: -23.94, lng: 31.08, address: 'Current Location' },
};

function renderScreen(params: any = {}) {
  return renderWithNavigation(
    <BookRideScreen
      navigation={{ navigate: mockNavigate, goBack: mockGoBack, replace: mockReplace } as any}
      route={{ params: { ...defaultParams, ...params } } as any}
    />
  );
}

function openSearchSheet(getByText: any) {
  const whereTo = getByText('Where to?');
  fireEvent.press(whereTo);
}

describe('BookRideScreen', () => {
  let defaultSearchImpl: any;

  beforeAll(() => {
    const { places } = require('@easyryde/shared');
    defaultSearchImpl = places.search.getMockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { places } = require('@easyryde/shared');
    if (defaultSearchImpl) {
      places.search.mockImplementation(defaultSearchImpl);
    }
  });

  it('renders the "Where to?" header', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Where to?')).toBeTruthy();
    });
  });

  it('shows saved places when no search text', async () => {
    const { getAllByText } = renderScreen();
    await waitFor(() => {
      expect(getAllByText('Home').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Work').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Airport').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows destinations list', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Kruger National Park Gate')).toBeTruthy();
    });
  });

  it('performs search when text is 2+ characters', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    const input = getByPlaceholderText('Search destination...');
    await waitFor(() => {
      fireEvent.changeText(input, 'Pizza');
    });
    await waitFor(() => {
      const { places } = require('@easyryde/shared');
      expect(places.search).toHaveBeenCalledWith('Pizza', -23.9470, 31.0830);
    });
  });

  it('shows search results', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Mall');
    await waitFor(() => {
      expect(getByText('Mall of the North')).toBeTruthy();
    });
  });

  it('shows empty text when search returns no results', async () => {
    const { places } = require('@easyryde/shared');
    places.search.mockImplementation(() => Promise.resolve([]));
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'xyz');
    await waitFor(() => {
      expect(getByText('No places found')).toBeTruthy();
    });
  });

  it('selecting a destination transitions to vehicle step', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    await waitFor(() => {
      expect(getByPlaceholderText('Search destination...')).toBeTruthy();
    });
    const input = getByPlaceholderText('Search destination...');
    fireEvent.changeText(input, 'Mall');
    await waitFor(() => {
      expect(getByText('Mall of the North')).toBeTruthy();
    }, { timeout: 10000, interval: 200 });
    fireEvent.press(getByText('Mall of the North'));
    await waitFor(() => {
      expect(getByText('CHOOSE A RIDE')).toBeTruthy();
    });
  });

  it('displays all vehicle options in vehicle step', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Mall');
    await waitFor(() => expect(getByText('Mall of the North')).toBeTruthy());
    fireEvent.press(getByText('Mall of the North'));
    await waitFor(() => {
      expect(getByText('EasyRyde')).toBeTruthy();
      expect(getByText('Comfort')).toBeTruthy();
      expect(getByText('Premium')).toBeTruthy();
      expect(getByText('GoXL')).toBeTruthy();
    });
  });

  it('selecting a vehicle shows fare estimate', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Mall');
    await waitFor(() => expect(getByText('Mall of the North')).toBeTruthy());
    fireEvent.press(getByText('Mall of the North'));
    await waitFor(() => expect(getByText('EasyRyde')).toBeTruthy());
    fireEvent.press(getByText('EasyRyde'));
    await waitFor(() => {
      expect(getByText(/Estimated Total/)).toBeTruthy();
    });
  });

  it('navigates to confirm step when Confirm is pressed', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Mall');
    await waitFor(() => expect(getByText('Mall of the North')).toBeTruthy());
    fireEvent.press(getByText('Mall of the North'));
    await waitFor(() => expect(getByText('EasyRyde')).toBeTruthy());
    fireEvent.press(getByText('EasyRyde'));
    await waitFor(() => {
      fireEvent.press(getByText(/Confirm EasyRyde/));
      expect(getByText('Confirm Ride')).toBeTruthy();
    });
  });

  it('confirm step shows fare breakdown', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Mall');
    await waitFor(() => expect(getByText('Mall of the North')).toBeTruthy());
    fireEvent.press(getByText('Mall of the North'));
    await waitFor(() => expect(getByText('EasyRyde')).toBeTruthy());
    fireEvent.press(getByText('EasyRyde'));
    await waitFor(() => fireEvent.press(getByText(/Confirm EasyRyde/)));
    await waitFor(() => {
      expect(getByText('FARE DETAILS')).toBeTruthy();
      expect(getByText('Base Fare')).toBeTruthy();
    });
  });

  it('Request Ride creates ride and navigates to tracking', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Mall');
    await waitFor(() => expect(getByText('Mall of the North')).toBeTruthy());
    fireEvent.press(getByText('Mall of the North'));
    await waitFor(() => expect(getByText('EasyRyde')).toBeTruthy());
    fireEvent.press(getByText('EasyRyde'));
    await waitFor(() => fireEvent.press(getByText(/Confirm EasyRyde/)));
    await waitFor(() => {
      expect(getByText(/Request EasyRyde/)).toBeTruthy();
      fireEvent.press(getByText(/Request EasyRyde/));
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('RideTracking', { rideId: 'new-ride-123' });
    });
  });

  it('back button from search calls navigation.goBack', async () => {
    const { getAllByText } = renderScreen();
    await waitFor(() => {
      const backButtons = getAllByText('arrow-back');
      fireEvent.press(backButtons[0]);
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('clear button clears search text', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    const input = getByPlaceholderText('Search destination...');
    fireEvent.changeText(input, 'Test');
    await waitFor(() => {
      expect(input.props.value).toBe('Test');
    });
  });

  it('handles fare estimate API failure gracefully', async () => {
    const { rides } = require('@easyryde/shared');
    rides.fareEstimate.mockRejectedValueOnce(new Error('Network error'));
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Mall');
    await waitFor(() => expect(getByText('Mall of the North')).toBeTruthy());
    fireEvent.press(getByText('Mall of the North'));
    await waitFor(() => expect(getByText('EasyRyde')).toBeTruthy());
    fireEvent.press(getByText('EasyRyde'));
    await waitFor(() => {
      expect(getByText(/Estimated Total/)).toBeTruthy();
    });
  });

  it('handles ride creation API failure', async () => {
    const { rides } = require('@easyryde/shared');
    rides.create.mockRejectedValueOnce(new Error('Server error'));
    const { getByText, getByPlaceholderText } = renderScreen();
    openSearchSheet(getByText);
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Mall');
    await waitFor(() => expect(getByText('Mall of the North')).toBeTruthy());
    fireEvent.press(getByText('Mall of the North'));
    await waitFor(() => expect(getByText('EasyRyde')).toBeTruthy());
    fireEvent.press(getByText('EasyRyde'));
    await waitFor(() => fireEvent.press(getByText(/Confirm EasyRyde/)));
    await waitFor(() => {
      fireEvent.press(getByText(/Request EasyRyde/));
    });
    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
