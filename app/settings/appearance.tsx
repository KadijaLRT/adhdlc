import { SafeAreaView } from 'react-native-safe-area-context';
import AppearanceScreen from '@/features/settings/AppearanceScreen';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function AppearanceRoute() {
  return <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton /><AppearanceScreen /></SafeAreaView>;
}
