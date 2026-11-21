import { SafeAreaView } from 'react-native-safe-area-context';
import WorkoutsHome from '@/features/workout/WorkoutsHome';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function WorkoutTabRoute() {
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton toHome /><WorkoutsHome /></SafeAreaView>;
}
