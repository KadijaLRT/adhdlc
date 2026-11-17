import { SafeAreaView } from 'react-native-safe-area-context';
import ProScreen from '@/features/pro/ProScreen';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function ProRoute() {
  return <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton /><ProScreen /></SafeAreaView>;
}
