import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';

type ModeKey = '25/5' | '45/10' | '15/3';
const MODES: Record<ModeKey, { workMin: number; breakMin: number; label: string }> = {
  '25/5': { workMin: 25, breakMin: 5, label: '25 / 5' },
  '45/10': { workMin: 45, breakMin: 10, label: '45 / 10' },
  '15/3': { workMin: 15, breakMin: 3, label: '15 / 3 (short)' },
};
const MODE_KEYS: ModeKey[] = ['25/5', '45/10', '15/3'];

export default function PomodoroTimer() {
  const [mode, setMode] = useState<ModeKey>('25/5');
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [secondsLeft, setSecondsLeft] = useState(MODES['25/5'].workMin * 60);
  const [running, setRunning] = useState(false);
  const [justSwitched, setJustSwitched] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      const nextPhase = phase === 'work' ? 'break' : 'work';
      const current = MODES[mode];
      setPhase(nextPhase);
      setSecondsLeft((nextPhase === 'work' ? current.workMin : current.breakMin) * 60);
      setJustSwitched(true);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setJustSwitched(false), 4000);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, secondsLeft, phase, mode]);

  const handleModeChange = (m: ModeKey) => {
    setMode(m);
    setPhase('work');
    setSecondsLeft(MODES[m].workMin * 60);
    setRunning(false);
    setJustSwitched(false);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 surf3d">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-3">⏱️ Pomodoro Timer</Text>

      {justSwitched && (
        <View className={phase === 'break' ? 'bg-emerald-400/20 border-2 border-emerald-400 rounded-xl p-3 mb-3' : 'bg-indigo-400/20 border-2 border-indigo-400 rounded-xl p-3 mb-3'}>
          <Text className={phase === 'break' ? 'text-emerald-700 dark:text-emerald-400 text-sm font-semibold text-center' : 'text-indigo-700 dark:text-indigo-300 text-sm font-semibold text-center'}>
            {phase === 'break' ? '☕ Break time' : '🎯 Back to focus'}
          </Text>
        </View>
      )}

      <View className="flex-row gap-2 mb-4">
        {MODE_KEYS.map((m) => (
          <Pressable
            key={m}
            onPress={() => handleModeChange(m)}
            className={mode === m ? 'flex-1 bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 items-center' : 'flex-1 bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-2 items-center'}
          >
            <Text className={mode === m ? 'text-emerald-700 dark:text-emerald-400 text-xs font-medium' : 'text-slate-700 dark:text-slate-300 text-xs font-medium'}>{MODES[m].label}</Text>
          </Pressable>
        ))}
      </View>

      <View className="items-center mb-4">
        <Text className="text-slate-400 text-xs uppercase tracking-wider mb-1">{phase === 'work' ? 'Focus' : 'Break'}</Text>
        <Text className="text-slate-900 dark:text-slate-100 text-5xl font-bold">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Text>
      </View>

      <Pressable onPress={() => setRunning((r) => !r)} className={running ? 'bg-amber-500 rounded-xl py-3 items-center active:bg-amber-400 btn3d btn3d-a' : 'bg-indigo-600 rounded-xl py-3 items-center active:bg-indigo-500 btn3d btn3d-p'}>
        <Text className="text-white text-sm font-semibold">{running ? 'Pause' : 'Start'}</Text>
      </Pressable>
    </View>
  );
}
