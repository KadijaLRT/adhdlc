import { SafeAreaView } from 'react-native-safe-area-context';
import ProgressHub from '@/features/progress/ProgressHub';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function ProgressTabRoute() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton toHome />
      <ProgressHub />
    </SafeAreaView>
  );
}
