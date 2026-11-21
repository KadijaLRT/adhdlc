import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '@/features/home/HomeScreen';

export default function HomeRoute() {
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-stone-50 dark:bg-slate-950"><HomeScreen /></SafeAreaView>;
}
