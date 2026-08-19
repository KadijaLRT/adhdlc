import { View, Text, ScrollView } from 'react-native';
import { useAppStore, selectCourses, selectAssignments, selectDateFormat } from '@/store/index';
import { Heading } from '@/shared/components/Heading';
import { formatDate, parseLocalDate } from '@/shared/formatDate';

/**
 * Groups every assignment by month and due date, color-coded by course,
 * so the whole semester is scannable at once. No calendar-grid library
 * dependency needed — a grouped list conveys the same "what's coming up
 * and when" information with far less code and no new dependency risk.
 */
export default function SemesterCalendar() {
  const courses = useAppStore(selectCourses);
  const assignments = useAppStore(selectAssignments);
  const dateFormat = useAppStore(selectDateFormat);

  const sorted = [...(assignments || [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const grouped = new Map<string, typeof sorted>();
  for (const a of sorted) {
    const monthKey = (a.dueDate || '').slice(0, 7); // YYYY-MM
    const list = grouped.get(monthKey) || [];
    list.push(a);
    grouped.set(monthKey, list);
  }

  const courseColor = (courseId: string): string => {
    const colors = ['#818cf8', '#34d399', '#fbbf24', '#38bdf8', '#f472b6', '#a78bfa'];
    const index = (courses || []).findIndex((c) => c.id === courseId);
    return colors[index % colors.length] || '#818cf8';
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Semester</Heading>
        <Text className="text-slate-500 text-sm mb-6">Everything due, at a glance.</Text>

        {grouped.size === 0 && <Text className="text-slate-500 text-center mt-6">Nothing on the calendar yet.</Text>}

        {Array.from(grouped.entries()).map(([month, items]) => (
          <View key={month} className="mb-5">
            <Text className="text-slate-500 text-xs font-medium mb-2">
              {parseLocalDate(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <View className="gap-2">
              {items.map((a) => {
                const course = (courses || []).find((c) => c.id === a.courseId);
                return (
                  <View key={a.id} className="bg-white rounded-xl p-3 flex-row items-center gap-3 dark:bg-slate-900">
                    <View style={{ width: 4, height: '100%', minHeight: 32, backgroundColor: courseColor(a.courseId), borderRadius: 2 }} />
                    <View className="flex-1">
                      <Text className={a.isComplete ? 'text-slate-500 line-through text-sm' : 'text-slate-900 text-sm'}>{a.title}</Text>
                      <Text className="text-slate-500 text-xs">{course ? `${course.emoji} ${course.name} · ` : ''}{formatDate(a.dueDate, dateFormat)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
