import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectAssignments, selectCourses } from '@/store/index';
import { toLocalDateString } from '@/shared/formatDate';

/**
 * The always-visible half of "persistent" — a real phone notification
 * only fires once and can be dismissed or missed; this stays on the
 * Home screen for as long as something is actually due today or
 * overdue, with no dismiss action of its own (marking the assignment
 * done, from its own detail screen, is what makes it go away — the
 * same "no separate dismiss state to manage" reasoning the low-energy
 * banner elsewhere in this app already uses).
 */
export default function DueAssignmentsCard() {
  const router = useRouter();
  const assignments = useAppStore(selectAssignments);
  const courses = useAppStore(selectCourses);

  const today = toLocalDateString(new Date());
  const relevant = (assignments || [])
    .filter((a) => !a.isComplete && a.dueDate && a.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)); // most overdue first — that's the one that needs attention soonest

  if (!relevant.length) return null;

  const overdueCount = relevant.filter((a) => a.dueDate < today).length;
  const dueTodayCount = relevant.length - overdueCount;

  return (
    <View className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-4 mb-4">
      <Text className="text-amber-900 dark:text-amber-200 text-sm font-semibold mb-2">
        📚 {dueTodayCount > 0 && `${dueTodayCount} due today`}{dueTodayCount > 0 && overdueCount > 0 && ' · '}{overdueCount > 0 && `${overdueCount} overdue`}
      </Text>
      <View className="gap-2">
        {relevant.slice(0, 3).map((a) => {
          const course = (courses || []).find((c) => c.id === a.courseId);
          const isOverdue = a.dueDate < today;
          return (
            <Pressable
              key={a.id}
              onPress={() => router?.push?.(`/school/assignment/${a.id}`)}
              className="bg-white dark:bg-slate-900 rounded-xl px-3 py-2 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-2">
                <Text className="text-slate-900 dark:text-slate-100 text-sm" numberOfLines={1}>{a.title}</Text>
                {course && <Text className="text-slate-500 text-xs" numberOfLines={1}>{course.emoji} {course.name}</Text>}
              </View>
              <Text className={isOverdue ? 'text-red-500 text-xs font-medium' : 'text-amber-600 dark:text-amber-400 text-xs font-medium'}>
                {isOverdue ? 'Overdue' : 'Today'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {relevant.length > 3 && (
        <Pressable onPress={() => router?.push?.('/school')} className="mt-2">
          <Text className="text-amber-700 dark:text-amber-400 text-xs">+{relevant.length - 3} more →</Text>
        </Pressable>
      )}
    </View>
  );
}
