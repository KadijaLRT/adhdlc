import { View, Text } from 'react-native';
import { useAppStore, selectTasks, selectEnergyLevel, selectStressLogs } from '@/store/index';

function energyToScore(level: string | undefined): number {
  if (level === 'high') return 100;
  if (level === 'medium') return 60;
  if (level === 'low') return 25;
  return 50;
}

// Bug fix: Calm was computed as `100 - energyToScore(stressLevel)`,
// reusing the energy scale inverted. But energyToScore('low') = 25
// (because low *energy* is the bad end of that scale), so even on the
// best possible day — "low" stress — Calm capped at 100 - 25 = 75 and
// could never reach 100. Stress needs its own mapping where "low"
// stress is the good end and actually reaches 100.
function stressToCalmScore(level: string | undefined): number {
  if (level === 'low') return 100;
  if (level === 'medium') return 60;
  if (level === 'high') return 20;
  return 50;
}

function Ring({ label, percent, color }: { label: string; percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(percent || 0, 100));
  return (
    <View className="items-center flex-1">
      <View className="w-20 h-20 rounded-full border-4 border-stone-200 items-center justify-center mb-2 dark:border-slate-700">
        <View className="absolute w-20 h-20 rounded-full border-4" style={{ borderColor: color, opacity: clamped / 100 }} />
        <Text className="text-slate-900 text-sm font-semibold dark:text-slate-100">{clamped}%</Text>
      </View>
      <Text className="text-slate-500 text-xs">{label}</Text>
    </View>
  );
}

export default function ExecutiveFunctionRings() {
  const tasks = useAppStore(selectTasks);
  const energyLevel = useAppStore(selectEnergyLevel);
  const stressLogs = useAppStore(selectStressLogs);

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  // Bug fix: this previously counted every task ever completed,
  // all-time, capped at 100% — so Focus permanently pinned at 100%
  // forever once 5 tasks had been completed in the app's history, and
  // never reflected "today" at all. rewardedAt is already set to the
  // real completion timestamp the first time a task is finished (see
  // taskSlice.ts), so it's used here to scope the count to today only.
  const completedToday = (tasks || []).filter((t) => t?.isComplete && t?.rewardedAt?.slice(0, 10) === today).length;
  const focusScore = Math.min(completedToday * 20, 100);
  const energyScore = energyToScore(energyLevel);
  // Bug fix: this previously had no real input at all — nothing in the
  // app ever called logStressForToday, so every user saw a hardcoded
  // 70% here permanently. StressCheckinCard (added to Home below the
  // energy check-in) now actually feeds this.
  const todaysStress = (stressLogs || []).find((l) => l.date === today);
  const stressScore = todaysStress ? stressToCalmScore(todaysStress.stressLevel) : 70;

  return (
    <View className="bg-white rounded-2xl p-5 w-full flex-row justify-around dark:bg-slate-900">
      <Ring label="Focus" percent={focusScore} color="#818cf8" />
      <Ring label="Energy" percent={energyScore} color="#34d399" />
      <Ring label="Calm" percent={stressScore} color="#fbbf24" />
    </View>
  );
}
