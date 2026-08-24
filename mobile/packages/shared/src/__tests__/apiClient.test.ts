jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    default: {
      getItem: jest.fn(async (key: string) => store[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn(async (key: string) => { delete store[key]; }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiRemove: jest.fn(async (keys: string[]) => { keys.forEach(k => delete store[k]); }),
    },
  };
});

import { api, ApiError } from '../api/client';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  api.clearToken();
});

describe('ApiClient', () => {
  describe('setToken / clearToken', () => {
    it('stores token and retrieves it', async () => {
      api.setToken('test-token');
      const { api: api2 } = require('../api/client');
      // setToken persists to SecureStore
      const SecureStore = require('expo-secure-store');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'test-token');
    });

    it('clears token', () => {
      api.setToken('test-token');
      api.clearToken();
      const SecureStore = require('expo-secure-store');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('GET requests', () => {
    it('makes successful GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: 1 }], success: true }),
      });
      const result = await api.get('/rides');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('passes headers including Content-Type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {}, success: true }),
      });
      await api.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        })
      );
    });

    it('passes Authorization header when token set', async () => {
      api.setToken('my-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {}, success: true }),
      });
      await api.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        })
      );
    });

    it('throws ApiError on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });
      await expect(api.get('/rides')).rejects.toThrow('Unauthorized');
    });

    it('throws ApiError on failed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad request', success: false }),
      });
      await expect(api.get('/rides')).rejects.toThrow('Bad request');
    });

    it('handles envelope response with success:false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: false, message: 'Token expired', data: null }),
      });
      await expect(api.get('/rides')).rejects.toThrow('Token expired');
    });

    it('supports query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [], success: true }),
      });
      await api.get('/rides', { page: '1', per_page: '10' });
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('page=1');
      expect(url).toContain('per_page=10');
    });

    it('retries on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success', success: true }),
      });
      const result = await api.get('/retry-test');
      expect(result).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('POST requests', () => {
    it('sends body as JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { id: 1 }, success: true }),
      });
      await api.post('/rides', { category: 'economy' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'economy' }),
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('sends PUT method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {}, success: true }),
      });
      await api.put('/users/1', { name: 'New Name' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('PATCH requests', () => {
    it('sends PATCH method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {}, success: true }),
      });
      await api.patch('/rides/1', { status: 'completed' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('DELETE requests', () => {
    it('sends DELETE method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      });
      await api.delete('/rides/1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('204 response handler', () => {
    it('returns undefined for 204', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      });
      const result = await api.delete('/test');
      expect(result).toBeUndefined();
    });
  });

  describe('ApiError class', () => {
    it('creates error with message and status', () => {
      const error = new ApiError('Not found', 404, { id: 1 });
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ id: 1 });
    });
  });
});
