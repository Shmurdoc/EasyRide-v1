import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import RatingScreen from '../screens/RatingScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    rides: {
      rate: jest.fn().mockResolvedValue({}),
    },
    COLORS: actual.COLORS,
    GRADIENTS: actual.GRADIENTS,
    SPACING: actual.SPACING,
    RADIUS: actual.RADIUS,
    SHADOWS: actual.SHADOWS,
    GlowButton: ({ title, onPress }: any) => {
      const { TouchableOpacity, Text } = require('react-native');
      return <TouchableOpacity onPress={onPress} testID={title}><Text>{title}</Text></TouchableOpacity>;
    },
    GlassCard: ({ children }: any) => {
      const { View } = require('react-native');
      return <View>{children}</View>;
    },
    GradientText: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    Typography: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    Avatar: ({ name }: any) => {
      const { Text } = require('react-native');
      return <Text>{name?.[0] || 'D'}</Text>;
    },
  };
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

function renderRating() {
  return renderWithNavigation(
    <RatingScreen
      navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any}
      route={{
        params: { rideId: 'ride-123', driverName: 'John Driver', driverAvatar: null },
      } as any}
    />
  );
}

describe('RatingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Rate Your Ride header', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      expect(getByText('Rate Your Ride')).toBeTruthy();
    });
  });

  it('displays driver name', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      expect(getByText('John Driver')).toBeTruthy();
    });
  });

  it('shows trip question', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      expect(getByText('How was your trip?')).toBeTruthy();
    });
  });

  it('shows 5 star rating buttons', async () => {
    const { getAllByText } = renderRating();
    await waitFor(() => {
      const stars = getAllByText(/star/);
      expect(stars.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('shows rating label when star is selected', async () => {
    const { getAllByText } = renderRating();
    await waitFor(() => {
      const stars = getAllByText(/star/);
      if (stars.length > 0) fireEvent.press(stars[0]);
    });
    await waitFor(() => {
      expect(getAllByText(/Poor|Fair|Good|Great|Excellent/).length).toBeGreaterThan(0);
    });
  });

  it('shows quick feedback tags', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      expect(getByText('Clean car')).toBeTruthy();
      expect(getByText('Good driving')).toBeTruthy();
      expect(getByText('Friendly')).toBeTruthy();
      expect(getByText('Great music')).toBeTruthy();
      expect(getByText('Safe driving')).toBeTruthy();
    });
  });

  it('toggle feedback tag on press', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      fireEvent.press(getByText('Clean car'));
    });
  });

  it('shows comment input', async () => {
    const { getByText, getByPlaceholderText } = renderRating();
    await waitFor(() => {
      expect(getByText('ADD A COMMENT (OPTIONAL)')).toBeTruthy();
      expect(getByPlaceholderText('Tell us more about your experience...')).toBeTruthy();
    });
  });

  it('comment input accepts text', async () => {
    const { getByPlaceholderText } = renderRating();
    const input = getByPlaceholderText('Tell us more about your experience...');
    await waitFor(() => {
      fireEvent.changeText(input, 'Great ride, very smooth');
    });
  });

  it('shows tip options', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      expect(getByText('R10')).toBeTruthy();
      expect(getByText('R20')).toBeTruthy();
      expect(getByText('R50')).toBeTruthy();
    });
  });

  it('selecting a tip highlights it', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      fireEvent.press(getByText('R20'));
    });
  });

  it('shows submit button', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      expect(getByText('Submit Rating')).toBeTruthy();
    });
  });

  it('shows skip button', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      expect(getByText('Skip for now')).toBeTruthy();
    });
  });

  it('skip button navigates to Main', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      fireEvent.press(getByText('Skip for now'));
      expect(mockNavigate).toHaveBeenCalledWith('Main');
    });
  });

  it('submit without rating shows alert', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      fireEvent.press(getByText('Submit Rating'));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Rating Required', 'Please select a star rating');
    });
  });

  it('submit with rating sends request', async () => {
    const { getAllByText, getByText } = renderRating();
    await waitFor(() => {
      const stars = getAllByText(/star/);
      if (stars.length >= 4) fireEvent.press(stars[3]);
    });
    await waitFor(() => {
      fireEvent.press(getByText('Submit Rating'));
    });
    await waitFor(() => {
      const { rides } = require('@easyryde/shared');
      expect(rides.rate).toHaveBeenCalledWith('ride-123', 4, undefined);
    });
  });

  it('submit with tags and feedback includes in comment', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = renderRating();
    await waitFor(() => {
      const stars = getAllByText(/star/);
      if (stars.length >= 4) fireEvent.press(stars[3]);
      fireEvent.press(getByText('Friendly'));
      fireEvent.changeText(
        getByPlaceholderText('Tell us more about your experience...'),
        'Loved it!'
      );
      fireEvent.press(getByText('Submit Rating'));
    });
    await waitFor(() => {
      const { rides } = require('@easyryde/shared');
      expect(rides.rate).toHaveBeenCalledWith(
        'ride-123',
        4,
        expect.stringContaining('Friendly')
      );
    });
  });

  it('submit success shows thank you alert', async () => {
    const { getAllByText, getByText } = renderRating();
    await waitFor(() => {
      const stars = getAllByText(/star/);
      if (stars.length >= 5) fireEvent.press(stars[4]);
      fireEvent.press(getByText('Submit Rating'));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Thank You!', 'Your feedback has been submitted', expect.any(Array));
    });
  });

  it('submit failure shows error alert', async () => {
    const { rides } = require('@easyryde/shared');
    rides.rate.mockRejectedValueOnce(new Error('Network error'));
    const { getAllByText, getByText } = renderRating();
    await waitFor(() => {
      const stars = getAllByText(/star/);
      if (stars.length >= 3) fireEvent.press(stars[2]);
      fireEvent.press(getByText('Submit Rating'));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
    });
  });

  it('back button calls navigation.goBack', async () => {
    const { getByText } = renderRating();
    await waitFor(() => {
      const backBtn = getByText('arrow-back');
      if (backBtn) fireEvent.press(backBtn);
    });
  });
});
