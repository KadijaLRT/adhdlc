import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, selectCountdownEvents, selectDateFormat } from '@/store/index';
import { formatDate, parseLocalDate, toLocalDateString } from '@/shared/formatDate';
import { Heading } from '@/shared/components/Heading';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';
import { generateId } from '@/shared/generateId';

const EMOJI_OPTIONS = ['🎂', '💰', '🎉', '🎁', '💍', '✈️', '🎓', '📅'];

function todayLocal(): string {
  return toLocalDateString(new Date());
}

/** For yearly-recurring events, rolls the date forward to the next future occurrence, keeping month/day fixed. */
function nextOccurrence(dateStr: string, isRecurringYearly?: boolean): string {
  if (!isRecurringYearly) return dateStr;
  const today = parseLocalDate(todayLocal());
  const original = parseLocalDate(dateStr);
  const candidate = new Date(original);
  candidate.setFullYear(today.getFullYear());
  if (candidate < today) candidate.setFullYear(today.getFullYear() + 1);
  return toLocalDateString(candidate);
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export default function CountdownScreen() {
  const events = useAppStore(selectCountdownEvents);
  const dateFormat = useAppStore(selectDateFormat);
  const addCountdownEvent = useAppStore((s) => s.addCountdownEvent);
  const removeCountdownEvent = useAppStore((s) => s.removeCountdownEvent);

  const [showAddForm, setShowAddForm] = useState(false);
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0] || '🎉');
  const [dateInput, setDateInput] = useState('');
  const [isRecurringYearly, setIsRecurringYearly] = useState(false);

  const today = todayLocal();

  const sortedEvents = useMemo(() => {
    return [...(events || [])]
      .map((event) => ({ ...event, effectiveDate: nextOccurrence(event.date, event.isRecurringYearly) }))
      .sort((a, b) => daysBetween(today, a.effectiveDate) - daysBetween(today, b.effectiveDate));
  }, [events, today]);

  const handleAdd = async () => {
    if (!label.trim() || !dateInput.trim()) return;
    const parsed = parseLocalDate(dateInput.trim());
    if (isNaN(parsed.getTime())) return;
    await addCountdownEvent({
      id: generateId('countdown'),
      label: label.trim(),
      emoji,
      date: toLocalDateString(parsed),
      isRecurringYearly,
    });
    setLabel('');
    setDateInput('');
    setIsRecurringYearly(false);
    setShowAddForm(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="w-full max-w-md self-center">
          <Heading className="mb-1 mt-2">Countdown</Heading>
          <Text className="text-slate-500 text-sm mb-6">Birthdays, payday, trips — however far off they are.</Text>

          {!showAddForm ? (
            <Pressable onPress={() => setShowAddForm(true)} className="bg-indigo-600 rounded-2xl py-3 items-center mb-6 active:bg-indigo-500">
              <Text className="text-white text-sm font-semibold">+ Add an event</Text>
            </Pressable>
          ) : (
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6">
              <View className="flex-row gap-2 mb-3">
                {EMOJI_OPTIONS.map((option) => (
                  <Pressable key={option} onPress={() => setEmoji(option)} className={emoji === option ? 'bg-indigo-600/20 rounded-lg p-2' : 'p-2'}>
                    <Text className="text-lg">{option}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="What's coming up?"
                placeholderTextColor="#64748b"
                className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-3"
              />
              <TextInput
                value={dateInput}
                onChangeText={setDateInput}
                placeholder="Date (e.g. 2026-09-06)"
                placeholderTextColor="#64748b"
                className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-3"
              />
              <Pressable onPress={() => setIsRecurringYearly(!isRecurringYearly)} className="flex-row items-center gap-2 mb-4">
                <View className={isRecurringYearly ? 'w-5 h-5 rounded-md bg-emerald-500 items-center justify-center' : 'w-5 h-5 rounded-md border-2 border-stone-300 dark:border-slate-700'}>
                  {isRecurringYearly && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className="text-slate-600 dark:text-slate-300 text-sm">Repeats every year (birthdays, holidays, anniversaries)</Text>
              </Pressable>
              <View className="flex-row gap-2">
                <Pressable onPress={handleAdd} disabled={!label.trim() || !dateInput.trim()} className={label.trim() && dateInput.trim() ? 'flex-1 bg-emerald-500 rounded-xl py-2.5 items-center active:bg-emerald-400' : 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-2.5 items-center'}>
                  <Text className="text-white text-sm font-semibold">Add</Text>
                </Pressable>
                <Pressable onPress={() => setShowAddForm(false)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center">
                  <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View className="gap-2">
            {sortedEvents.length === 0 && (
              <Text className="text-slate-500 text-center mt-6">No events yet. Add one above.</Text>
            )}
            {sortedEvents.map((event) => {
              const days = daysBetween(today, event.effectiveDate);
              const isPast = days < 0 && !event.isRecurringYearly;
              return (
                <View key={event.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Text className="text-2xl">{event.emoji}</Text>
                    <View className="flex-1">
                      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{event.label}</Text>
                      <Text className="text-slate-500 text-xs">{formatDate(event.effectiveDate, dateFormat)}</Text>
                    </View>
                  </View>
                  <View className="items-end mr-2">
                    <Text className={isPast ? 'text-slate-400 text-lg font-bold' : 'text-indigo-600 dark:text-indigo-400 text-lg font-bold'}>
                      {Math.abs(days)}
                    </Text>
                    <Text className="text-slate-500 text-[10px]">{days < 0 ? 'Days Since' : days === 0 ? 'Today!' : 'Days Until'}</Text>
                  </View>
                  <Pressable onPress={() => removeCountdownEvent(event.id)} className="p-1">
                    <Text className="text-slate-400 text-xs">✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
