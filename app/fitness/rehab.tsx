import { SafeAreaView } from 'react-native-safe-area-context';
import RehabRoutineScreen from '@/features/workout/RehabRoutineScreen';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function RehabRoute() {
  return <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton /><RehabRoutineScreen /></SafeAreaView>;
}
