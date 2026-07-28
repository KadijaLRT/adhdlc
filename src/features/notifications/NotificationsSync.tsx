import { useEffect } from 'react';
import { useAppStore, selectScheduleItems, selectTasks, selectIsHydrated, selectNotificationsEnabled } from '@/store/index';
import { syncScheduledNotifications } from '@/core/notifications/syncScheduledNotifications';

/**
 * Renders nothing — exists purely to keep the device's scheduled local
 * notifications in sync with app state, the same "derive a side effect
 * from store state in a useEffect" pattern already used for the workout
 * session draft autosave. Re-runs the full reconcile whenever schedule
 * items, tasks (for motivator-tagged copy), or the on/off setting
 * change. Gated on isHydrated so it never runs against default/empty
 * pre-hydration state and wipes a real schedule for a moment.
 */
export default function NotificationsSync() {
  const scheduleItems = useAppStore(selectScheduleItems);
  const tasks = useAppStore(selectTasks);
  const notificationsEnabled = useAppStore(selectNotificationsEnabled);
  const isHydrated = useAppStore(selectIsHydrated);

  useEffect(() => {
    if (!isHydrated) return;
    syncScheduledNotifications(scheduleItems, tasks, notificationsEnabled).catch((error) => {
      console.error('NotificationsSync: failed to sync scheduled notifications', error);
    });
  }, [isHydrated, scheduleItems, tasks, notificationsEnabled]);

  return null;
}
