import { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useAppStore,
  selectTasks,
  selectEnergyLevel,
  selectIsOverwhelmed,
  selectProfile,
  type TaskPriority,
  type TaskCategory,
  type MotivatorTag,
  type EnergyLevel,
} from '@/store/index';
import { avivaBrain } from '@/core/ai/AvivaBrain';
import { resolveBrainTypeTraits } from '@/content/brainTypes';
import { MOTIVATOR_OPTIONS } from '@/content/toolkitContent';
import { Heading } from '@/shared/components/Heading';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tasks = useAppStore(selectTasks);
  const energyLevel = useAppStore(selectEnergyLevel);
  const isOverwhelmed = useAppStore(selectIsOverwhelmed);
  const profile = useAppStore(selectProfile);
  const toggleTaskComplete = useAppStore((s) => s.toggleTaskComplete);
  const toggleSubStep = useAppStore((s) => s.toggleSubStep);
  const updateTask = useAppStore((s) => s.updateTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const logMomentum = useAppStore((s) => s.logMomentum);
  const [breakingDown, setBreakingDown] = useState(false);

  const task = (tasks || []).find((t) => t.id === id);

  useEffect(() => {
    if (task) logMomentum('opened_task', task.id);
  }, [id]);

  if (!task) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 items-center justify-center px-8 dark:bg-slate-950">
        <Text className="text-slate-500 text-center">This task isn&apos;t here anymore.</Text>
        <Pressable onPress={() => router?.back?.()} className="mt-4">
          <Text className="text-indigo-400">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleBreakDown = async () => {
    setBreakingDown(true);
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    const decomposition = await avivaBrain.decomposeTask(task.title, {
      currentEnergyLevel: energyLevel,
      isOverwhelmed,
      timeOfDay,
      coachingStyle: profile?.coachingStyle,
      brainTypeTraits: resolveBrainTypeTraits(profile?.brainTypes),
    });

    if (decomposition) {
      await updateTask(task.id, {
        subSteps: (decomposition.subSteps || []).map((s) => ({ id: s.id, title: s.title, isComplete: false })),
        realMinutes: decomposition.estimatedRealMinutes,
        estimatedMinutes: decomposition.estimatedIdealMinutes,
        energyRequired: decomposition.suggestedEnergyLevel,
      });
    }
    setBreakingDown(false);
  };

  const handleDelete = async () => {
    await removeTask(task.id);
    router?.back?.();
  };

  const toggleMotivator = (tag: MotivatorTag) => {
    const current = task.motivators || [];
    const next = current.includes(tag) ? current.filter((m) => m !== tag) : [...current, tag];
    updateTask(task.id, { motivators: next });
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <View className="w-full max-w-md self-center">
          <Heading className="mb-2">{task?.title || 'Untitled task'}</Heading>

          {(task?.realMinutes || task?.estimatedMinutes) && (
            <Text className="text-slate-500 text-sm mb-4">
              About {task?.realMinutes || task?.estimatedMinutes} min · {task?.energyRequired || 'medium'} energy
            </Text>
          )}

          <Text className="text-slate-500 text-xs font-medium mb-2">Priority</Text>
          <View className="flex-row gap-2 mb-4">
            {(['nice', 'important', 'critical'] as TaskPriority[]).map((p) => {
              const isActive = (task?.priority || 'nice') === p;
              const dot = p === 'critical' ? '🔴' : p === 'important' ? '🟠' : '🟢';
              return (
                <Pressable
                  key={p}
                  onPress={() => updateTask(task.id, { priority: p })}
                  className={isActive ? 'flex-1 bg-stone-100 border-2 border-indigo-400 rounded-xl py-2 items-center' : 'flex-1 bg-white border-2 border-transparent rounded-xl py-2 items-center'}
                >
                  <Text className="text-slate-700 text-xs dark:text-slate-300">{dot} {p}</Text>
                </Pressable>
              );
            })}
          </View>

          {/*
            Bug fix: energy level was only displayed here ("About X min
            · medium energy"), never editable — the only way to change
            it was indirectly via "Break this down for me" overwriting
            it as a side effect of AI decomposition, or (as of the
            add-task fix) getting it right at creation time. If the
            initial guess was wrong, there was previously no way to
            correct it short of deleting and recreating the task.
          */}
          <Text className="text-slate-500 text-xs font-medium mb-2">Energy needed</Text>
          <View className="flex-row gap-2 mb-4">
            {(['low', 'medium', 'high'] as EnergyLevel[]).map((e) => {
              const isActive = (task?.energyRequired || 'medium') === e;
              return (
                <Pressable
                  key={e}
                  onPress={() => updateTask(task.id, { energyRequired: e })}
                  className={isActive ? 'flex-1 bg-stone-100 border-2 border-indigo-400 rounded-xl py-2 items-center' : 'flex-1 bg-white border-2 border-transparent rounded-xl py-2 items-center'}
                >
                  <Text className="text-slate-700 text-xs dark:text-slate-300 capitalize">🔋 {e}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-slate-500 text-xs font-medium mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {(['home', 'school', 'health', 'errands', 'car', 'personal'] as TaskCategory[]).map((cat) => {
              const isActive = (task?.category || 'general') === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => updateTask(task.id, { category: cat })}
                  className={isActive ? 'bg-stone-100 border-2 border-indigo-400 rounded-full py-1.5 px-3' : 'bg-white border-2 border-transparent rounded-full py-1.5 px-3'}
                >
                  <Text className="text-slate-700 text-xs capitalize dark:text-slate-300">{cat}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-slate-500 text-xs font-medium mb-2">What might make this easier to start? (optional)</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {MOTIVATOR_OPTIONS.map((option) => {
              const isActive = (task?.motivators || []).includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => toggleMotivator(option.id)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-1.5 px-3' : 'bg-white border-2 border-transparent rounded-full py-1.5 px-3 dark:bg-slate-900'}
                >
                  <Text className={isActive ? 'text-emerald-700 dark:text-emerald-400 text-xs' : 'text-slate-700 text-xs dark:text-slate-300'}>{option.emoji} {option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => toggleTaskComplete(task.id)}
            className={task?.isComplete ? 'bg-emerald-500 rounded-full py-4 mb-6' : 'bg-indigo-600 rounded-full py-4 mb-6 active:bg-indigo-500'}
          >
            <Text className={task?.isComplete ? 'text-white text-center font-semibold' : 'text-white text-center font-semibold'}>
              {task?.isComplete ? 'Marked done ✓' : 'Done'}
            </Text>
          </Pressable>

          {(task?.subSteps?.length || 0) === 0 ? (
            <Pressable
              onPress={handleBreakDown}
              disabled={breakingDown}
              className="border-2 border-indigo-500 rounded-full py-4 mb-6 items-center"
            >
              {breakingDown ? <ActivityIndicator color="#818cf8" /> : <Text className="text-indigo-700 font-semibold dark:text-indigo-300">Break this down for me</Text>}
            </Pressable>
          ) : (
            <View className="gap-2 mb-6">
              <Text className="text-slate-700 text-sm font-medium mb-1 dark:text-slate-300">Steps</Text>
              {(task.subSteps || []).map((step) => (
                <Pressable key={step.id} onPress={() => toggleSubStep(task.id, step.id)} className="bg-white rounded-xl p-4 flex-row items-center gap-3 dark:bg-slate-900">
                  <View className={step?.isComplete ? 'w-5 h-5 rounded-full bg-emerald-500 items-center justify-center' : 'w-5 h-5 rounded-full border-2 border-stone-300'}>
                    {step?.isComplete && <Text className="text-white text-xs">✓</Text>}
                  </View>
                  <Text className={step?.isComplete ? 'text-slate-500 line-through flex-1' : 'text-slate-900 flex-1'}>{step?.title || ''}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable onPress={handleDelete} className="py-3">
            <Text className="text-slate-600 text-center text-sm dark:text-slate-300">Remove this task</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
