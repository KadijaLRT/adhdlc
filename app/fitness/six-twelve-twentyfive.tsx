import { SafeAreaView } from 'react-native-safe-area-context';
import SixTwelveTwentyFiveScreen from '@/features/workout/SixTwelveTwentyFiveScreen';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function SixTwelveTwentyFiveRoute() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <SixTwelveTwentyFiveScreen />
    </SafeAreaView>
  );
}
