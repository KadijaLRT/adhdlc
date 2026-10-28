import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectEnergyLevel } from '@/store/index';
import { WORKOUT_EXERCISES } from '@/content/exercises';
import { RESTRICTIONS_DISCLAIMER } from '@/content/restrictions';
import { buildCareRoutine, type CareKind } from '@/content/restrictionCare';
import { Heading } from '@/shared/components/Heading';
import { useEquipmentContext } from './useEquipmentContext';
import { buildRehabRoutineIds, restrictionLabels } from './restrictionSession';

// A short routine built only from the targeted moves for the person's
// restrictions, doable with the active gym's equipment, started on its own.
export default function RehabRoutineScreen() {
  const router = useRouter();
  const energyLevel = useAppStore(selectEnergyLevel);
  const equipmentContext = useEquipmentContext();
  const hasRestrictions = (equipmentContext.plan?.restrictions || []).length > 0;
  const ids = buildRehabRoutineIds(equipmentContext, energyLevel).filter((id) => !!WORKOUT_EXERCISES?.[id]);

  const restrictionIds = (equipmentContext.plan?.restrictions || []).map((r) => r.id);
  const careWarmup = buildCareRoutine('warmup', restrictionIds);
  const careStretch = buildCareRoutine('stretch', restrictionIds);

  const openCare = (kind: CareKind) => {
    const routine = kind === 'warmup' ? careWarmup : careStretch;
    if (!routine) return;
    router?.push?.({ pathname: '/fitness/stretch-run', params: { routineId: routine.id } });
  };

  const handleStart = () => {
    if (ids.length === 0) return;
    router?.push?.({
      pathname: '/workout/day-session',
      params: {
        exerciseIds: ids.join(','),
        programId: '',
        dayTitle: 'Targeted routine',
        sessionStartedAt: new Date().toISOString(),
        energyLightened: energyLevel === 'low' ? '1' : '',
      },
    });
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Targeted routine</Heading>

        {!hasRestrictions ? (
          <View>
            <Text className="text-slate-500 text-sm mb-4">
              Tell the app about any injuries or weak spots and it will build a short strengthening routine for them.
            </Text>
            <Pressable onPress={() => router?.push?.('/settings/restrictions')} className="bg-indigo-600 rounded-full py-4 items-center active:bg-indigo-500">
              <Text className="text-white font-semibold">Choose what to work on</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="text-slate-500 text-sm mb-4">For {restrictionLabels(equipmentContext)}. A few minutes, at a gentle effort.</Text>

            {ids.length === 0 ? (
              <View className="bg-slate-100 dark:bg-slate-900 rounded-xl p-3 mb-4">
                <Text className="text-slate-600 text-xs dark:text-slate-300">
                  Nothing for this fits your gym's equipment list yet. Add equipment under Programs and it will show up here.
                </Text>
              </View>
            ) : (
              <View>
                {energyLevel === 'low' && (
                  <Text className="text-amber-700 dark:text-amber-400 text-xs mb-3">Energy is low today, so this is a shorter version.</Text>
                )}
                {ids.map((id) => {
                  const ex = WORKOUT_EXERCISES[id];
                  if (!ex) return null;
                  return (
                    <View key={id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-2">
                      <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium">{ex.icon} {ex.name}</Text>
                      <Text className="text-slate-500 text-xs mt-0.5">{ex.sets} sets of {ex.reps}</Text>
                    </View>
                  );
                })}
                <Pressable onPress={handleStart} className="bg-emerald-500 rounded-full py-4 items-center active:bg-emerald-400 mt-3 mb-3">
                  <Text className="text-white font-semibold">Start routine ({ids.length} moves)</Text>
                </Pressable>
              </View>
            )}

            {(careWarmup || careStretch) && (
              <View className="mb-2">
                <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2">Warm up and stretch</Text>
                {careWarmup && (
                  <Pressable onPress={() => openCare('warmup')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-2 active:opacity-80">
                    <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium">🔥 Targeted warm-up</Text>
                    <Text className="text-slate-500 text-xs mt-0.5">About {careWarmup.durationMinutes} min, easy moves to get the area ready</Text>
                  </Pressable>
                )}
                {careStretch && (
                  <Pressable onPress={() => openCare('stretch')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-2 active:opacity-80">
                    <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium">🧘 Targeted stretches</Text>
                    <Text className="text-slate-500 text-xs mt-0.5">About {careStretch.durationMinutes} min, a mild pull and never a pain</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Pressable onPress={() => router?.push?.('/settings/restrictions')} className="py-3 items-center">
              <Text className="text-indigo-600 text-sm font-medium">Change what I am working on</Text>
            </Pressable>
            <Text className="text-slate-500 text-[11px] leading-4 mt-3">{RESTRICTIONS_DISCLAIMER}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
