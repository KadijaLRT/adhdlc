import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore, selectRoutines } from '@/store/index';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

function todayLocal(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Walks through a routine's steps one at a time. Steps with a duration
 * count down automatically (pause, +5 min, matching the reference
 * timer pattern); steps without one just wait for a tap. No forced
 * order — tapping any step in the list below jumps straight to it.
 */
export default function RoutineRunner({ routineId }: { routineId: string }) {
  const router = useRouter();
  const routines = useAppStore(selectRoutines);
  const toggleRoutineStep = useAppStore((s) => s.toggleRoutineStep);
  const recordRoutineCompletion = useAppStore((s) => s.recordRoutineCompletion);

  const routine = (routines || []).find((r) => r.id === routineId);
  const steps = routine?.steps || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = steps[currentIndex];
  const today = todayLocal();
  const checkedIds = routine?.stepCompletionDate === today ? (routine?.completedStepIds || []) : [];

  // Reset the timer whenever the current step changes.
  useEffect(() => {
    if (currentStep?.durationMinutes) {
      setSecondsLeft(currentStep.durationMinutes * 60);
      setIsPaused(false);
    } else {
      setSecondsLeft(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    if (!currentStep?.durationMinutes || isPaused || secondsLeft <= 0) return;
    intervalRef.current = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, secondsLeft, currentStep]);

  const goToNextStep = async () => {
    if (!currentStep) return;
    if (!checkedIds.includes(currentStep.id)) {
      await toggleRoutineStep(routineId, currentStep.id);
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= steps.length) {
      await recordRoutineCompletion(routineId);
      setFinished(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const jumpToStep = (index: number) => {
    setCurrentIndex(index);
  };

  if (!routine || steps.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">This routine doesn&apos;t have steps to guide through.</Text>
        <Pressable onPress={() => router?.back?.()} className="mt-4">
          <Text className="text-indigo-500">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-4xl mb-4">{routine.emoji}</Text>
        <Text className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-2 text-center">Nice work.</Text>
        <Text className="text-slate-500 text-sm text-center mb-8">You just finished {routine.title}.</Text>
        <Pressable onPress={() => router?.replace?.('/routines')} className="bg-emerald-500 rounded-full py-3 px-8 active:bg-emerald-400 btn3d btn3d-s">
          <Text className="text-white font-semibold">Done ✓</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isTimed = !!currentStep?.durationMinutes;
  const totalSeconds = (currentStep?.durationMinutes || 0) * 60;
  const progressPct = isTimed && totalSeconds > 0 ? Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <View className="flex-1 w-full max-w-md self-center px-6 pt-2">
        <Text className="text-slate-500 text-xs text-center mb-1">{routine.emoji} {routine.title}</Text>
        <Text className="text-slate-400 text-xs text-center mb-8">Step {currentIndex + 1} of {steps.length}</Text>

        <Text className="text-slate-900 dark:text-slate-100 text-2xl font-bold text-center mb-6">{currentStep?.text}</Text>

        {isTimed ? (
          <View className="items-center mb-8">
            <Text className="text-slate-900 dark:text-slate-100 text-6xl font-bold mb-4">{formatCountdown(secondsLeft)}</Text>
            <View className="w-full h-2 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden mb-5">
              <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => setSecondsLeft((s) => s + 300)} className="border-2 border-stone-300 dark:border-slate-700 rounded-full py-3 px-5">
                <Text className="text-slate-600 dark:text-slate-300 font-semibold">+5</Text>
              </Pressable>
              <Pressable onPress={() => setIsPaused(!isPaused)} className="bg-slate-900 dark:bg-slate-100 rounded-full py-3 px-8">
                <Text className="text-white dark:text-slate-900 font-semibold">{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mb-8" />
        )}

        <Pressable onPress={goToNextStep} className="bg-emerald-500 rounded-2xl py-4 items-center active:bg-emerald-400 mb-8 btn3d btn3d-s">
          <Text className="text-white font-semibold text-base">
            {currentIndex + 1 >= steps.length ? 'Finish routine' : isTimed ? 'Done, next step →' : 'Mark done, next step →'}
          </Text>
        </Pressable>

        <ScrollView>
          {steps.map((step, index) => {
            const isChecked = checkedIds.includes(step.id) || index < currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <Pressable
                key={step.id}
                onPress={() => jumpToStep(index)}
                className={isCurrent ? 'flex-row items-center gap-3 py-2 px-3 bg-indigo-600/10 rounded-xl mb-1' : 'flex-row items-center gap-3 py-2 px-3 mb-1'}
              >
                <View className={isChecked ? 'w-5 h-5 rounded-full bg-emerald-500 items-center justify-center' : 'w-5 h-5 rounded-full border-2 border-stone-300 dark:border-slate-700'}>
                  {isChecked && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className={isChecked ? 'text-slate-400 text-sm line-through flex-1' : isCurrent ? 'text-slate-900 dark:text-slate-100 text-sm font-medium flex-1' : 'text-slate-600 dark:text-slate-300 text-sm flex-1'}>
                  {step.text}
                </Text>
                {step.durationMinutes && <Text className="text-slate-400 text-xs">{step.durationMinutes}m</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
