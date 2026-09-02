import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore, selectAdhdFocusModeEnabled, selectFitnessPreferences } from '@/store/index';
import { WORKOUT_EXERCISES } from '@/content/exercises';
import { getCommonFaults } from '@/content/kinesiology';
import { Heading } from '@/shared/components/Heading';

const REST_COACHING_LINES = [
  'Take a drink.', 'A few deep breaths.', 'Shake it out.', 'Almost there.',
];

// Matches the old app's rest-timer color thresholds: calm green most of
// the way, amber as it winds down, red in the final stretch.
function restTimerColor(secondsLeft: number) {
  if (secondsLeft <= 5) return { text: 'text-red-500', bar: 'bg-red-500' };
  if (secondsLeft <= 10) return { text: 'text-amber-500', bar: 'bg-amber-500' };
  return { text: 'text-emerald-500', bar: 'bg-emerald-500' };
}

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// A lightweight full-screen picker for swapping the current exercise or
// adding one to the rest of the queue. Filtered by the person's saved
// equipment when they've set that preference, same rule Start Somewhere
// and the browse screen already use, so it never suggests something
// they can't actually do.
function ExercisePickerModal({
  title, excludeIds, onPick, onClose,
}: {
  title: string; excludeIds: string[]; onPick: (id: string) => void; onClose: () => void;
}) {
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const equipment = fitnessPreferences?.equipment;
    return Object.entries(WORKOUT_EXERCISES || {})
      .filter(([id]) => !excludeIds.includes(id))
      .filter(([, ex]) => !equipment?.length || (ex.eq || []).some((e) => equipment.includes(e)))
      .filter(([, ex]) => !query || ex.name.toLowerCase().includes(query.toLowerCase()));
  }, [fitnessPreferences, excludeIds, query]);

  return (
    <View className="absolute inset-0 bg-black/60 items-center justify-end">
      <View className="bg-slate-900 rounded-t-3xl w-full max-w-md p-4 pb-safe" style={{ maxHeight: '80%' }}>
        <View className="w-8 h-1 rounded-full bg-slate-700 self-center mb-3" />
        <Text className="text-slate-100 text-base font-semibold mb-3">{title}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-slate-100 rounded-xl px-3 py-2 mb-3"
        />
        <ScrollView>
          {options.map(([id, ex]) => (
            <Pressable key={id} onPress={() => onPick(id)} className="py-3 border-b border-slate-800">
              <Text className="text-slate-100 text-sm font-medium">{ex.icon} {ex.name}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">{ex.muscle} · {ex.sets}×{ex.reps}</Text>
            </Pressable>
          ))}
          {options.length === 0 && (
            <Text className="text-slate-500 text-sm py-6 text-center">No matches with your available equipment.</Text>
          )}
        </ScrollView>
        <Pressable onPress={onClose} className="py-3 mt-1">
          <Text className="text-slate-400 text-center text-sm">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function WorkoutSession({
  exerciseId, programId, queue, sessionStartedAt, sessionTotalSets, sessionDoneSets, reducedGroups, energyLightened,
}: {
  exerciseId: string; programId?: string; queue?: string[];
  sessionStartedAt?: string; sessionTotalSets?: number; sessionDoneSets?: number; reducedGroups?: string[]; energyLightened?: boolean;
}) {
  const router = useRouter();
  const [swappedExerciseId, setSwappedExerciseId] = useState(exerciseId);
  const [localQueue, setLocalQueue] = useState<string[]>(queue || []);
  const exercise = WORKOUT_EXERCISES?.[swappedExerciseId];
  // Only the single top fault, not the full list from ExerciseBrowser —
  // mid-set is a moment for one quick catch, not a study session; the
  // full breakdown with every fault plus muscle/joint detail is one tap
  // away in the exercise browser for anyone who wants it.
  const topFault = useMemo(() => (exercise ? getCommonFaults(exercise)[0] : undefined), [exercise]);
  const logSet = useAppStore((s) => s.logSet);
  const adhdFocusModeEnabled = useAppStore(selectAdhdFocusModeEnabled);
  const setAdhdFocusMode = useAppStore((s) => s.setAdhdFocusMode);
  const recordProgramSession = useAppStore((s) => s.recordProgramSession);
  const [programSessionRecorded, setProgramSessionRecorded] = useState(false);

  // A body-check-in flag OR a logged-low-energy day reduces this
  // exercise's sets by one (never below 2) rather than skipping it —
  // the two reasons never stack into a bigger cut, they're both just
  // "today, lighter" for different reasons. Skipped groups are already
  // filtered out of the queue before this screen is ever reached, so
  // anything shown here is at most "reduced," never "unsafe to do."
  const isReducedToday = !!(energyLightened || (reducedGroups?.length && exercise && reducedGroups.includes(exercise.group)));
  const totalSets = exercise ? (isReducedToday ? Math.max(2, (exercise.sets || 3) - 1) : (exercise.sets || 3)) : 3;
  const [currentSet, setCurrentSet] = useState(1);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState(String(exercise?.repsMin || 10));
  const [phase, setPhase] = useState<'set' | 'resting' | 'done'>('set');
  const [restSecondsLeft, setRestSecondsLeft] = useState(exercise?.rest || 60);
  const [recordBanner, setRecordBanner] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<'swap' | 'add' | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const hasMoreInQueue = localQueue.length > 0;
  const startedAtMs = useMemo(() => (sessionStartedAt ? new Date(sessionStartedAt).getTime() : Date.now()), [sessionStartedAt]);
  const doneSetsSoFar = sessionDoneSets ?? 0;
  const totalSetsThisSession = sessionTotalSets ?? totalSets;

  useEffect(() => {
    const tick = () => setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAtMs]);

  useEffect(() => {
    if (phase === 'done' && programId && !hasMoreInQueue && !programSessionRecorded) {
      setProgramSessionRecorded(true);
      recordProgramSession();
    }
  }, [phase, programId, hasMoreInQueue, programSessionRecorded, recordProgramSession]);

  useEffect(() => {
    if (phase !== 'resting') return;
    if (restSecondsLeft <= 0) {
      setPhase(currentSet >= totalSets ? 'done' : 'set');
      if (currentSet < totalSets) setCurrentSet((s) => s + 1);
      return;
    }
    const interval = setInterval(() => setRestSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [phase, restSecondsLeft, currentSet, totalSets]);

  if (!exercise) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">Couldn&apos;t find that exercise.</Text>
        <Pressable onPress={() => router?.back?.()} className="mt-4">
          <Text className="text-indigo-400">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ~ estimate only — there's no stored bodyweight to calculate from
  // precisely, so this uses the same reasonable fallback the old app
  // used and is labeled as an estimate rather than implying precision.
  const estimatedCalories = Math.round(4.5 * 68 * (elapsedSeconds / 3600));
  const doneSetsIncludingCurrent = doneSetsSoFar + (currentSet - 1) + (phase === 'done' ? 1 : 0);
  const restColor = restTimerColor(restSecondsLeft);
  const restTotal = exercise.rest || 60;
  const restPct = Math.min(100, Math.round(((restTotal - restSecondsLeft) / restTotal) * 100));

  const handleCompleteSet = async () => {
    const { isNewRecord } = await logSet(swappedExerciseId, Number(weight) || 0, Number(reps) || 0);
    if (isNewRecord) {
      setRecordBanner('🏆 New personal record for this exercise');
      setTimeout(() => setRecordBanner(null), 3000);
    }
    setRestSecondsLeft(exercise.rest || 60);
    setPhase('resting');
  };

  const goToNextExercise = (nextId: string, remainingQueue: string[]) => {
    router?.replace?.({
      pathname: `/workout/session/${nextId}`,
      params: {
        programId: programId || '',
        queue: remainingQueue.join(','),
        sessionStartedAt: sessionStartedAt || new Date(startedAtMs).toISOString(),
        sessionTotalSets: String(totalSetsThisSession),
        sessionDoneSets: String(doneSetsSoFar + totalSets),
        reducedGroups: (reducedGroups || []).join(','),
        energyLightened: energyLightened ? '1' : '',
      },
    });
  };

  const handleSwap = (newId: string) => {
    setPickerMode(null);
    setSwappedExerciseId(newId);
    setCurrentSet(1);
    setWeight('');
    setReps(String(WORKOUT_EXERCISES?.[newId]?.repsMin || 10));
    setPhase('set');
  };

  const handleAddToQueue = (newId: string) => {
    setPickerMode(null);
    setLocalQueue((q) => [...q, newId]);
  };

  // "Skip for now" moves the current exercise to the end of the queue
  // instead of a drag-to-reorder gesture, since only one exercise is
  // ever on screen at a time in this flow. Same outcome — you control
  // the order — just a button instead of a drag handle.
  const handleSkipForNow = () => {
    if (!hasMoreInQueue) return;
    const [next, ...rest] = localQueue;
    if (!next) return;
    goToNextExercise(next, [...rest, swappedExerciseId]);
  };

  const coachingLine = REST_COACHING_LINES[restSecondsLeft % REST_COACHING_LINES.length];
  const isFinalExercise = !hasMoreInQueue;

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      {/* Session header — elapsed time, calorie estimate, and overall
          set progress across the whole session, not just this exercise. */}
      <View className="w-full max-w-md self-center px-6 pt-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <Pressable onPress={() => router?.back?.()} className="flex-row items-center mb-2 self-start py-1 -ml-1 pr-2">
          <Text className="text-slate-500 text-sm">‹ Back</Text>
        </Pressable>
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-slate-900 dark:text-slate-100 text-base font-bold">{exercise.name}</Text>
            <Text className="text-slate-500 text-xs mt-0.5">{exercise.muscle}</Text>
          </View>
          <View className="items-end">
            <Text className="text-emerald-600 dark:text-emerald-400 text-xl font-bold">{formatElapsed(elapsedSeconds)}</Text>
            <Text className="text-slate-500 text-[10px]">~{estimatedCalories} cal (estimate)</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2 mt-2">
          <View className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <View
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${totalSetsThisSession > 0 ? Math.min(100, (doneSetsIncludingCurrent / totalSetsThisSession) * 100) : 0}%` }}
            />
          </View>
          <Text className="text-slate-500 text-xs font-medium">{doneSetsIncludingCurrent}/{totalSetsThisSession}</Text>
        </View>
      </View>

      <View className="flex-1 w-full max-w-md self-center px-6 pt-safe pb-safe">
        {recordBanner && (
          <View className="bg-amber-400/10 border border-amber-400 rounded-xl p-3 mb-4 mt-4">
            <Text className="text-amber-600 dark:text-amber-400 text-center text-sm font-medium">{recordBanner}</Text>
          </View>
        )}

        {phase === 'set' && (
          <View className="flex-1 justify-center">
            <Heading className="text-center mb-1 mt-4">{exercise.name}</Heading>
            <Text className="text-slate-500 text-center mb-1">Set {currentSet} of {totalSets}</Text>
            {isReducedToday && (
              <Text className="text-amber-600 dark:text-amber-400 text-center text-xs mb-4">
                {energyLightened ? 'Energy is low today, one fewer set' : 'Lightened up today, one fewer set'}
              </Text>
            )}

            {!adhdFocusModeEnabled && (
              <Text className="text-slate-500 text-xs text-center mb-6">{exercise.cues}</Text>
            )}
            {!adhdFocusModeEnabled && topFault && (
              <View className="bg-stone-50 dark:bg-slate-800 rounded-xl px-3 py-2 mb-6 -mt-3">
                <Text className="text-red-500 text-[11px] text-center">✗ {topFault.fault}</Text>
                <Text className="text-emerald-600 dark:text-emerald-400 text-[11px] text-center">✓ {topFault.fix}</Text>
              </View>
            )}
            {adhdFocusModeEnabled && <View className="mb-6" />}

            <View className="flex-row gap-3 mb-6">
              <View className="flex-1">
                <Text className="text-slate-500 text-xs mb-1 text-center">Weight</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center text-xl rounded-xl py-3 border border-slate-200 dark:border-slate-800"
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-500 text-xs mb-1 text-center">Reps</Text>
                <TextInput
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="decimal-pad"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center text-xl rounded-xl py-3 border border-slate-200 dark:border-slate-800"
                />
              </View>
            </View>

            {/* Swap / Add / Skip controls */}
            <View className="flex-row gap-2 mb-6">
              <Pressable onPress={() => setPickerMode('swap')} className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-xs font-medium">↻ Swap</Text>
              </Pressable>
              <Pressable onPress={() => setPickerMode('add')} className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-xs font-medium">+ Add exercise</Text>
              </Pressable>
              {hasMoreInQueue && (
                <Pressable onPress={handleSkipForNow} className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 items-center">
                  <Text className="text-slate-600 dark:text-slate-300 text-xs font-medium">⏭ Skip for now</Text>
                </Pressable>
              )}
            </View>

            <Pressable onPress={handleCompleteSet} className="bg-indigo-600 rounded-full py-4 active:bg-indigo-500">
              <Text className="text-white text-center font-semibold text-lg">Complete set</Text>
            </Pressable>
          </View>
        )}

        {phase === 'resting' && (
          <View className="flex-1 justify-center items-center">
            <Text className="text-slate-500 text-sm uppercase tracking-wider mb-4">Resting</Text>
            <Text className={`text-6xl font-bold mb-4 ${restColor.text}`}>{restSecondsLeft}</Text>
            <View className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-4">
              <View className={`h-full rounded-full ${restColor.bar}`} style={{ width: `${restPct}%` }} />
            </View>
            <Text className="text-slate-700 dark:text-slate-300 mb-10">{coachingLine}</Text>
            {!adhdFocusModeEnabled && (
              <Text className="text-slate-500 text-xs text-center">
                Next: set {currentSet < totalSets ? currentSet + 1 : currentSet} of {totalSets}
              </Text>
            )}
            <Pressable onPress={() => { setRestSecondsLeft(0); }} className="mt-6 py-2">
              <Text className="text-slate-500 text-sm">Skip rest ›</Text>
            </Pressable>
          </View>
        )}

        {phase === 'done' && (
          <View className="flex-1 justify-center items-center">
            <Heading className="text-center mb-2">Nice work.</Heading>
            <Text className="text-slate-500 text-center mb-10">All {totalSets} sets logged for {exercise.name}.</Text>

            {hasMoreInQueue ? (
              <Pressable
                onPress={() => {
                  const [next, ...rest] = localQueue;
                  if (!next) return;
                  goToNextExercise(next, rest);
                }}
                className="bg-indigo-600 rounded-full py-4 px-10 active:bg-indigo-500"
              >
                <Text className="text-white font-semibold">Next exercise ({localQueue.length} left)</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setShowFinishConfirm(true)} className="bg-emerald-500 rounded-full py-4 px-10 active:bg-emerald-400">
                <Text className="text-white font-semibold">{programId ? "Finish today's session" : 'Done'}</Text>
              </Pressable>
            )}
          </View>
        )}

        {phase === 'set' && (
          <Pressable
            onPress={() => setAdhdFocusMode(!adhdFocusModeEnabled)}
            className="py-3"
          >
            <Text className="text-slate-600 text-center text-xs">
              {adhdFocusModeEnabled ? 'Show more detail' : 'Simplify'}
            </Text>
          </Pressable>
        )}
      </View>

      {pickerMode && (
        <ExercisePickerModal
          title={pickerMode === 'swap' ? 'Swap this exercise' : 'Add an exercise'}
          excludeIds={pickerMode === 'swap' ? [swappedExerciseId] : [swappedExerciseId, ...localQueue]}
          onPick={pickerMode === 'swap' ? handleSwap : handleAddToQueue}
          onClose={() => setPickerMode(null)}
        />
      )}

      {showFinishConfirm && isFinalExercise && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center px-6">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm">
            <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-2">You showed up. That counts.</Text>
            <Text className="text-slate-500 text-sm leading-5 mb-5">
              {formatElapsed(elapsedSeconds)} · {doneSetsIncludingCurrent}/{totalSetsThisSession} sets · ~{estimatedCalories} cal (estimate)
            </Text>
            <View className="flex-row gap-3">
              <Pressable onPress={() => setShowFinishConfirm(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl py-3 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Keep going</Text>
              </Pressable>
              <Pressable onPress={() => router?.replace?.('/(tabs)/workout')} className="flex-1 bg-emerald-500 rounded-xl py-3 items-center">
                <Text className="text-white text-sm font-semibold">Done ✓</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
