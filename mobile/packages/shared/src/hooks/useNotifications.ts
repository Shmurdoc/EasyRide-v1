import { useEffect, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from '../api/client';

type NavigationRef = { current: { navigate: (name: string, params?: any) => void } | null };

let _rideRequestCallback: ((data: any) => void) | null = null;

export function setRideRequestNotificationHandler(handler: (data: any) => void) {
  _rideRequestCallback = handler;
}

export function useNotifications(navigationRef?: NavigationRef) {
  const responseListener = useRef<any>();
  const backgroundListener = useRef<any>();
  const foregroundListener = useRef<any>();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        if (data?.type === 'ride:request') {
          return {
            shouldShowAlert: false,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: false,
          };
        }
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('easyryde_default', {
        name: 'EasyRyde',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFAD7A',
      }).catch(() => {});
    }

    foregroundListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'ride:request' && _rideRequestCallback) {
        _rideRequestCallback(data);
      }
    });

    backgroundListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'ride:request' && _rideRequestCallback) {
        _rideRequestCallback(data);
        return;
      }
      if (data?.rideId && navigationRef?.current) {
        navigationRef.current.navigate('RideTracking', { rideId: data.rideId });
      }
    });

    registerForPushNotificationsAsync()
      .then((token) => { tokenRef.current = token; })
      .catch(() => {});

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (backgroundListener.current) {
        Notifications.removeNotificationSubscription(backgroundListener.current);
      }
      if (foregroundListener.current) {
        Notifications.removeNotificationSubscription(foregroundListener.current);
      }
    };
  }, []);

  const retryTokenRegistration = useCallback(async () => {
    if (!tokenRef.current) {
      const token = await registerForPushNotificationsAsync();
      tokenRef.current = token;
    }
  }, []);

  return { retryTokenRegistration };
}

async function registerForPushNotificationsAsync(maxRetries = 3): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (!Device.isDevice) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();

    for (let i = 0; i < maxRetries; i++) {
      try {
        await api.post('/notifications/register-token', { token: tokenData.data });
        return tokenData.data;
      } catch {
        if (i < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }
    }
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
}
