// Browser notification permission. Nothing here sends a notification: Prexpire has no
// delivery system yet, so this only reports and requests the permission.

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported' | 'insecure';

export function notificationStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  const status = notificationStatus();
  if (status !== 'default') return status;
  try {
    // Older Safari only supports the callback form.
    const result = await new Promise<NotificationPermission>((resolve, reject) => {
      const p = Notification.requestPermission(resolve);
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    });
    return result;
  } catch {
    return notificationStatus();
  }
}

// Calls back when the permission may have changed outside the page (browser settings).
export function watchNotificationStatus(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('focus', onChange);
  document.addEventListener('visibilitychange', onChange);
  let status: PermissionStatus | null = null;
  navigator.permissions
    ?.query({ name: 'notifications' as PermissionName })
    .then((s) => {
      status = s;
      s.onchange = onChange;
    })
    .catch(() => {});
  return () => {
    window.removeEventListener('focus', onChange);
    document.removeEventListener('visibilitychange', onChange);
    if (status) status.onchange = null;
  };
}
