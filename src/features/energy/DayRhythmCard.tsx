import { View, Text, Pressable } from 'react-native';
import { useAppStore, selectEnergyLevel, type EnergyLevel } from '@/store/index';

const ENERGY_OPTIONS: { level: EnergyLevel; label: string; emoji: string }[] = [
  { level: 'low', label: 'Low', emoji: '🌙' }, { level: 'medium', label: 'Medium', emoji: '⛅️' }, { level: 'high', label: 'High', emoji: '☀️' },
];

export default function DayRhythmCard() {
  const energyLevel = useAppStore(selectEnergyLevel);
  const logEnergyForToday = useAppStore((s) => s.logEnergyForToday);

  return (
    <View className="bg-white rounded-2xl p-5 w-full dark:bg-slate-900 surf3d">
      <Text className="text-slate-900 text-base font-semibold mb-1 dark:text-slate-100">How&apos;s your energy today?</Text>
      <Text className="text-slate-500 text-xs mb-4">This helps shape what we show you today. You can change it anytime.</Text>
      <View className="flex-row gap-2">
        {(ENERGY_OPTIONS || []).map((option) => {
          const isActive = energyLevel === option.level;
          return (
            <Pressable key={option.level} onPress={() => logEnergyForToday(option.level)}
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
