import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectRecoveryLogs } from '@/store/index';
import { STRETCH_ROUTINES, ACTIVE_RECOVERY_ACTIVITIES, type StretchRoutine } from '@/content/recoveryContent';

const SORENESS_LABELS: Record<number, string> = { 1: 'Barely', 2: 'A little', 3: 'Noticeable', 4: 'Sore', 5: 'A lot' };

function todayLocal(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

export default function RecoveryPlanCard({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const recoveryLogs = useAppStore(selectRecoveryLogs);
  const logRecoveryUpdate = useAppStore((s) => s.logRecoveryUpdate);

  const today = todayLocal();
  const todaysLog = recoveryLogs.find((r) => r.date === today);
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(todaysLog?.stretchRoutineId || null);
  const [sleepInput, setSleepInput] = useState(todaysLog?.sleepHours ? String(todaysLog.sleepHours) : '');

  const itemsDoneCount = [
    !!todaysLog?.sorenessLevel,
    !!todaysLog?.stretchDone,
    (todaysLog?.hydrationCups || 0) > 0,
    !!todaysLog?.sleepHours,
  ].filter(Boolean).length;

  // Shared row renderer for both the stretch group and the foam
  // rolling group below — same guided-timer/mark-done pattern either
  // way, just a different pool of routines.
  const renderRoutineRow = (routine: StretchRoutine) => {
    const isExpanded = expandedRoutineId === routine.id;
    const isSelectedToday = todaysLog?.stretchRoutineId === routine.id;
    return (
      <View key={routine.id}>
        <Pressable
          onPress={() => setExpandedRoutineId(isExpanded ? null : routine.id)}
          className={isSelectedToday ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-xl p-3'}
        >
          <View className="flex-row items-center justify-between">
            <Text className={isSelectedToday ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-900 dark:text-slate-100 font-medium'}>{routine.title}</Text>
            <Text className="text-slate-500 text-xs">{routine.durationMinutes} min</Text>
          </View>
        </Pressable>
        {isExpanded && (
          <View className="mt-2 ml-2 gap-1">
            {(routine.steps || []).map((step, index) => (
              <Text key={index} className="text-slate-500 text-sm">• {step.text} ({step.holdSeconds}s)</Text>
            ))}
            <Pressable
              onPress={() => router?.push?.({ pathname: '/fitness/stretch-run', params: { routineId: routine.id } })}
              className="bg-indigo-600 rounded-xl py-2 items-center active:bg-indigo-500 mt-2"
            >
              <Text className="text-white text-xs font-semibold">▶ Start guided timer</Text>
            </Pressable>
            <Pressable
              onPress={() => logRecoveryUpdate(today, { stretchRoutineId: routine.id, stretchDone: true })}
              className="py-2 items-center"
            >
              <Text className="text-slate-500 text-xs">{isSelectedToday && todaysLog?.stretchDone ? 'Done ✓' : 'Or just mark it done'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  if (compact) {
    return (
      <Pressable onPress={() => router?.push?.('/fitness/recovery')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 w-full">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">🧘 Today's Recovery Plan</Text>
        <Text className="text-slate-500 text-xs mb-2">{itemsDoneCount} of 4 logged today</Text>
        <View className="h-1.5 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden">
          <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${(itemsDoneCount / 4) * 100}%` }} />
        </View>
        <Text className="text-indigo-500 text-xs font-medium mt-2">Open recovery plan →</Text>
      </Pressable>
    );
  }

  return (
    <View className="w-full gap-4">
      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">Today's plan</Text>
          <Text className="text-slate-500 text-xs">{itemsDoneCount} of 4</Text>
        </View>
        <View className="h-1.5 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden">
          <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${(itemsDoneCount / 4) * 100}%` }} />
        </View>
      </View>

      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">How sore are you today?</Text>
        <Text className="text-slate-500 text-xs mb-3">Self-reported, just for you — not a diagnosis.</Text>
        <View className="flex-row gap-2">
          {[1, 2, 3, 4, 5].map((level) => {
            const isActive = todaysLog?.sorenessLevel === level;
            return (
              <Pressable
                key={level}
                onPress={() => logRecoveryUpdate(today, { sorenessLevel: level })}
                className={isActive ? 'flex-1 bg-amber-400/20 border-2 border-amber-400 rounded-xl py-2 items-center' : 'flex-1 bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-xl py-2 items-center'}
              >
                <Text className={isActive ? 'text-amber-700 dark:text-amber-400 text-xs font-semibold' : 'text-slate-600 dark:text-slate-300 text-xs'}>{level}</Text>
              </Pressable>
            );
          })}
        </View>
        {todaysLog?.sorenessLevel && <Text className="text-slate-500 text-xs mt-2">{SORENESS_LABELS[todaysLog.sorenessLevel]}</Text>}
        {(todaysLog?.sorenessLevel || 0) >= 4 && (
          <Text className="text-amber-600 dark:text-amber-400 text-xs mt-2">
            Sharp pain, swelling, or soreness lasting more than 4-5 days is worth checking with a doctor rather than pushing through.
          </Text>
        )}
      </View>

      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-3">🧘 Stretch routines</Text>
        <View className="gap-2 mb-3">
          {STRETCH_ROUTINES.filter((r) => r.category === 'stretch').map(renderRoutineRow)}
        </View>
      </View>

      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">🧻 Foam rolling</Text>
        <Text className="text-slate-500 text-xs mb-3">Self-myofascial release — rolling sore or tight spots to help them loosen up.</Text>
        <View className="gap-2 mb-3">
          {STRETCH_ROUTINES.filter((r) => r.category === 'foam_rolling').map(renderRoutineRow)}
        </View>
      </View>

      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">🏃 Active recovery ideas</Text>
        <Text className="text-slate-500 text-xs mb-3">Doable, low-key activities that promote recovery without adding more fatigue — no timer needed, just go do one.</Text>
        <View className="gap-2">
          {ACTIVE_RECOVERY_ACTIVITIES.map((activity) => (
            <View key={activity.id} className="bg-stone-100 dark:bg-slate-800 rounded-xl p-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-slate-900 dark:text-slate-100 font-medium">{activity.emoji} {activity.title}</Text>
                <Text className="text-slate-500 text-xs">~{activity.minutes} min</Text>
              </View>
              <Text className="text-slate-500 text-sm">{activity.blurb}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">💧 Hydration</Text>
          <Text className="text-slate-500 text-xs">{todaysLog?.hydrationCups || 0} cups today</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => logRecoveryUpdate(today, { hydrationCups: Math.max(0, (todaysLog?.hydrationCups || 0) - 1) })}
            className="w-12 h-12 rounded-full bg-stone-100 dark:bg-slate-800 items-center justify-center"
          >
            <Text className="text-slate-600 dark:text-slate-300 text-lg">−</Text>
          </Pressable>
          <Pressable
            onPress={() => logRecoveryUpdate(today, { hydrationCups: (todaysLog?.hydrationCups || 0) + 1 })}
            className="flex-1 bg-indigo-600 rounded-full items-center justify-center active:bg-indigo-500"
          >
            <Text className="text-white text-sm font-semibold">+ Add a cup</Text>
          </Pressable>
        </View>
      </View>

      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-3">😴 Sleep last night</Text>
        <View className="flex-row gap-2">
          <TextInput
            value={sleepInput}
            onChangeText={setSleepInput}
            placeholder="Hours"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            className="flex-1 bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-center"
          />
          <Pressable
            onPress={() => logRecoveryUpdate(today, { sleepHours: Number(sleepInput) || 0 })}
            disabled={!sleepInput.trim()}
            className={sleepInput.trim() ? 'bg-indigo-600 rounded-xl px-5 justify-center active:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700 rounded-xl px-5 justify-center'}
          >
            <Text className="text-white text-sm font-semibold">Log</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
