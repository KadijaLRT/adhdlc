import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { RSD_STEPS } from '@/content/toolkitContent';

/**
 * Guided 5-step RSD protocol, anchored on the 90-second rule: the acute
 * chemical surge of an emotion is neurologically brief. The only job
 * during that step is to not act for 90 seconds.
 */
export default function RSDProtocol({ onClose }: { onClose?: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = RSD_STEPS[stepIndex];
  const isTimerStep = stepIndex === 2; // "The 90-Second Rule"

  useEffect(() => {
    if (!timerRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  const handleNext = () => {
    if (stepIndex >= RSD_STEPS.length - 1) {
      onClose?.();
      return;
    }
    setStepIndex((i) => i + 1);
    setSecondsLeft(90);
    setTimerRunning(false);
  };

  // Bug fix: "Next step" was always tappable, including during the
  // 90-second-rule step before the timer had actually finished — one
  // tap skipped straight past the entire point of that step (don't act
  // for 90 seconds), defeating the exercise it exists to walk someone
  // through. Only this specific step is gated; every other step still
  // advances freely.
  const isWaitingOnTimer = isTimerStep && timerRunning && secondsLeft > 0;

  if (!step) return null;

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1">Step {step.n} of {RSD_STEPS.length}</Text>
      <Text className="text-slate-900 dark:text-slate-100 text-lg font-semibold mb-2">{step.title}</Text>
      <Text className="text-slate-600 dark:text-slate-300 text-sm leading-5 mb-4">{step.desc}</Text>

      {isTimerStep && (
        <View className="items-center mb-4">
          {!timerRunning && secondsLeft === 90 ? (
            <Pressable onPress={() => setTimerRunning(true)} className="bg-indigo-600 rounded-full py-3 px-8 active:bg-indigo-500">
              <Text className="text-white text-sm font-semibold">Start 90 seconds</Text>
            </Pressable>
          ) : (
            <Text className="text-indigo-600 dark:text-indigo-400 text-4xl font-bold">{secondsLeft}</Text>
          )}
        </View>
      )}

      <Pressable onPress={handleNext} disabled={isWaitingOnTimer} className={isWaitingOnTimer ? 'bg-slate-300 dark:bg-slate-700 rounded-xl py-3 items-center' : 'bg-emerald-500 rounded-xl py-3 items-center active:bg-emerald-400'}>
        <Text className={isWaitingOnTimer ? 'text-slate-500 text-sm font-semibold' : 'text-white text-sm font-semibold'}>
          {isWaitingOnTimer ? `Wait for it (${secondsLeft}s)` : stepIndex >= RSD_STEPS.length - 1 ? 'Done' : 'Next step'}
        </Text>
      </Pressable>
    </View>
  );
}
