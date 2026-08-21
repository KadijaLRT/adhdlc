import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';

/**
 * Fits inline in a set row, replacing a plain reps number input for a
 * time-based exercise (Plank, Wall Sit, Mountain Climber, etc.) — not
 * a full-screen or multi-step timer like InlineStepTimer.tsx (built
 * for a warm-up sequence with its own "Step X of Y" chrome), just a
 * single countdown plus a compact start/pause/reset control sized for
 * one column of a table row.
 *
 * Reports the actual held duration back via onComplete (as a plain
 * number of seconds) once the countdown reaches zero, OR if stopped
 * early — a real hold that came up short of the target is still worth
 * recording as what actually happened, not discarded just because it
 * didn't reach the full countdown. The caller writes this into the
 * same `reps` field a rep-based exercise already uses, so nothing else
 * about how a set is logged, autosaved, or shown in history needs to
 * change. Only ever rendered for a set that's still in progress — once
 * a set is marked done, the caller shows the logged duration as plain
 * text instead of remounting this (which would just show a fresh
 * countdown, not what was actually held).
 */
export default function InlineSetTimer({
  targetSeconds,
  onComplete,
}: {
  targetSeconds: number;
  onComplete: (heldSeconds: number) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(targetSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    if (secondsLeft <= 0) {
      setIsRunning(false);
      onComplete(targetSeconds);
      return;
    }
    intervalRef.current = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately re-runs only on isRunning/secondsLeft, not on every render
  }, [isRunning, secondsLeft]);

  const handleStartPause = () => {
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(targetSeconds);
  };

  // Stopping early still counts, and still gets logged — a 25-second
  // hold on a 30-second target plank is real progress, not a failure
  // to discard. Matches this app's non-punitive approach elsewhere:
  // there's no "you didn't finish" state, just what actually happened.
  const handleStopEarly = () => {
    setIsRunning(false);
    const held = Math.max(0, targetSeconds - secondsLeft);
    if (held > 0) onComplete(held);
  };

  const progressPct = targetSeconds > 0 ? Math.min(100, ((targetSeconds - secondsLeft) / targetSeconds) * 100) : 0;
  const isComplete = secondsLeft <= 0;

  return (
    <View className="items-center">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">
        {secondsLeft}s
      </Text>
      <View className="w-full h-1 rounded-full bg-stone-200 dark:bg-slate-700 overflow-hidden mb-1">
        <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
      </View>
      <View className="flex-row gap-1">
        <Pressable onPress={handleStartPause} className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800">
          <Text className="text-slate-600 dark:text-slate-300 text-[10px] font-semibold">{isRunning ? '⏸' : isComplete ? '↺' : '▶'}</Text>
        </Pressable>
        {(isRunning || secondsLeft < targetSeconds) && !isComplete && (
          <Pressable onPress={handleStopEarly} className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800">
            <Text className="text-slate-600 dark:text-slate-300 text-[10px] font-semibold">✓</Text>
          </Pressable>
        )}
        {secondsLeft < targetSeconds && (
          <Pressable onPress={handleReset} className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800">
            <Text className="text-slate-600 dark:text-slate-300 text-[10px] font-semibold">⟲</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
