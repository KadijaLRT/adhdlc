import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectRoutines, selectStreaks } from '@/store/index';
import { ROUTINE_TEMPLATES } from '@/content/routineTemplates';
import { Heading } from '@/shared/components/Heading';
import { generateId } from '@/shared/generateId';

const EMOJI_OPTIONS = ['🧘', '💊', '🍽️', '🛏️', '📚', '🚿'];

function today(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

export default function RoutinesScreen() {
  const router = useRouter();
  const routines = useAppStore(selectRoutines);
  const streaks = useAppStore(selectStreaks);
  const addRoutine = useAppStore((s) => s.addRoutine);
  const removeRoutine = useAppStore((s) => s.removeRoutine);
  const recordRoutineCompletion = useAppStore((s) => s.recordRoutineCompletion);
  const useStreakFreeze = useAppStore((s) => s.useStreakFreeze);
  const toggleRoutineStep = useAppStore((s) => s.toggleRoutineStep);

  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState(EMOJI_OPTIONS[0] || '⭐');

  const handleAddTemplate = async (template: (typeof ROUTINE_TEMPLATES)[number]) => {
    await addRoutine({
      id: generateId('routine'),
      title: template.title,
      emoji: template.emoji,
      createdAt: new Date().toISOString(),
      steps: template.steps.map((step, i) => ({ id: `${template.id}-${i}`, text: step.text, durationMinutes: step.durationMinutes })),
    });
  };

  const handleAddCustom = async () => {
    if (!newTitle?.trim()) return;
    await addRoutine({ id: generateId('routine'), title: newTitle.trim(), emoji: newEmoji, createdAt: new Date().toISOString() });
    setNewTitle('');
    setShowCustomForm(false);
  };

  const handleComplete = async (routineTitle: string, routineId: string) => {
    const { isRecovery } = await recordRoutineCompletion(routineId);
    if (isRecovery) {
      setRecoveryMessage(`Nice recovery on ${routineTitle}. Coming back matters more than never missing.`);
      setTimeout(() => setRecoveryMessage(null), 4000);
    }
  };

  const handleToggleStep = async (routine: (typeof routines)[number], stepId: string) => {
    await toggleRoutineStep(routine.id, stepId);
    // Auto-marks the routine done for the day once every step is
    // checked — no separate "mark done" tap needed on top of finishing
    // the checklist itself.
    const checkedToday = routine.stepCompletionDate === today() ? (routine.completedStepIds || []) : [];
    const willBeChecked = checkedToday.includes(stepId)
      ? checkedToday.filter((id) => id !== stepId)
      : [...checkedToday, stepId];
    const allDone = (routine.steps || []).every((s) => willBeChecked.includes(s.id));
    if (allDone) await handleComplete(routine.title, routine.id);
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Routines</Heading>
        <Text className="text-slate-500 text-sm mb-6">Missing a day never breaks anything. It just waits for you.</Text>

        {recoveryMessage && (
          <View className="bg-emerald-400/10 border-2 border-emerald-400 rounded-2xl p-4 mb-4">
            <Text className="text-emerald-700 text-sm font-medium dark:text-emerald-400">🎉 {recoveryMessage}</Text>
          </View>
        )}

        <View className="bg-white rounded-2xl p-4 mb-6 dark:bg-slate-900">
          <Text className="text-slate-700 text-sm font-medium mb-3 dark:text-slate-300">Quick start</Text>
          <View className="gap-2 mb-3">
            {ROUTINE_TEMPLATES.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => handleAddTemplate(template)}
                className="bg-stone-100 dark:bg-slate-800 rounded-xl p-3 flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium">{template.emoji} {template.title}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">{template.steps.length} steps</Text>
                </View>
                <Text className="text-indigo-500 text-xs font-medium">+ Add</Text>
              </Pressable>
            ))}
          </View>

          {!showCustomForm ? (
            <Pressable onPress={() => setShowCustomForm(true)} className="py-2">
              <Text className="text-indigo-500 text-xs">+ Build a custom routine</Text>
            </Pressable>
          ) : (
            <View className="pt-2 border-t border-stone-100 dark:border-slate-800">
              <View className="flex-row gap-2 mb-3">
                {EMOJI_OPTIONS.map((emoji) => (
                  <Pressable key={emoji} onPress={() => setNewEmoji(emoji)} className={newEmoji === emoji ? 'bg-indigo-600/30 rounded-lg p-2' : 'p-2'}>
                    <Text className="text-lg">{emoji}</Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row gap-2">
                <TextInput
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Morning meds, evening wind-down..."
                  placeholderTextColor="#64748b"
                  onSubmitEditing={handleAddCustom}
                  className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-4 py-3 dark:text-slate-100 dark:bg-slate-800"
                />
                <Pressable onPress={handleAddCustom} className="bg-indigo-600 rounded-xl px-5 justify-center active:bg-indigo-500">
                  <Text className="text-white font-semibold">Add</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View className="gap-3">
          {(routines || []).length === 0 && <Text className="text-slate-500 text-center mt-6">No routines yet. Add one above.</Text>}
          {(routines || []).map((routine) => {
            const streak = (streaks || []).find((s) => s.routineId === routine.id);
            const doneToday = streak?.lastCompletedDate === today();
            const checkedStepIds = routine.stepCompletionDate === today() ? (routine.completedStepIds || []) : [];
            const hasSteps = (routine.steps || []).length > 0;

            return (
              <View key={routine.id} className="bg-white rounded-2xl p-4 dark:bg-slate-900">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-slate-900 font-medium dark:text-slate-100">{routine.emoji} {routine.title}</Text>
                  <Pressable onPress={() => removeRoutine(routine.id)}>
                    <Text className="text-slate-600 text-xs dark:text-slate-300">Remove</Text>
                  </Pressable>
                </View>
                <Text className="text-slate-500 text-xs mb-3">
                  {streak?.count || 0} completions{streak?.isFrozen ? ' · frozen today' : ''}
                  {streak ? ` · ${streak.freezesAvailable} freeze${streak.freezesAvailable === 1 ? '' : 's'} left` : ''}
                </Text>

                {hasSteps && !doneToday && (
                  <Pressable onPress={() => router?.push?.({ pathname: '/routines/run', params: { routineId: routine.id } })} className="bg-indigo-600 rounded-xl py-2.5 items-center active:bg-indigo-500 mb-3">
                    <Text className="text-white text-sm font-semibold">▶ Start Routine</Text>
                  </Pressable>
                )}

                {hasSteps && (
                  <View className="gap-1.5 mb-3">
                    {(routine.steps || []).map((step) => {
                      const isChecked = checkedStepIds.includes(step.id);
                      return (
                        <Pressable
                          key={step.id}
                          onPress={() => handleToggleStep(routine, step.id)}
                          className="flex-row items-center gap-2 py-1"
                        >
                          <View className={isChecked ? 'w-5 h-5 rounded-md bg-emerald-500 items-center justify-center' : 'w-5 h-5 rounded-md border-2 border-stone-300 dark:border-slate-700'}>
                            {isChecked && <Text className="text-white text-xs">✓</Text>}
                          </View>
                          <Text className={isChecked ? 'text-slate-400 text-sm line-through' : 'text-slate-700 dark:text-slate-300 text-sm'}>{step.text}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <View className="flex-row gap-2">
                  {!hasSteps && (
                    <Pressable
                      onPress={() => handleComplete(routine.title, routine.id)}
                      disabled={doneToday}
                      className={doneToday ? 'flex-1 bg-emerald-500/20 rounded-full py-3 items-center' : 'flex-1 bg-emerald-500 rounded-full py-3 items-center active:bg-emerald-400'}
                    >
                      <Text className={doneToday ? 'text-emerald-700 font-semibold' : 'text-white font-semibold'}>
                        {doneToday ? 'Done today ✓' : 'Mark done today'}
                      </Text>
                    </Pressable>
                  )}
                  {hasSteps && doneToday && (
                    <View className="flex-1 bg-emerald-500/20 rounded-full py-3 items-center">
                      <Text className="text-emerald-700 font-semibold dark:text-emerald-400">All done today ✓</Text>
                    </View>
                  )}
                  {!doneToday && (streak?.freezesAvailable || 0) > 0 && (
                    <Pressable onPress={() => useStreakFreeze(routine.id)} className="border-2 border-stone-300 rounded-full py-3 px-4 items-center dark:border-slate-700">
                      <Text className="text-slate-700 text-xs font-medium dark:text-slate-300">Freeze</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
