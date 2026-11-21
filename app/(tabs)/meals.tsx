import { SafeAreaView } from 'react-native-safe-area-context';
import MealsHub from '@/features/mealsHub/MealsHub';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function MealsRoute() {
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton toHome /><MealsHub /></SafeAreaView>;
}
