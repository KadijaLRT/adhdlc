import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectCompletedExerciseLog, selectFitnessPreferences } from '@/store/index';
import { WORKOUT_EXERCISES, type Exercise } from '@/content/exercises';
import { deriveMuscleInvolvement, getJointAction, getCommonFaults } from '@/content/kinesiology';
import { Heading } from '@/shared/components/Heading';

// Secondary screen reached from "Browse all exercises" on the Workouts
// landing page. The Start Somewhere button and Programs/Progress/
// Recovery links live there now, not here, to avoid duplicating the
// same actions across two screens.
export default function ExerciseBrowser() {
  const router = useRouter();
  const completedLog = useAppStore(selectCompletedExerciseLog);
  const logExerciseCompletion = useAppStore((s) => s.logExerciseCompletion);
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const entries = useMemo(() => Object.entries(WORKOUT_EXERCISES || {}), []);
  const groups = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(([, ex]) => set.add(ex.group));
    return Array.from(set);
  }, [entries]);

  const availableEquipment = fitnessPreferences?.equipment || null;

  const filteredByEquipment = availableEquipment
    ? entries.filter(([, ex]) => (ex.eq || []).some((e) => availableEquipment.includes(e)))
    : entries;

  const filtered = filteredByEquipment.filter(([, ex]) => !selectedGroup || ex.group === selectedGroup);

  return (
    <View className="flex-1">
      <View className="px-4 pt-4 w-full max-w-md self-center">
        <Heading className="mb-1">Browse Exercises</Heading>
        <Text className="text-slate-500 text-sm mb-4">Pick a muscle group. Do as much or as little as feels right today.</Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['all', ...groups]}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8, marginBottom: 12 }}
          renderItem={({ item }) => {
            const isActive = item === 'all' ? selectedGroup === null : selectedGroup === item;
            return (
              <Pressable
                onPress={() => setSelectedGroup(item === 'all' ? null : item)}
                className={isActive ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-2 px-4' : 'bg-white border-2 border-transparent rounded-full py-2 px-4'}
              >
                <Text className={isActive ? 'text-indigo-700 text-xs capitalize' : 'text-slate-700 text-xs capitalize'}>{item}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={([id]) => id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40, width: '100%', maxWidth: 448, alignSelf: 'center' }}
        renderItem={({ item: [id, exercise] }) => {
          const completedCount = (completedLog || []).filter((l) => l.exerciseId === id).length;
          return <ExerciseCard exercise={exercise} exerciseId={id} completedCount={completedCount} onLogCompletion={() => logExerciseCompletion(id)} />;
        }}
        ListEmptyComponent={<Text className="text-slate-500 text-center mt-6">No exercises in this group yet.</Text>}
      />
    </View>
  );
}

function ExerciseCard({ exercise, exerciseId, completedCount, onLogCompletion }: { exercise: Exercise; exerciseId: string; completedCount: number; onLogCompletion: () => void }) {
  const router = useRouter();
  const [showWhy, setShowWhy] = useState(false);
  const muscleInvolvement = useMemo(() => deriveMuscleInvolvement(exercise), [exercise]);
  const jointAction = useMemo(() => getJointAction(exercise), [exercise]);
  const commonFaults = useMemo(() => getCommonFaults(exercise), [exercise]);

  return (
    <View className="bg-white rounded-2xl p-4 dark:bg-slate-900">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-slate-900 font-medium flex-1 dark:text-slate-100">{exercise?.icon} {exercise?.name}</Text>
        {completedCount > 0 && <Text className="text-emerald-700 text-xs dark:text-emerald-400">done {completedCount}×</Text>}
      </View>
      <Text className="text-slate-500 text-xs mb-2">{exercise?.muscle} · {exercise?.sets} sets · {exercise?.reps} reps · rest {exercise?.rest}s</Text>
      <Text className="text-slate-500 text-xs mb-2">{exercise?.cues}</Text>

      <Pressable onPress={() => setShowWhy((v) => !v)} className="mb-3">
        <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">{showWhy ? 'Hide the kinesiology ▾' : 'Why this exercise →'}</Text>
      </Pressable>

      {showWhy && (
        <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
          <Text className="text-slate-700 dark:text-slate-300 text-xs mb-1">
            <Text className="font-semibold">Primary: </Text>{muscleInvolvement.primary.join(', ') || '—'}
          </Text>
          {muscleInvolvement.secondary.length > 0 && (
            <Text className="text-slate-500 text-xs mb-1">
              <Text className="font-semibold text-slate-700 dark:text-slate-300">Secondary: </Text>{muscleInvolvement.secondary.join(', ')}
            </Text>
          )}
          <Text className="text-slate-500 text-xs mb-1">
            <Text className="font-semibold text-slate-700 dark:text-slate-300">Joint action: </Text>{jointAction.jointAction}
          </Text>
          <Text className="text-slate-500 text-xs">
            <Text className="font-semibold text-slate-700 dark:text-slate-300">Plane of motion: </Text>{jointAction.plane}
          </Text>

          {commonFaults.length > 0 && (
            <View className="mt-2 pt-2 border-t border-stone-200 dark:border-slate-700">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">Common faults to watch for</Text>
              {commonFaults.map((f, i) => (
                <View key={i} className="mb-1.5">
                  <Text className="text-red-500 text-[11px]">✗ {f.fault}</Text>
                  <Text className="text-emerald-600 dark:text-emerald-400 text-[11px]">✓ {f.fix}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Pressable onPress={() => router?.push?.(`/workout/session/${exerciseId}`)} className="bg-indigo-600 rounded-full py-2 items-center active:bg-indigo-500">
        <Text className="text-white text-xs font-semibold">Start guided session</Text>
      </Pressable>
    </View>
  );
}
