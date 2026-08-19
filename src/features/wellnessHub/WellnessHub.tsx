import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectProfile, selectFitnessPreferences, type EnergyLevel } from '@/store/index';
import { Heading } from '@/shared/components/Heading';

const MOOD_OPTIONS: { level: EnergyLevel; emoji: string; label: string }[] = [
  { level: 'high', emoji: '😀', label: 'Good' },
  { level: 'medium', emoji: '😐', label: 'Okay' },
  { level: 'low', emoji: '😔', label: 'Struggling' },
];

/**
 * Mood-first. Workout isn't linked here anymore — it has its own tab
 * already, so it doesn't need a second entry point. Blood type moved to
 * Meals, since that's what it actually affects. Strain Explorer only
 * shows if the person indicated cannabis as a support method during
 * onboarding — it's not offered to everyone by default.
 *
 * Cycle tracking's visibility here is a default based on the gender
 * selected during onboarding, not a hard gate — someone who selected
 * "male" but does want the feature can still turn it on directly from
 * cycleTrackingEnabled in Fitness preferences, which re-surfaces this
 * link once enabled. This avoids showing every man an irrelevant
 * feature by default, without assuming anyone's actual biology from a
 * gender label — a rigid "hide for male" gate would itself be a
 * dignity problem for a trans man who does menstruate.
 */
export default function WellnessHub() {
  const router = useRouter();
  const energyLevel = useAppStore((s) => s.energyLevel);
  const logEnergyForToday = useAppStore((s) => s.logEnergyForToday);
  const profile = useAppStore(selectProfile);
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const cycleTrackingEnabled = useAppStore((s) => s.cycleTrackingEnabled);
  const showStrainExplorer = (profile?.supportMethods || []).includes('cannabis');
  const showCycleTracking = fitnessPreferences?.gender !== 'male' || cycleTrackingEnabled;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Wellness</Heading>
        <Text className="text-slate-500 text-sm mb-6">How do you feel right now?</Text>

        <View className="flex-row gap-2 mb-6">
          {(MOOD_OPTIONS || []).map((option) => {
            const isActive = energyLevel === option.level;
            return (
              <Pressable
                key={option.level}
                onPress={() => logEnergyForToday(option.level)}
                className={isActive ? 'flex-1 bg-indigo-600/20 border-2 border-indigo-400 rounded-2xl py-4 items-center' : 'flex-1 bg-white dark:bg-slate-900 border-2 border-transparent rounded-2xl py-4 items-center'}
              >
                <Text className="text-2xl mb-1">{option.emoji}</Text>
                <Text className={isActive ? 'text-indigo-700 text-xs' : 'text-slate-700 dark:text-slate-300 text-xs'}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-3">
          <Pressable onPress={() => router?.push?.('/coach')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm">💬 Chat with Aviva</Text>
            <Text className="text-slate-500 text-xs">→</Text>
          </Pressable>
          {showCycleTracking && (
            <Pressable onPress={() => router?.push?.('/settings/cycle-tracking')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
              <Text className="text-slate-900 dark:text-slate-100 text-sm">🌙 Cycle tracking</Text>
              <Text className="text-slate-500 text-xs">→</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router?.push?.('/wellness/learn')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm">📚 Learn</Text>
            <Text className="text-slate-500 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/wellness/workbook')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm">📝 Workbook</Text>
            <Text className="text-slate-500 text-xs">→</Text>
          </Pressable>
          {showStrainExplorer && (
            <Pressable onPress={() => router?.push?.('/wellness/strains')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
              <Text className="text-slate-900 dark:text-slate-100 text-sm">🌿 Strain explorer</Text>
              <Text className="text-slate-500 text-xs">→</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
