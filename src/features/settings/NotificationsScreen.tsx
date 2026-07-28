import { useEffect, useState } from 'react';
import { View, Text, Switch, Platform } from 'react-native';
import { useAppStore, selectNotificationsEnabled } from '@/store/index';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '@/core/notifications/notificationService';

export default function NotificationsScreen() {
  const notificationsEnabled = useAppStore(selectNotificationsEnabled);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionState>('undetermined');
  const [checkingPermission, setCheckingPermission] = useState(true);

  useEffect(() => {
    getNotificationPermissionStatus()
      .then(setPermissionStatus)
      .finally(() => setCheckingPermission(false));
  }, []);

  const handleToggle = async (next: boolean) => {
    if (!next) {
      await setNotificationsEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    await setNotificationsEnabled(granted);
  };

  return (
    <View className="gap-4">
      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">🔔 Reminders</Text>
          <Text className="text-slate-500 text-xs leading-5">
            Notifies you for anything with a specific time — medication, scheduled tasks, and other reminders. Nothing with no time set ("Anytime today") sends a notification.
          </Text>
        </View>
        <Switch value={notificationsEnabled && permissionStatus === 'granted'} onValueChange={handleToggle} disabled={checkingPermission} />
      </View>

      {notificationsEnabled && permissionStatus === 'denied' && (
        <View className="bg-amber-400/10 border-2 border-amber-400 rounded-2xl p-4">
          <Text className="text-amber-700 dark:text-amber-400 text-xs leading-5">
            Notifications are blocked at the system level, so nothing can be scheduled right now. You can re-enable them in your device or browser's notification settings, then turn this back on.
          </Text>
        </View>
      )}

      <View className="bg-stone-100 dark:bg-slate-800 rounded-2xl p-4">
        <Text className="text-slate-500 text-xs leading-5">
          {Platform.OS === 'web'
            ? "On web, these are local to this browser tab — they only fire while this app has been open recently, not if the tab or installed app has been fully closed for a while. On iOS/Android they fire even when the app is closed."
            : 'These are scheduled entirely on your device — no account or internet connection needed for them to fire.'}
        </Text>
      </View>
    </View>
  );
}
