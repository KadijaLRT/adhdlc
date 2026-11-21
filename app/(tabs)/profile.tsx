import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileScreen from '@/features/profile/ProfileScreen';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function ProfileRoute() {
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton toHome /><ProfileScreen /></SafeAreaView>;
}
