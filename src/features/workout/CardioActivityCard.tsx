import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useAppStore, selectCardioActivities } from '@/store/index';
import { CARDIO_ACTIVITY_TYPES, type CardioActivityType } from '@/store/slices/workoutSlice';

function todayLocal(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

const EFFORT_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Light', 3: 'Moderate', 4: 'Hard', 5: 'Max effort' };

/**
 * Logging for activities that aren't a gym session — hiking, biking,
 * swimming, running, walking, or anything else. These still count as
 * "showing up" the same as a lifting day (see calculateWorkoutStreak's
 * cardioActivityDates parameter), and are stored separately from
 * setLogs/SetLogEntry since they don't have exercises/sets/reps at
 * all — duration, distance, and effort are the meaningful units here.
 */
export default function CardioActivityCard({ compact = false }: { compact?: boolean }) {
  const cardioActivities = useAppStore(selectCardioActivities);
  const logCardioActivity = useAppStore((s) => s.logCardioActivity);
  const removeCardioActivity = useAppStore((s) => s.removeCardioActivity);

  const today = todayLocal();
  const todaysActivities = cardioActivities.filter((a) => a.date === today);

  const [logging, setLogging] = useState(false);
  const [type, setType] = useState<CardioActivityType>('walking');
  const [otherLabel, setOtherLabel] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [effort, setEffort] = useState<number | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  const resetForm = () => {
    setType('walking');
    setOtherLabel('');
    setDuration('');
    setDistance('');
    setEffort(null);
    setLogging(false);
  };

  const handleSave = async () => {
    const mins = Number(duration);
    if (!Number.isFinite(mins) || mins <= 0) return;
    const dist = Number(distance);
    await logCardioActivity({
      type,
      label: type === 'other' ? (otherLabel.trim() || undefined) : undefined,
      date: today,
      durationMinutes: Math.round(mins),
      distanceMiles: Number.isFinite(dist) && dist > 0 ? dist : undefined,
      perceivedEffort: effort || undefined,
    });
    resetForm();
  };

  const activityMeta = (a: (typeof cardioActivities)[number]) => CARDIO_ACTIVITY_TYPES.find((t) => t.id === a.type);

  if (compact) {
    return (
      <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 w-full">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">🥾 Other activity</Text>
          {todaysActivities.length > 0 && <Text className="text-slate-500 text-xs">{todaysActivities.length} logged today</Text>}
        </View>
        <Text className="text-slate-500 text-xs mb-3">Hiking, biking, swimming, running, walking — anything besides the gym.</Text>
        {!logging && (
          <Pressable onPress={() => setLogging(true)} className="bg-indigo-600 rounded-xl py-2.5 items-center active:bg-indigo-500">
            <Text className="text-white text-sm font-semibold">+ Log an activity</Text>
          </Pressable>
        )}
        {logging && renderForm()}
        {todaysActivities.length > 0 && !logging && (
          <View className="gap-1.5 mt-3">
            {todaysActivities.map((a) => (
              <Text key={a.id} className="text-slate-500 text-xs">
                {activityMeta(a)?.emoji} {a.type === 'other' && a.label ? a.label : activityMeta(a)?.label} · {a.durationMinutes} min{a.distanceMiles ? ` · ${a.distanceMiles} mi` : ''}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderForm() {
    return (
      <View className="mt-3">
        <View className="flex-row flex-wrap gap-2 mb-3">
          {CARDIO_ACTIVITY_TYPES.map((t) => {
            const isActive = type === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setType(t.id)}
                className={isActive ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-1.5 px-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-1.5 px-3'}
              >
                <Text className={isActive ? 'text-indigo-700 dark:text-indigo-300 text-xs font-medium' : 'text-slate-700 dark:text-slate-300 text-xs font-medium'}>{t.emoji} {t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {type === 'other' && (
          <TextInput
            value={otherLabel}
            onChangeText={setOtherLabel}
            placeholder="What was it? (e.g. rock climbing)"
            placeholderTextColor="#64748b"
            className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-3"
          />
        )}

        <View className="flex-row gap-2 mb-3">
          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="Minutes"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            className="flex-1 bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2"
          />
          <TextInput
            value={distance}
            onChangeText={setDistance}
            placeholder="Miles (optional)"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            className="flex-1 bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2"
          />
        </View>

        <Text className="text-slate-500 text-xs mb-2">Effort (optional)</Text>
        <View className="flex-row gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((level) => {
            const isActive = effort === level;
            return (
              <Pressable
                key={level}
                onPress={() => setEffort(isActive ? null : level)}
                className={isActive ? 'flex-1 bg-amber-400/20 border-2 border-amber-400 rounded-xl py-2 items-center' : 'flex-1 bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-xl py-2 items-center'}
              >
                <Text className={isActive ? 'text-amber-700 dark:text-amber-400 text-xs font-semibold' : 'text-slate-600 dark:text-slate-300 text-xs'}>{level}</Text>
              </Pressable>
            );
          })}
        </View>
        {effort && <Text className="text-slate-500 text-xs -mt-3 mb-3">{EFFORT_LABELS[effort]}</Text>}

        <View className="flex-row gap-2">
          <Pressable onPress={resetForm} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center">
            <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!duration.trim()}
            className={duration.trim() ? 'flex-1 bg-indigo-600 rounded-xl py-2.5 items-center active:bg-indigo-500' : 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-2.5 items-center'}
          >
            <Text className="text-white text-sm font-semibold">Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">🥾 Log another activity</Text>
      <Text className="text-slate-500 text-xs mb-3">Hiking, biking, swimming, running, walking, or anything else — still counts as showing up.</Text>

      {todaysActivities.length > 0 && (
        <View className="gap-1.5 mb-3">
          {todaysActivities.map((a) => (
            <View key={a.id}>
              {confirmingRemoveId === a.id ? (
                <View className="bg-red-400/10 border border-red-400/40 rounded-xl p-2.5 flex-row items-center justify-between">
                  <Text className="text-red-500 text-xs flex-1 pr-2">Remove this entry?</Text>
                  <View className="flex-row gap-2">
                    <Pressable onPress={() => { removeCardioActivity(a.id); setConfirmingRemoveId(null); }}>
                      <Text className="text-red-500 text-xs font-semibold">Remove</Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmingRemoveId(null)}>
                      <Text className="text-slate-400 text-xs">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="bg-stone-100 dark:bg-slate-800 rounded-xl p-2.5 flex-row items-center justify-between">
                  <Text className="text-slate-700 dark:text-slate-300 text-xs flex-1">
                    {activityMeta(a)?.emoji} {a.type === 'other' && a.label ? a.label : activityMeta(a)?.label} · {a.durationMinutes} min
                    {a.distanceMiles ? ` · ${a.distanceMiles} mi` : ''}
                    {a.perceivedEffort ? ` · ${EFFORT_LABELS[a.perceivedEffort]}` : ''}
                  </Text>
                  <Pressable onPress={() => setConfirmingRemoveId(a.id)}>
                    <Text className="text-slate-400 text-xs">✕</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {!logging ? (
        <Pressable onPress={() => setLogging(true)} className="bg-indigo-600 rounded-xl py-2.5 items-center active:bg-indigo-500">
          <Text className="text-white text-sm font-semibold">+ Log an activity</Text>
        </Pressable>
      ) : renderForm()}
    </View>
  );
}
