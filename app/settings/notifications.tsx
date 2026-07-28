import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationsScreen from '@/features/settings/NotificationsScreen';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function NotificationsSettingsRoute() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <View className="flex-1 p-4 w-full max-w-md self-center">
        <NotificationsScreen />
      </View>
    </SafeAreaView>
  );
}
