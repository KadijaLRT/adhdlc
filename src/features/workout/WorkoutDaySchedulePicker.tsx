import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useAppStore, selectActiveProgramId, selectFitnessPreferences, selectGyms, selectActiveGymId, selectWeekdayAssignment,
} from '@/store/index';
import { PROGRAMS } from '@/content/programs';
import { buildDayLetterContent, WEEKDAY_LABELS } from './buildWeeklySplit';
import { buildEquipmentContext } from './exerciseAvailability';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

const GROUP_EMOJI: Record<string, string> = {
  quads: '🍑', hamstrings: '🍑', glutes: '🍑', calves: '🦵',
  chest: '💪', back: '⬅️', shoulders: '💪', arms: '💪',
  core: '🎯', fullbody: '🏋️',
};

function emojiForGroups(groups: string[]): string {
  return GROUP_EMOJI[groups[0] || ''] || '💪';
}

/**
 * Full-screen picker for what a given weekday should be — every
 * option visible at once with its real content (muscle groups,
 * estimated time), tap to assign directly. Replaces cycling through
 * options one tap at a time with actually seeing what each one is
 * before choosing.
 */
export default function WorkoutDaySchedulePicker({ weekdayIndex }: { weekdayIndex: number }) {
  const router = useRouter();
  const activeProgramId = useAppStore(selectActiveProgramId);
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const gyms = useAppStore(selectGyms);
  const activeGymId = useAppStore(selectActiveGymId);
  const weekdayAssignment = useAppStore(selectWeekdayAssignment);
  const setWeekdayAssignment = useAppStore((s) => s.setWeekdayAssignment);

  const activeProgram = (PROGRAMS || []).find((p) => p.id === activeProgramId);
  const activeGym = (gyms || []).find((g) => g.id === activeGymId);

  const prefsEquipment = fitnessPreferences?.equipment;
  const savedRestrictions = fitnessPreferences?.restrictions;
  const savedCorrectiveModes = fitnessPreferences?.correctiveModes;
  const equipmentContext = useMemo(
    () => buildEquipmentContext(activeGym, prefsEquipment, savedRestrictions, savedCorrectiveModes),
    [activeGym, prefsEquipment, savedRestrictions, savedCorrectiveModes]
  );

  const dayContent = useMemo(
    () => (activeProgram ? buildDayLetterContent(activeProgram, fitnessPreferences, equipmentContext) : new Map()),
    [activeProgram, fitnessPreferences, equipmentContext]
  );

  const currentLetter = weekdayAssignment?.[weekdayIndex] ?? null;
  const weekdayLabel = WEEKDAY_LABELS[weekdayIndex] || '';
  const weekdayFull: Record<string, string> = { SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };

  const handleChoose = (letter: string | null) => {
    setWeekdayAssignment(weekdayIndex, letter);
    router?.back?.();
  };

  if (!activeProgram) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">No active program to schedule.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="w-full max-w-md self-center">
          <Text className="text-slate-900 dark:text-slate-100 text-2xl font-bold mb-1">Schedule: {weekdayLabel}</Text>
          <Text className="text-slate-500 text-sm mb-6">Choose the workout for {weekdayFull[weekdayLabel] || weekdayLabel} this week</Text>

          <View className="gap-3">
            <Pressable
              onPress={() => handleChoose(null)}
              className={!currentLetter ? 'border-2 border-emerald-400 bg-emerald-400/10 rounded-2xl p-4 flex-row items-center justify-between' : 'bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between'}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">😴</Text>
                <Text className={!currentLetter ? 'text-emerald-700 dark:text-emerald-400 font-semibold text-base' : 'text-slate-900 dark:text-slate-100 font-semibold text-base'}>Rest Day</Text>
              </View>
              {!currentLetter && <Text className="text-emerald-600 dark:text-emerald-400 text-lg">✓</Text>}
            </Pressable>

            {Array.from(dayContent.entries()).map(([letter, content]) => {
              const isSelected = currentLetter === letter;
              return (
                <Pressable
                  key={letter}
                  onPress={() => handleChoose(letter)}
                  className={isSelected ? 'border-2 border-emerald-400 bg-emerald-400/10 rounded-2xl p-4' : 'bg-white dark:bg-slate-900 rounded-2xl p-4'}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <Text className="text-2xl">{emojiForGroups(content.muscleGroups)}</Text>
                      <Text className={isSelected ? 'text-emerald-700 dark:text-emerald-400 font-semibold text-base flex-1' : 'text-slate-900 dark:text-slate-100 font-semibold text-base flex-1'}>
                        Day {letter} — {content.title}
                      </Text>
                    </View>
                    {isSelected && <Text className="text-emerald-600 dark:text-emerald-400 text-lg">✓</Text>}
                  </View>
                  <Text className="text-slate-500 text-sm mt-1 ml-11 capitalize">
                    {content.muscleGroups.join(' & ')} · {content.estimatedMinutes}-{content.estimatedMinutes + 10} min
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
