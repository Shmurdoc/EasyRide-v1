export const mockUser = {
  id: 'u1',
  name: 'Test Rider',
  email: 'rider@easyryde.com',
  avatar_url: null,
  total_trips: 12,
  average_rating: 4.8,
  created_at: '2024-01-15T00:00:00Z',
};

export const mockRide = {
  id: 'ride-123',
  status: 'in_progress',
  category: 'economy',
  pickup_address: '45 Selati Road, Phalaborwa',
  dropoff_address: 'Mall of the North',
  pickup_latitude: -23.94,
  pickup_longitude: 31.08,
  dropoff_latitude: -23.88,
  dropoff_longitude: 31.08,
  base_fare: 35,
  distance_km: 8.2,
  duration_minutes: 15,
  per_km_fare: 12,
  total_fare: 145,
  payment_method: 'cash',
  discount_amount: 0,
  route_polyline: null,
  driver_id: 'd1',
  driver_eta: 3,
  driver: {
    id: 'd1',
    name: 'John Driver',
    phone_number: '+27123456789',
    average_rating: 4.9,
    total_trips: 234,
    vehicle: { make: 'Toyota', model: 'Corolla', color: 'White' },
  },
  completed_at: null,
  cancelled_by: null,
  cancellation_reason: null,
};

export const mockRestaurant = {
  id: 'rest-1',
  name: 'Pizza Palace',
  cuisine_type: 'Italian',
  rating: 4.5,
  estimated_delivery_minutes: 30,
  delivery_fee: 15,
  categories: [
    {
      id: 'cat-1',
      name: 'Pizzas',
      items: [
        {
          id: 'item-1',
          name: 'Margherita',
          description: 'Classic tomato and mozzarella',
          price: 89,
          is_vegetarian: true,
          is_vegan: false,
          spice_level: 0,
        },
        {
          id: 'item-2',
          name: 'Pepperoni',
          description: 'Spicy pepperoni with cheese',
          price: 109,
          is_vegetarian: false,
          is_vegan: false,
          spice_level: 2,
        },
      ],
    },
  ],
};

export const mockTransactions = [
  {
    id: 'tx-1',
    type: 'credit',
    amount: 100,
    description: 'Wallet top-up',
    timestamp: '10 Jan 2025, 10:00',
    status: 'completed',
  },
  {
    id: 'tx-2',
    type: 'debit',
    amount: 45,
    description: 'Ride to Mall',
    timestamp: '12 Jan 2025, 14:30',
    status: 'completed',
  },
];

export const mockPlaceResults = [
  { id: 'p1', name: 'Mall of the North', address: 'Phalaborwa, Limpopo', lat: -23.88, lng: 31.08 },
  { id: 'p2', name: 'Kruger Gate', address: 'Phalaborwa Gate', lat: -23.95, lng: 31.15 },
];
