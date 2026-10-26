// The phone app has no notification module yet (no expo-notifications), so it reports unsupported.

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported' | 'insecure';

export function notificationStatus(): NotificationStatus {
  return 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  return 'unsupported';
}

export function watchNotificationStatus(_onChange: () => void) {
  return () => {};
}
