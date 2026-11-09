import { View, Text } from 'react-native';
import { useAppStore, selectTasks } from '@/store/index';

const WEEKLY_TASK_GOAL = 10;

function getStartOfWeek(): Date {
  const now = new Date();
  const start = new Date(now.setDate(now.getDate() - now.getDay()));
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function WeeklyChallengeCard() {
  const tasks = useAppStore(selectTasks);
  const startOfWeek = getStartOfWeek();
  const completedThisWeek = (tasks || []).filter((t) => t?.isComplete && t?.createdAt && new Date(t.createdAt) >= startOfWeek).length;
  const percent = Math.round(Math.min(completedThisWeek / WEEKLY_TASK_GOAL, 1) * 100);

  return (
    <View className="bg-white rounded-2xl p-5 w-full dark:bg-slate-900 surf3d">
      <Text className="text-slate-900 text-base font-semibold mb-1 dark:text-slate-100">This Week</Text>
      <Text className="text-slate-500 text-xs mb-4">Cumulative progress, no penalty for a slow day.</Text>
      <View className="h-3 bg-stone-100 rounded-full overflow-hidden mb-2 dark:bg-slate-800">
        <View className="h-3 bg-indigo-500 rounded-full" style={{ width: `${percent}%` }} />
      </View>
      <Text className="text-slate-700 text-sm dark:text-slate-300">{completedThisWeek} of {WEEKLY_TASK_GOAL} tasks completed</Text>
    </View>
  );
}
