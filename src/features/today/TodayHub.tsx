import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectTasks, selectRoutines, selectStreaks, selectEnergyLevel, selectMomentumLog } from '@/store/index';
import { suggestNextTask } from '@/features/tasks/suggestNextTask';
import { Heading } from '@/shared/components/Heading';

/**
 * "Today" absorbs Tasks, Focus, and Routines into one hub rather than
 * three competing tabs — matching the "one primary action per screen"
 * and "modules launched from a hub" principles. Each still has its own
 * full screen underneath; this is the single entry point into all of
 * them, always leading with the one thing to do next.
 */
export default function TodayHub() {
  const router = useRouter();
  const tasks = useAppStore(selectTasks);
  const routines = useAppStore(selectRoutines);
  const streaks = useAppStore(selectStreaks);
  const energyLevel = useAppStore(selectEnergyLevel);
  const momentumLog = useAppStore(selectMomentumLog);

  const suggested = suggestNextTask(tasks, energyLevel);
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const momentumToday = (momentumLog || []).filter((m) => m.date === today).length;
  const pendingRoutineCount = (routines || []).filter((r) => {
    const streak = (streaks || []).find((s) => s.routineId === r.id);
    return streak?.lastCompletedDate !== today;
  }).length;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Today</Heading>
        <Text className="text-slate-500 text-sm mb-6">One thing at a time.</Text>

        {momentumToday > 0 && (
          <View className="bg-white dark:bg-slate-900 rounded-xl p-3 mb-4">
            <Text className="text-slate-500 text-xs">
              {momentumToday} small step{momentumToday === 1 ? '' : 's'} today — opening a task, starting a session, all of it counts.
            </Text>
          </View>
        )}

        {suggested ? (
          <Pressable onPress={() => router?.push?.(`/task/${suggested.id}`)} className="bg-indigo-600 rounded-2xl p-5 mb-4 active:bg-indigo-500">
            <Text className="text-indigo-100 text-xs uppercase tracking-wider mb-1">Next up</Text>
            <Text className="text-white text-lg font-semibold">{suggested.title}</Text>
          </Pressable>
        ) : (
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-4">
            <Text className="text-slate-700 dark:text-slate-300 text-sm">Nothing urgent right now — a genuinely open moment.</Text>
          </View>
        )}

        <View className="gap-3">
          <Pressable onPress={() => router?.push?.('/tasks')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm">✅ All tasks</Text>
            <Text className="text-slate-500 text-xs">{(tasks || []).filter((t) => !t.isComplete).length} open</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/focus-picker')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm">🎯 Start a focus session</Text>
            <Text className="text-slate-500 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/routines')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm">🔁 Routines</Text>
            <Text className="text-slate-500 text-xs">{pendingRoutineCount > 0 ? `${pendingRoutineCount} left today` : 'all done'}</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/schedule')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm">🕐 Schedule</Text>
            <Text className="text-slate-500 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/school')} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm">📖 School</Text>
            <Text className="text-slate-500 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/stuck')} className="bg-amber-400/10 border-2 border-amber-400 rounded-2xl p-4">
            <Text className="text-amber-700 dark:text-amber-400 text-sm text-center font-medium">I&apos;m feeling stuck</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
