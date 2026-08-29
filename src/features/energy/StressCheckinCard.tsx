import { View, Text, Pressable } from 'react-native';
import { useAppStore, selectStressLogs, type EnergyLevel } from '@/store/index';

const STRESS_OPTIONS: { level: EnergyLevel; label: string; emoji: string }[] = [
  { level: 'low', label: 'Calm', emoji: '😌' }, { level: 'medium', label: 'Okay', emoji: '😐' }, { level: 'high', label: 'Stressed', emoji: '😣' },
];

/**
 * Bug fix companion to DayRhythmCard: the Home screen's "Calm" ring
 * (ExecutiveFunctionRings.tsx) has always read from stressLogs, but no
 * screen in the app ever called logStressForToday — so Calm was
 * permanently stuck at a hardcoded 70% for every user. This card is
 * the missing input, styled to match the energy check-in right above
 * it.
 */
export default function StressCheckinCard() {
  const stressLogs = useAppStore(selectStressLogs);
  const logStressForToday = useAppStore((s) => s.logStressForToday);

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const todaysStress = (stressLogs || []).find((l) => l.date === today);

  return (
    <View className="bg-white rounded-2xl p-5 w-full dark:bg-slate-900">
      <Text className="text-slate-900 text-base font-semibold mb-1 dark:text-slate-100">How stressed are you feeling?</Text>
      <Text className="text-slate-500 text-xs mb-4">This feeds your Calm score above. You can change it anytime.</Text>
      <View className="flex-row gap-2">
        {(STRESS_OPTIONS || []).map((option) => {
          const isActive = todaysStress?.stressLevel === option.level;
          return (
            <Pressable key={option.level} onPress={() => logStressForToday(option.level)}
              className={isActive ? 'flex-1 bg-indigo-600/20 border-2 border-indigo-400 rounded-xl py-3 items-center' : 'flex-1 bg-stone-100 border-2 border-transparent rounded-xl py-3 items-center active:border-stone-300'}>
              <Text className="text-xl mb-1">{option.emoji}</Text>
              <Text className={isActive ? 'text-indigo-700 text-sm font-medium' : 'text-slate-700 text-sm font-medium'}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
