import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Local (on-device) scheduled notifications only — no backend, no push
 * server, works fully offline. That has one real platform difference
 * worth being explicit about:
 *
 * - iOS/Android: expo-notifications hands the scheduled time to the OS
 *   itself, so it fires even if the app has been fully closed or the
 *   phone was restarted, as long as permission was granted.
 * - Web: browsers give no API to schedule a future notification and
 *   have it fire while the tab/PWA isn't running — expo-notifications'
 *   own scheduler is an unimplemented stub on web (it throws). The
 *   fallback here uses a plain in-memory `setTimeout` plus the
 *   browser's `Notification` API, which only fires if the tab or
 *   installed PWA is still open (or gets reopened before the trigger
 *   time) when the timer elapses. A closed tab loses the timer
 *   entirely — there is no way around that without a push server.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Only meaningful on web, and only for the lifetime of the current tab —
// there is nothing to persist here across reloads; syncScheduledNotifications
// re-derives and re-schedules everything fresh every time it runs anyway.
const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionState> {
  try {
    const result = await Notifications.getPermissionsAsync();
    if (result.granted) return 'granted';
    if (result.status === 'denied') return 'denied';
    return 'undetermined';
  } catch (error) {
    console.error('notificationService: failed to read permission status', error);
    return 'undetermined';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return !!requested.granted;
  } catch (error) {
    console.error('notificationService: permission request failed', error);
    return false;
  }
}

export interface ScheduledNotificationRequest {
  id: string;
  title: string;
  body: string;
  triggerDate: Date;
}

export async function scheduleLocalNotification(request: ScheduledNotificationRequest): Promise<void> {
  if (request.triggerDate.getTime() <= Date.now()) return; // never schedule for a moment already passed

  if (Platform.OS === 'web') {
    scheduleWebNotification(request);
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: request.id,
      content: { title: request.title, body: request.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: request.triggerDate },
    });
  } catch (error) {
    console.error('notificationService: failed to schedule notification', error);
  }
}

export interface DailyNotificationRequest {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

/**
 * For reminders with no specific date — medication reminders, most
 * notably, which onboarding creates as a time only, meant to repeat
 * every day indefinitely. On native this hands a true daily-repeat
 * trigger to the OS, so it keeps firing every day without the app ever
 * needing to reopen. Web has no equivalent OS-level facility, so it
 * schedules the next occurrence (today if still upcoming, otherwise
 * tomorrow) and, only while the tab remains open to see it fire,
 * re-arms itself for the following day — the same "keeps going only
 * while the tab is open" limitation as everything else on web here.
 */
export async function scheduleDailyLocalNotification(request: DailyNotificationRequest): Promise<void> {
  if (Platform.OS === 'web') {
    scheduleWebDailyNotification(request);
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: request.id,
      content: { title: request.title, body: request.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: request.hour, minute: request.minute },
    });
  } catch (error) {
    console.error('notificationService: failed to schedule daily notification', error);
  }
}

function nextOccurrence(hour: number, minute: number): Date {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next;
}

function scheduleWebDailyNotification(request: DailyNotificationRequest): void {
  const existingTimer = webTimers.get(request.id);
  if (existingTimer) clearTimeout(existingTimer);

  const triggerDate = nextOccurrence(request.hour, request.minute);
  const delayMs = triggerDate.getTime() - Date.now();
  if (delayMs > 2_147_483_647) return;

  const timer = setTimeout(() => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // eslint-disable-next-line no-new
        new Notification(request.title, { body: request.body });
      }
    } catch (error) {
      console.error('notificationService: failed to show web daily notification', error);
    }
    // Re-arm for the next day — only reachable if the tab was still open to run this callback at all.
    scheduleWebDailyNotification(request);
  }, Math.max(0, delayMs));

  webTimers.set(request.id, timer);
}

function scheduleWebNotification(request: ScheduledNotificationRequest): void {
  const existingTimer = webTimers.get(request.id);
  if (existingTimer) clearTimeout(existingTimer);

  const delayMs = request.triggerDate.getTime() - Date.now();
  // setTimeout silently overflows into an immediate fire past ~24.8 days
  // (its delay argument is a 32-bit int internally) — guarded explicitly
  // rather than letting a same-day reminder months out fire wrong.
  if (delayMs > 2_147_483_647) return;

  const timer = setTimeout(() => {
    webTimers.delete(request.id);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // eslint-disable-next-line no-new
        new Notification(request.title, { body: request.body });
      }
    } catch (error) {
      console.error('notificationService: failed to show web notification', error);
    }
  }, Math.max(0, delayMs));

  webTimers.set(request.id, timer);
}

export async function cancelLocalNotification(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    const existingTimer = webTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      webTimers.delete(id);
    }
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Cancelling something already fired or never scheduled isn't an error worth surfacing.
  }
}

export async function cancelAllLocalNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    webTimers.forEach((timer) => clearTimeout(timer));
    webTimers.clear();
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('notificationService: failed to cancel all notifications', error);
  }
}
