import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectAssignments, selectEnergyLevel, selectIsOverwhelmed, selectDateFormat } from '@/store/index';
import { avivaBrain } from '@/core/ai/AvivaBrain';
import { spreadStepsAcrossDays, groupStepsByDate } from './spreadWorkload';
import { Heading } from '@/shared/components/Heading';
import { formatDate } from '@/shared/formatDate';

export default function AssignmentDetailScreen({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const assignments = useAppStore(selectAssignments);
  const energyLevel = useAppStore(selectEnergyLevel);
  const isOverwhelmed = useAppStore(selectIsOverwhelmed);
  const dateFormat = useAppStore(selectDateFormat);
  const toggleAssignmentComplete = useAppStore((s) => s.toggleAssignmentComplete);
  const toggleAssignmentSubStep = useAppStore((s) => s.toggleAssignmentSubStep);
  const updateAssignment = useAppStore((s) => s.updateAssignment);
  const removeAssignment = useAppStore((s) => s.removeAssignment);
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakDownError, setBreakDownError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const assignment = (assignments || []).find((a) => a.id === assignmentId);

  if (!assignment) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">This assignment isn&apos;t here anymore.</Text>
      </View>
    );
  }

  const handleBreakDown = async () => {
    setBreakingDown(true);
    setBreakDownError(null);
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    const decomposition = await avivaBrain.breakDownAssignment(assignment.title, {
      currentEnergyLevel: energyLevel,
      isOverwhelmed,
      timeOfDay,
    });

    if (decomposition) {
      const rawSteps = (decomposition.subSteps || []).map((s) => ({ id: s.id, title: s.title, isComplete: false }));
      const spreadSteps = spreadStepsAcrossDays(rawSteps, assignment.dueDate);
      await updateAssignment(assignment.id, {
        subSteps: spreadSteps,
        estimatedMinutes: decomposition.estimatedIdealMinutes,
      });
    } else {
      // avivaBrain.breakDownAssignment already logs the real cause to
      // the console — this was previously a silent no-op with zero
      // feedback whenever the AI call failed for any reason (a dead
      // model, a network hiccup, rate limiting), which read exactly
      // like a broken button rather than a failed request.
      setBreakDownError("Couldn't break this down just now — try again in a moment.");
    }
    setBreakingDown(false);
  };

  const handleRemove = async () => {
    await removeAssignment(assignment.id);
    router?.back?.();
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">{assignment.title}</Heading>
        <Text className="text-slate-500 text-sm mb-6">Due {formatDate(assignment.dueDate, dateFormat)}</Text>

        <Pressable
          onPress={() => toggleAssignmentComplete(assignment.id)}
          className={assignment.isComplete ? 'bg-emerald-500 rounded-full py-4 mb-6' : 'bg-indigo-600 rounded-full py-4 mb-6 active:bg-indigo-500'}
        >
          <Text className={assignment.isComplete ? 'text-white text-center font-semibold' : 'text-white text-center font-semibold'}>
            {assignment.isComplete ? 'Marked done ✓' : 'Done'}
          </Text>
        </Pressable>

        {(assignment.subSteps?.length || 0) === 0 ? (
          <>
            <Pressable onPress={handleBreakDown} disabled={breakingDown} className="border-2 border-indigo-500 rounded-full py-4 mb-2 items-center">
              {breakingDown ? <ActivityIndicator color="#818cf8" /> : <Text className="text-indigo-700 font-semibold dark:text-indigo-300">Break this into steps</Text>}
            </Pressable>
            {breakDownError && <Text className="text-red-500 text-xs text-center mb-6">{breakDownError}</Text>}
          </>
        ) : (
          <View className="gap-4 mb-6">
            {groupStepsByDate(assignment.subSteps || []).map((group) => (
              <View key={group.date}>
                <Text className="text-slate-500 text-xs font-medium mb-2">
                  {group.date === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() ? 'Today' : formatDate(group.date, dateFormat)}
                </Text>
                <View className="gap-2">
                  {group.steps.map((step) => (
                    <Pressable key={step.id} onPress={() => toggleAssignmentSubStep(assignment.id, step.id)} className="bg-white rounded-xl p-4 flex-row items-center gap-3 dark:bg-slate-900">
                      <View className={step.isComplete ? 'w-5 h-5 rounded-full bg-emerald-500 items-center justify-center' : 'w-5 h-5 rounded-full border-2 border-stone-300'}>
                        {step.isComplete && <Text className="text-white text-xs">✓</Text>}
                      </View>
                      <Text className={step.isComplete ? 'text-slate-500 line-through flex-1' : 'text-slate-900 flex-1'}>{step.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {confirmingRemove ? (
          <View className="border-2 border-red-400 bg-red-400/10 rounded-2xl p-4">
            <Text className="text-red-500 text-sm font-medium mb-3">Remove "{assignment.title}"? This can't be undone.</Text>
            <View className="flex-row gap-2">
              <Pressable onPress={handleRemove} className="flex-1 bg-red-500 rounded-xl py-2.5 items-center active:bg-red-400">
                <Text className="text-white text-sm font-semibold">Remove</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmingRemove(false)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingRemove(true)} className="py-2">
            <Text className="text-red-500 text-center text-xs">Remove this assignment</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
