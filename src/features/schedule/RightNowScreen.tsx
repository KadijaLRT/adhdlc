import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore, selectScheduleItems } from '@/store/index';

function currentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Everything hidden except the current item — no navigation, no list,
 * no earlier/later context. Matches the document's "Right Now" and
 * Focus-mode principle applied specifically to the schedule.
 */
export default function RightNowScreen() {
  const router = useRouter();
  const items = useAppStore(selectScheduleItems);
  const toggleScheduleItemDone = useAppStore((s) => s.toggleScheduleItemDone);

  const now = currentTimeString();
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  // Absent date means "today" (see ScheduleItem's own comment), so
  // only exclude items with an explicit date that isn't today's — a
  // future day's item was previously eligible to show here at all,
  // which is a "Right Now" screen showing something that isn't now.
  const todaysItems = (items || []).filter((i) => !i.date || i.date === todayStr);
  // Same fix as ScheduleScreen: .find() alone walks storage order, not
  // chronological order, so this could show the wrong "current" item.
  const sortedTimedItems = [...todaysItems].filter((i) => i.time).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const current = sortedTimedItems.find((i) => !i.isDone && (i.time || '') >= now) || todaysItems.find((i) => !i.isDone);

  const handleComplete = () => {
    if (current) toggleScheduleItemDone(current.id);
    router?.back?.();
  };

  if (!current) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 items-center justify-center px-8 dark:bg-slate-950">
        <Text className="text-slate-700 text-center text-lg dark:text-slate-300">Nothing scheduled right now.</Text>
        <Pressable onPress={() => router?.back?.()} className="mt-4">
          <Text className="text-indigo-400">Back to schedule</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-slate-500 text-sm uppercase tracking-wider mb-3">Right now</Text>
        <Text className="text-slate-50 text-3xl font-semibold text-center mb-10">{current.label}</Text>
        <Pressable onPress={handleComplete} className="bg-emerald-500 rounded-full py-4 px-12 mb-4 active:bg-emerald-400">
          <Text className="text-white font-semibold text-lg">Done</Text>
        </Pressable>
        <Pressable onPress={() => router?.back?.()} className="py-2">
          <Text className="text-slate-600 text-sm dark:text-slate-300">Back to full schedule</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
