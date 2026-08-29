import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore, selectAdhdFocusModeEnabled, selectSetLogs } from '@/store/index';
import { WORKOUT_EXERCISES } from '@/content/exercises';
import { suggestNextSet } from './weightProgress';
import {
  SIX_TWELVE_TWENTYFIVE_ROLE_LABELS, SIX_TWELVE_TWENTYFIVE_ROLE_HINTS, type SixTwelveTwentyFiveSlot,
} from '@/content/sixTwelveTwentyFive';
import { Heading } from '@/shared/components/Heading';

const REST_COACHING_LINES = ['Take a drink.', 'A few deep breaths.', 'Shake it out.', 'Almost there.'];

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

// A single flat sequence of (round, slot) steps — built once the person
// commits to a round count, so the rest of the runner just walks a
// fixed list rather than juggling nested round/slot counters.
interface SequenceStep {
  round: number;
  slot: SixTwelveTwentyFiveSlot;
}

/**
 * Runs the 6-12-25 sequence for a chosen muscle group: three exercises,
 * each locked to its own rep target (6 heavy / 12 moderate / 25 light),
 * repeated for the number of rounds the person picks. Every completed
 * set is logged through the same `logSet` store action every other
 * workout flow uses, so personal records and the Progress screen pick
 * it up automatically — this is a distinct runner, not a parallel
 * tracking system.
 */
export default function SixTwelveTwentyFiveRunner({
  group, slots,
}: {
  group?: string; slots: SixTwelveTwentyFiveSlot[];
}) {
  const router = useRouter();
  const logSet = useAppStore((s) => s.logSet);
  const setLogs = useAppStore(selectSetLogs);
  const adhdFocusModeEnabled = useAppStore(selectAdhdFocusModeEnabled);
  const setAdhdFocusMode = useAppStore((s) => s.setAdhdFocusMode);

  const [rounds, setRounds] = useState<number | null>(null); // deliberately no default — the person must choose before starting
  const [sequence, setSequence] = useState<SequenceStep[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [phase, setPhase] = useState<'set' | 'resting' | 'done'>('set');
  const [restSecondsLeft, setRestSecondsLeft] = useState(60);
  const [recordBanner, setRecordBanner] = useState<string | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [completedSets, setCompletedSets] = useState(0);
  const [startedAtMs] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const validSlots = useMemo(() => slots.filter((s) => WORKOUT_EXERCISES?.[s.exerciseId]), [slots]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAtMs) / 1000))), 1000);
    return () => clearInterval(interval);
  }, [startedAtMs]);

  const handleStart = (roundCount: number) => {
    const built: SequenceStep[] = [];
    for (let r = 1; r <= roundCount; r++) {
      for (const slot of validSlots) built.push({ round: r, slot });
    }
    setRounds(roundCount);
    setSequence(built);
    setStepIndex(0);
    setPhase('set');
  };

  const currentStep = sequence?.[stepIndex] || null;
  const currentExercise = currentStep ? WORKOUT_EXERCISES?.[currentStep.slot.exerciseId] : null;

  // Reps prefill from the slot's fixed target every time a new step is
  // reached; weight prefills from the person's own suggested weight for
  // that exercise (double-progression, same helper the rest of the app
  // uses) so it's a sensible starting point rather than always blank.
  useEffect(() => {
    if (!currentStep || !currentExercise) return;
    setReps(String(currentStep.slot.targetReps));
    const suggestion = suggestNextSet(currentStep.slot.exerciseId, currentExercise.reps, currentExercise.repsMin, currentExercise.inc, setLogs);
    setWeight(suggestion.weight || '');
    setRestSecondsLeft(currentExercise.rest || 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-derives when the step itself changes, not on every setLogs update
  }, [stepIndex, sequence]);

  useEffect(() => {
    if (phase !== 'resting') return;
    if (restSecondsLeft <= 0) {
      const isLastStep = !sequence || stepIndex >= sequence.length - 1;
      if (isLastStep) {
        setPhase('done');
      } else {
        setStepIndex((i) => i + 1);
        setPhase('set');
      }
      return;
    }
    const interval = setInterval(() => setRestSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [phase, restSecondsLeft, stepIndex, sequence]);

  const handleCompleteSet = async () => {
    if (!currentStep) return;
    const w = Number(weight) || 0;
    const r = Number(reps) || currentStep.slot.targetReps;
    const { isNewRecord } = await logSet(currentStep.slot.exerciseId, w, r);
    setCompletedSets((n) => n + 1);
    setRecordBanner(isNewRecord ? `🎉 New personal record — ${currentExercise?.name}!` : null);
    setPhase('resting');
  };

  const totalSteps = sequence?.length || 0;

  if (!validSlots.length) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">No exercises available for this muscle group with your current equipment.</Text>
        <Pressable onPress={() => router?.back?.()} className="mt-4">
          <Text className="text-indigo-500">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Rounds not yet chosen — ask for it up front, no round pre-selected.
  if (rounds === null || !sequence) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
          <View className="w-full max-w-md self-center">
            <Heading className="text-center mb-2">How many rounds?</Heading>
            <Text className="text-slate-500 text-center text-sm mb-6">
              Each round is all 3 exercises, back-to-back: 6 heavy → 12 moderate → 25 light.
            </Text>

            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6">
              {validSlots.map((slot) => {
                const ex = WORKOUT_EXERCISES?.[slot.exerciseId];
                return (
                  <View key={slot.role} className="flex-row items-center justify-between py-1.5">
                    <Text className="text-slate-700 dark:text-slate-300 text-sm flex-1">{ex?.icon} {ex?.name}</Text>
                    <Text className="text-slate-400 text-xs">{slot.targetReps} reps</Text>
                  </View>
                );
              })}
            </View>

            <View className="flex-row gap-3">
              {[1, 2, 3].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => handleStart(n)}
                  className="flex-1 bg-indigo-600 rounded-2xl py-5 items-center active:bg-indigo-500"
                >
                  <Text className="text-white text-2xl font-bold">{n}</Text>
                  <Text className="text-indigo-100 text-xs mt-1">{n === 1 ? 'round' : 'rounds'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
        <View className="flex-1 items-center justify-center px-8">
          <Heading className="text-center mb-2">You showed up. That counts.</Heading>
          <Text className="text-slate-500 text-center mb-10">
            {completedSets} set{completedSets === 1 ? '' : 's'} logged across {rounds} round{rounds === 1 ? '' : 's'} · {formatElapsed(elapsedSeconds)}
          </Text>
          <Pressable onPress={() => router?.replace?.('/(tabs)/workout')} className="bg-emerald-500 rounded-full py-4 px-10 active:bg-emerald-400">
            <Text className="text-white font-semibold">Done ✓</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentStep || !currentExercise) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">Something went wrong loading this step.</Text>
        <Pressable onPress={() => router?.back?.()} className="mt-4">
          <Text className="text-indigo-500">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const restColor = restTimerColor(restSecondsLeft);
  const restTotal = currentExercise.rest || 60;
  const restPct = restTotal > 0 ? Math.max(0, Math.min(100, (restSecondsLeft / restTotal) * 100)) : 0;
  const coachingLine = REST_COACHING_LINES[stepIndex % REST_COACHING_LINES.length];
  const roleLabel = SIX_TWELVE_TWENTYFIVE_ROLE_LABELS[currentStep.slot.role];
  const roleHint = SIX_TWELVE_TWENTYFIVE_ROLE_HINTS[currentStep.slot.role];

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="px-5 pt-2 pb-1">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable onPress={() => setShowFinishConfirm(true)}>
            <Text className="text-slate-500 text-sm">← Exit</Text>
          </Pressable>
          <Text className="text-slate-500 text-xs">{formatElapsed(elapsedSeconds)} · Round {currentStep.round} of {rounds}</Text>
        </View>
        <View className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-1">
          <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${totalSteps > 0 ? ((stepIndex + (phase === 'resting' ? 1 : 0)) / totalSteps) * 100 : 0}%` }} />
        </View>
        <Text className="text-slate-500 text-xs font-medium">{stepIndex + (phase === 'resting' ? 1 : 0)}/{totalSteps}</Text>
      </View>

      <View className="flex-1 w-full max-w-md self-center px-6 pt-safe pb-safe">
        {recordBanner && (
          <View className="bg-amber-400/10 border border-amber-400 rounded-xl p-3 mb-4 mt-4">
            <Text className="text-amber-600 dark:text-amber-400 text-center text-sm font-medium">{recordBanner}</Text>
          </View>
        )}

        {phase === 'set' && (
          <View className="flex-1 justify-center">
            <View className="bg-indigo-600/10 self-center rounded-full px-3 py-1 mb-3">
              <Text className="text-indigo-700 dark:text-indigo-300 text-xs font-bold">{roleLabel}</Text>
            </View>
            <Heading className="text-center mb-1">{currentExercise.name}</Heading>
            <Text className="text-slate-500 text-center mb-1">Target: {currentStep.slot.targetReps} reps</Text>
            <Text className="text-slate-400 text-center text-xs mb-6">{roleHint}</Text>

            {!adhdFocusModeEnabled && (
              <Text className="text-slate-500 text-xs text-center mb-6">{currentExercise.cues}</Text>
            )}
            {adhdFocusModeEnabled && <View className="mb-6" />}

            <View className="flex-row gap-3 mb-6">
              <View className="flex-1">
                <Text className="text-slate-500 text-xs mb-1 text-center">Weight</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
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
                  keyboardType="numeric"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center text-xl rounded-xl py-3 border border-slate-200 dark:border-slate-800"
                />
              </View>
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
            {!adhdFocusModeEnabled && sequence[stepIndex + 1] && (
              <Text className="text-slate-500 text-xs text-center">
                Next: {SIX_TWELVE_TWENTYFIVE_ROLE_LABELS[sequence[stepIndex + 1]!.slot.role]} — {WORKOUT_EXERCISES?.[sequence[stepIndex + 1]!.slot.exerciseId]?.name}
              </Text>
            )}
            <Pressable onPress={() => setRestSecondsLeft(0)} className="mt-6 py-2">
              <Text className="text-slate-500 text-sm">Skip rest ›</Text>
            </Pressable>
          </View>
        )}

        {phase === 'set' && (
          <Pressable onPress={() => setAdhdFocusMode(!adhdFocusModeEnabled)} className="py-3">
            <Text className="text-slate-600 text-center text-xs">{adhdFocusModeEnabled ? 'Show more detail' : 'Simplify'}</Text>
          </Pressable>
        )}
      </View>

      {showFinishConfirm && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center px-6">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm">
            <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-2">Finish early?</Text>
            <Text className="text-slate-500 text-sm leading-5 mb-5">
              {completedSets} set{completedSets === 1 ? '' : 's'} logged so far — anything already logged still counts. Nothing is lost by stopping here.
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
