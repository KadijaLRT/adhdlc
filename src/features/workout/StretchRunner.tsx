import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/index';
import { STRETCH_ROUTINES } from '@/content/recoveryContent';
import { resolveCareRoutine } from '@/content/restrictionCare';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Walks through a recovery routine — a stretch routine or a foam
 * rolling routine, both from STRETCH_ROUTINES — one timed hold at a
 * time. "Each side" steps are pre-split into separate Right/Left
 * entries rather than one hold covering both sides, so the countdown
 * never silently means "do this twice."
 */
export default function StretchRunner({ routineId }: { routineId: string }) {
  const router = useRouter();
  const logRecoveryUpdate = useAppStore((s) => s.logRecoveryUpdate);

  const routine = (STRETCH_ROUTINES || []).find((r) => r.id === routineId) || resolveCareRoutine(routineId);
  const steps = routine?.steps || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(steps[0]?.holdSeconds || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = steps[currentIndex];

  useEffect(() => {
    if (currentStep) {
      setSecondsLeft(currentStep.holdSeconds);
      setIsPaused(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    if (!currentStep || isPaused || secondsLeft <= 0) return;
    intervalRef.current = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, secondsLeft, currentStep]);

  const goToNext = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= steps.length) {
      await logRecoveryUpdate(todayLocal(), { stretchRoutineId: routineId, stretchDone: true });
      setFinished(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  if (!routine || steps.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">This routine isn&apos;t available.</Text>
        <Pressable onPress={() => router?.back?.()} className="mt-4">
          <Text className="text-indigo-500">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isFoamRolling = routine.category === 'foam_rolling';

  if (finished) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-4xl mb-4">{isFoamRolling ? '🧻' : '🧘'}</Text>
        <Text className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-2 text-center">Nice work.</Text>
        <Text className="text-slate-500 text-sm text-center mb-8">You finished {routine.title}.</Text>
        <Pressable onPress={() => router?.back?.()} className="bg-emerald-500 rounded-full py-3 px-8 active:bg-emerald-400">
          <Text className="text-white font-semibold">Done ✓</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!currentStep) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">Something went wrong with this routine.</Text>
        <Pressable onPress={() => router?.back?.()} className="mt-4">
          <Text className="text-indigo-500">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const progressPct = currentStep.holdSeconds > 0 ? Math.min(100, ((currentStep.holdSeconds - secondsLeft) / currentStep.holdSeconds) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <View className="flex-1 w-full max-w-md self-center px-6 pt-4">
        <Text className="text-slate-500 text-xs text-center mb-1">{isFoamRolling ? '🧻' : '🧘'} {routine.title}</Text>
        <Text className="text-slate-400 text-xs text-center mb-10">Step {currentIndex + 1} of {steps.length}</Text>

        <Text className="text-slate-900 dark:text-slate-100 text-2xl font-bold text-center mb-8">{currentStep.text}</Text>

        <View className="items-center mb-10">
          <Text className="text-slate-900 dark:text-slate-100 text-7xl font-bold mb-5">{formatCountdown(secondsLeft)}</Text>
          <View className="w-full h-2 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden mb-6">
            <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => setSecondsLeft((s) => s + 15)} className="border-2 border-stone-300 dark:border-slate-700 rounded-full py-3 px-5">
              <Text className="text-slate-600 dark:text-slate-300 font-semibold">+15s</Text>
            </Pressable>
            <Pressable onPress={() => setIsPaused(!isPaused)} className="bg-slate-900 dark:bg-slate-100 rounded-full py-3 px-8">
              <Text className="text-white dark:text-slate-900 font-semibold">{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={goToNext} className="bg-emerald-500 rounded-2xl py-4 items-center active:bg-emerald-400">
          <Text className="text-white font-semibold text-base">
            {currentIndex + 1 >= steps.length ? 'Finish' : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
