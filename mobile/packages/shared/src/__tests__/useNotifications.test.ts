jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeNotificationSubscription: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'expo-push-token' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('../api/client', () => ({
  api: {
    post: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: { alert: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useNotifications, setRideRequestNotificationHandler, scheduleLocalNotification } from '../hooks/useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets up notification handler on mount', () => {
    const Notifications = require('expo-notifications');
    renderHook(() => useNotifications());
    expect(Notifications.setNotificationHandler).toHaveBeenCalled();
  });

  it('registers for push notifications', async () => {
    renderHook(() => useNotifications());
    const Notifications = require('expo-notifications');
    await new Promise(process.nextTick);
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
  });

  it('sets up Android notification channel', () => {
    const Notifications = require('expo-notifications');
    renderHook(() => useNotifications());
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'easyryde_default',
      expect.objectContaining({ name: 'EasyRyde' })
    );
  });

  it('adds foreground listener', () => {
    const Notifications = require('expo-notifications');
    renderHook(() => useNotifications());
    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
  });

  it('adds background response listener', () => {
    const Notifications = require('expo-notifications');
    renderHook(() => useNotifications());
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
  });

  it('retryTokenRegistration requests push token', async () => {
    const { result } = renderHook(() => useNotifications());
    const Notifications = require('expo-notifications');
    Notifications.getExpoPushTokenAsync.mockClear();
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'new-token' });

    await act(async () => {
      await result.current.retryTokenRegistration();
    });
  });

  it('ride request notification suppresses alert', () => {
    const Notifications = require('expo-notifications');
    renderHook(() => useNotifications());

    const handlerCall = Notifications.setNotificationHandler.mock.calls[0][0];
    expect(handlerCall.handleNotification).toBeInstanceOf(Function);

    const rideRequestNotif = {
      request: { content: { data: { type: 'ride:request' } } },
    };
    const result = handlerCall.handleNotification(rideRequestNotif);
    expect(result.shouldShowAlert).toBe(false);
    expect(result.shouldPlaySound).toBe(true);
  });

  it('normal notification shows alert', () => {
    const Notifications = require('expo-notifications');
    renderHook(() => useNotifications());

    const handlerCall = Notifications.setNotificationHandler.mock.calls[0][0];
    const normalNotif = {
      request: { content: { data: { type: 'payment:receipt' } } },
    };
    const result = handlerCall.handleNotification(normalNotif);
    expect(result.shouldShowAlert).toBe(true);
  });

  it('setRideRequestNotificationHandler registers callback', () => {
    const handler = jest.fn();
    setRideRequestNotificationHandler(handler);
    expect(handler).toBeInstanceOf(Function);
  });

  it('scheduleLocalNotification schedules notification', async () => {
    await scheduleLocalNotification('Test Title', 'Test Body', { key: 'value' });
    const Notifications = require('expo-notifications');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Test Title', body: 'Test Body', data: { key: 'value' }, sound: true },
      trigger: null,
    });
  });

  it('cleans up listeners on unmount', () => {
    const Notifications = require('expo-notifications');
    const { unmount } = renderHook(() => useNotifications());
    unmount();
    expect(Notifications.removeNotificationSubscription).toHaveBeenCalled();
  });
});
