import { SafeAreaView } from 'react-native-safe-area-context';
import TodayHub from '@/features/today/TodayHub';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function TodayRoute() {
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton toHome /><TodayHub /></SafeAreaView>;
}
