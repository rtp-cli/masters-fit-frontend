import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerPushToken } from './workouts';
import { getCurrentUser } from './auth';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permissions for push notifications
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for notifications');
    return false;
  }

  return true;
}

/**
 * Get the push notification token and register it with the backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get the token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    console.log('Expo push token:', token);

    // Register token with backend
    const user = await getCurrentUser();
    if (user) {
      const result = await registerPushToken(user.id, token);
      if (result?.success) {
        console.log('Push token registered successfully');
        return token;
      } else {
        console.error('Failed to register push token with backend');
      }
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Handle notification received while app is in foreground
 */
export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Handle notification response (when user taps notification)
 */
export function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  seconds: number = 1
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: {
      seconds,
    },
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get notification categories for enhanced notifications
 */
export function getNotificationCategories(): Notifications.NotificationCategory[] {
  return [
    {
      identifier: 'workout_completion',
      actions: [
        {
          identifier: 'view_workout',
          buttonTitle: 'View Workout',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            opensAppToForeground: false,
          },
        },
      ],
    },
    {
      identifier: 'workout_reminder',
      actions: [
        {
          identifier: 'start_workout',
          buttonTitle: 'Start Workout',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Remind Later',
          options: {
            opensAppToForeground: false,
          },
        },
      ],
    },
  ];
}

/**
 * Set up notification categories
 */
export async function setupNotificationCategories(): Promise<void> {
  const categories = getNotificationCategories();
  await Notifications.setNotificationCategoriesAsync(categories);
}

/**
 * Handle deep linking from notifications
 */
export function handleNotificationDeepLink(data: any): string | null {
  if (data?.type === 'workout_completed' && data?.workoutId) {
    return `/workout/${data.workoutId}`;
  }
  
  if (data?.type === 'workout_regenerated' && data?.workoutId) {
    return `/workout/${data.workoutId}`;
  }
  
  if (data?.type === 'daily_regenerated') {
    return '/dashboard'; // Navigate to dashboard to see updated workout
  }
  
  if (data?.type === 'workout_reminder') {
    return '/dashboard';
  }

  return null;
}