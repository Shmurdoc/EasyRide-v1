import React from 'react';
import { waitFor } from '@testing-library/react-native';
import FoodOrderDetailScreen from '../screens/FoodOrderDetailScreen';
import { renderWithNavigation } from './test-utils';

describe('FoodOrderDetailScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders order details', async () => {
    const { getByText } = renderWithNavigation(
      <FoodOrderDetailScreen route={{ params: { orderId: 'order-123' } } as any} />
    );
    await waitFor(() => {
      expect(getByText('Test Restaurant')).toBeTruthy();
    });
  });
});
