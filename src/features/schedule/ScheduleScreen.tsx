import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectScheduleItems, selectTasks, selectRoutines, selectStreaks, selectEnergyLevel, type ScheduleItem } from '@/store/index';
import { suggestNextTask } from '@/features/tasks/suggestNextTask';
import { Heading } from '@/shared/components/Heading';
import { parseLocalDate, toLocalDateString } from '@/shared/formatDate';
import { generateId } from '@/shared/generateId';

const SHIFT_OPTIONS = [15, 30, 60];
const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

type TimeBucket = 'anytime' | 'morning' | 'afternoon' | 'evening';
const BUCKET_ORDER: TimeBucket[] = ['anytime', 'morning', 'afternoon', 'evening'];
const BUCKET_LABELS: Record<TimeBucket, { label: string; icon: string }> = {
  anytime: { label: 'Anytime', icon: '🕐' },
  morning: { label: 'Morning', icon: '☀️' },
  afternoon: { label: 'Afternoon', icon: '🌤️' },
  evening: { label: 'Evening', icon: '🌙' },
};

function bucketForTime(time?: string): TimeBucket {
  if (!time) return 'anytime';
  const hour = Number(time.split(':')[0]);
  if (isNaN(hour)) return 'anytime';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function currentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function todayLocal(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

/** The 7 dates of the current week, Sunday first, as YYYY-MM-DD strings. */
function getWeekDates(): string[] {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return toLocalDateString(d);
  });
}

export default function ScheduleScreen() {
  const router = useRouter();
  const items = useAppStore(selectScheduleItems);
  const addScheduleItem = useAppStore((s) => s.addScheduleItem);
  const toggleScheduleItemDone = useAppStore((s) => s.toggleScheduleItemDone);
  const removeScheduleItem = useAppStore((s) => s.removeScheduleItem);
  const shiftRemainingSchedule = useAppStore((s) => s.shiftRemainingSchedule);
  const tasks = useAppStore(selectTasks);
  const routines = useAppStore(selectRoutines);
  const streaks = useAppStore(selectStreaks);
  const energyLevel = useAppStore(selectEnergyLevel);

  const today = todayLocal();
  const weekDates = useMemo(() => getWeekDates(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [newLabel, setNewLabel] = useState('');
  const [newTime, setNewTime] = useState('');
  const [showBehindOptions, setShowBehindOptions] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<TimeBucket>>(new Set());

  const isToday = selectedDate === today;
  const itemsForSelectedDay = useMemo(
    () => (items || []).filter((i) => (i.date || today) === selectedDate),
    [items, selectedDate, today]
  );

  const groupedByBucket = useMemo(() => {
    const groups: Record<TimeBucket, ScheduleItem[]> = { anytime: [], morning: [], afternoon: [], evening: [] };
    for (const item of itemsForSelectedDay) {
      groups[bucketForTime(item.time)].push(item);
    }
    for (const bucket of BUCKET_ORDER) {
      groups[bucket].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }
    return groups;
  }, [itemsForSelectedDay]);

  const now = currentTimeString();
  const timedItems = itemsForSelectedDay.filter((i) => i.time);
  // .find() alone walks storage order, not chronological order — sort
  // by time first so "next up" is genuinely the next thing chronologically,
  // not just whichever matching item happens to be stored first.
  const sortedTimedItems = [...timedItems].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const nextUp = isToday
    ? (sortedTimedItems.find((i) => !i.isDone && (i.time || '') >= now) || itemsForSelectedDay.find((i) => !i.isDone))
    : null;

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    addScheduleItem({ id: generateId('sched'), label: newLabel.trim(), time: newTime.trim() || undefined, date: selectedDate, refKind: 'freeform' });
    setNewLabel('');
    setNewTime('');
  };

  const toggleBucket = (bucket: TimeBucket) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket); else next.add(bucket);
      return next;
    });
  };

  // Pulls what already exists (the one suggested task, and routines not
  // yet done today) into the timeline at sensible default times, rather
  // than requiring everything to be typed in by hand. Only offered for
  // today — "populate" doesn't make sense for a future day where
  // nothing's overdue yet.
  const handlePopulateFromToday = () => {
    const existingRefIds = new Set((items || []).map((i) => i.refId).filter(Boolean));

    const suggested = suggestNextTask(tasks, energyLevel);
    if (suggested && !existingRefIds.has(suggested.id)) {
      addScheduleItem({ id: `sched-task-${suggested.id}`, label: suggested.title, refId: suggested.id, refKind: 'task', date: today, time: '09:00' });
    }

    const pendingRoutines = (routines || []).filter((r) => {
      const streak = (streaks || []).find((s) => s.routineId === r.id);
      return streak?.lastCompletedDate !== today && !existingRefIds.has(r.id);
    });
    pendingRoutines.slice(0, 2).forEach((routine, index) => {
      addScheduleItem({
        id: `sched-routine-${routine.id}`,
        label: `${routine.emoji} ${routine.title}`,
        refId: routine.id,
        refKind: 'routine',
        date: today,
        time: index === 0 ? '13:00' : '18:00',
      });
    });
  };

  const dayLabel = (date: string) => {
    if (date === today) return 'Today';
    const d = parseLocalDate(date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date === toLocalDateString(yesterday)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Schedule</Heading>
        <Text className="text-slate-500 text-sm mb-4">What's next, not just what's stored.</Text>

        {viewMode === 'day' && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={weekDates}
            keyExtractor={(d) => d}
            contentContainerStyle={{ gap: 8, marginBottom: 16 }}
            renderItem={({ item: date, index }) => {
              const isActive = date === selectedDate;
              const isThisToday = date === today;
              const dayItemCount = (items || []).filter((i) => (i.date || today) === date).length;
              return (
                <Pressable
                  onPress={() => setSelectedDate(date)}
                  className={isActive ? 'bg-indigo-600/10 border-2 border-indigo-500 rounded-2xl p-2.5 items-center w-16' : isThisToday ? 'bg-white dark:bg-slate-900 border-2 border-indigo-300 rounded-2xl p-2.5 items-center w-16' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-2xl p-2.5 items-center w-16'}
                >
                  <Text className={isActive ? 'text-indigo-700 dark:text-indigo-300 text-xs font-bold' : 'text-slate-500 text-xs font-bold'}>{WEEKDAY_LABELS[index] || ''}</Text>
                  <Text className={isActive ? 'text-indigo-700 dark:text-indigo-300 text-sm font-semibold mt-1' : 'text-slate-700 dark:text-slate-300 text-sm mt-1'}>{parseLocalDate(date).getDate()}</Text>
                  {dayItemCount > 0 && <View className={isActive ? 'w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1' : 'w-1.5 h-1.5 rounded-full bg-slate-400 mt-1'} />}
                </Pressable>
              );
            }}
          />
        )}

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold">{viewMode === 'day' ? dayLabel(selectedDate) : 'This week'}</Text>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router?.push?.('/schedule/countdown')}>
              <Text className="text-indigo-500 text-xs font-medium">🎉 Countdown</Text>
            </Pressable>
            <Pressable onPress={() => setViewMode(viewMode === 'day' ? 'week' : 'day')}>
              <Text className="text-indigo-500 text-xs font-medium">{viewMode === 'day' ? 'View full week →' : '← Back to day view'}</Text>
            </Pressable>
          </View>
        </View>

        {viewMode === 'week' ? (
          <View className="gap-3">
            {weekDates.map((date, index) => {
              const dayItems = (items || []).filter((i) => (i.date || today) === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              const isThisToday = date === today;
              return (
                <Pressable
                  key={date}
                  onPress={() => { setSelectedDate(date); setViewMode('day'); }}
                  className={isThisToday ? 'bg-white dark:bg-slate-900 border-2 border-indigo-400 rounded-2xl p-4' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-2xl p-4'}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className={isThisToday ? 'text-indigo-700 dark:text-indigo-300 text-sm font-semibold' : 'text-slate-900 dark:text-slate-100 text-sm font-semibold'}>
                      {WEEKDAY_LABELS[index] || ''} · {dayLabel(date)}
                    </Text>
                    <Text className="text-slate-500 text-xs">{dayItems.length} item{dayItems.length === 1 ? '' : 's'}</Text>
                  </View>
                  {dayItems.length === 0 ? (
                    <Text className="text-slate-400 text-xs">Nothing scheduled</Text>
                  ) : (
                    <View className="gap-1">
                      {dayItems.map((item) => (
                        <View key={item.id} className="flex-row items-center gap-2">
                          <Text className="text-slate-500 text-xs w-12">{item.time || 'Anytime'}</Text>
                          <Text className={item.isDone ? 'text-slate-400 text-xs line-through flex-1' : 'text-slate-700 dark:text-slate-300 text-xs flex-1'}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <>
            {nextUp && (
              <Pressable onPress={() => router?.push?.('/schedule/right-now')} className="bg-indigo-600 rounded-2xl p-5 mb-4 active:bg-indigo-500">
                <Text className="text-indigo-100 text-xs uppercase tracking-wider mb-1">Next up{nextUp.time ? ` · ${nextUp.time}` : ''}</Text>
                <Text className="text-white text-lg font-semibold">{nextUp.label}</Text>
              </Pressable>
            )}

            {isToday && (
              <>
                <Pressable onPress={() => setShowBehindOptions(!showBehindOptions)} className="border-2 border-amber-400 rounded-xl py-3 mb-2 items-center">
                  <Text className="text-amber-700 text-sm font-medium dark:text-amber-400">I&apos;m running behind</Text>
                </Pressable>
                {showBehindOptions && (
                  <View className="flex-row gap-2 mb-4">
                    {(SHIFT_OPTIONS || []).map((mins) => (
                      <Pressable
                        key={mins}
                        onPress={() => { shiftRemainingSchedule(mins); setShowBehindOptions(false); }}
                        className="flex-1 bg-white rounded-xl py-2 items-center dark:bg-slate-900"
                      >
                        <Text className="text-slate-700 text-sm dark:text-slate-300">{mins} min</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {itemsForSelectedDay.length === 0 && (
                  <Pressable onPress={handlePopulateFromToday} className="border-2 border-indigo-500 rounded-xl py-3 mb-4 items-center">
                    <Text className="text-indigo-700 text-sm font-medium dark:text-indigo-300">Fill in today's tasks and routines</Text>
                  </Pressable>
                )}
              </>
            )}

            <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900">
              <Text className="text-slate-700 text-sm font-medium mb-2 dark:text-slate-300">Add to {isToday ? 'today' : dayLabel(selectedDate).toLowerCase()}</Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#64748b"
                  className="w-20 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 text-center dark:text-slate-100 dark:bg-slate-800"
                />
                <TextInput
                  value={newLabel}
                  onChangeText={setNewLabel}
                  placeholder="What's happening..."
                  placeholderTextColor="#64748b"
                  onSubmitEditing={handleAdd}
                  className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
                />
                <Pressable onPress={handleAdd} className="bg-indigo-600 rounded-xl px-4 justify-center">
                  <Text className="text-white font-semibold">Add</Text>
                </Pressable>
              </View>
              <Text className="text-slate-400 text-[11px] mt-2">Leave the time blank for something you'll get to whenever — it'll sit in Anytime instead of a specific slot.</Text>
            </View>

            {itemsForSelectedDay.length === 0 ? (
              <Text className="text-slate-500 text-center mt-6">Nothing on {isToday ? "today's" : "this day's"} timeline yet.</Text>
            ) : (
              <View className="gap-3">
                {BUCKET_ORDER.map((bucket) => {
                  const bucketItems = groupedByBucket[bucket];
                  if (bucketItems.length === 0) return null;
                  const isCollapsed = collapsedBuckets.has(bucket);
                  return (
                    <View key={bucket}>
                      <Pressable onPress={() => toggleBucket(bucket)} className="flex-row items-center gap-2 mb-2">
                        <Text className="text-slate-500 text-xs font-bold uppercase tracking-wide">
                          {BUCKET_LABELS[bucket].icon} {BUCKET_LABELS[bucket].label} ({bucketItems.length})
                        </Text>
                        <Text className="text-slate-400 text-xs">{isCollapsed ? '▸' : '▾'}</Text>
                      </Pressable>
                      {!isCollapsed && (
                        <View className="gap-2">
                          {bucketItems.map((item) => (
                            <Pressable key={item.id} onPress={() => toggleScheduleItemDone(item.id)} className="bg-white rounded-xl p-3 flex-row items-center gap-3 dark:bg-slate-900">
                              <View className={item.isDone ? 'w-5 h-5 rounded-full bg-emerald-500 items-center justify-center' : 'w-5 h-5 rounded-full border-2 border-stone-300'}>
                                {item.isDone && <Text className="text-white text-xs">✓</Text>}
                              </View>
                              {item.time && <Text className="text-slate-500 text-xs w-12">{item.time}</Text>}
                              <Text className={item.isDone ? 'text-slate-500 line-through flex-1' : 'text-slate-900 dark:text-slate-100 flex-1'}>{item.label}</Text>
                              <Pressable onPress={() => removeScheduleItem(item.id)}>
                                <Text className="text-slate-700 text-xs dark:text-slate-300">✕</Text>
                              </Pressable>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
