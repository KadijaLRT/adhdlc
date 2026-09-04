import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore, selectTasks } from '@/store/index';
import { Heading } from '@/shared/components/Heading';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

const DURATIONS = [5, 15, 25];

export default function FocusPickerScreen() {
  const router = useRouter();
  const tasks = useAppStore(selectTasks);
  const incomplete = (tasks || []).filter((t) => !t?.isComplete);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [duration, setDuration] = useState(15);

  const handleStart = () => {
    const task = incomplete.find((t) => t.id === selectedTaskId);
    router?.push?.({
      pathname: '/focus/session',
      params: { taskId: task?.id || '', taskTitle: task?.title || '', durationMinutes: String(duration) },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <View className="w-full max-w-md self-center">
          <Heading className="mb-1 mt-2">Focus Sprint</Heading>
          <Text className="text-slate-500 text-sm mb-6">Pick something, or just show up. Both count.</Text>

          <Text className="text-slate-700 text-sm font-medium mb-2 dark:text-slate-300">What are you focusing on?</Text>
          <View className="gap-2 mb-6">
            <Pressable
              onPress={() => setSelectedTaskId(null)}
              className={selectedTaskId === null ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-xl p-3' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-xl p-3'}
            >
              <Text className={selectedTaskId === null ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}>No specific task, just time</Text>
            </Pressable>
            {(incomplete || []).slice(0, 6).map((task) => {
              const isActive = selectedTaskId === task.id;
              return (
                <Pressable key={task.id} onPress={() => setSelectedTaskId(task.id)} className={isActive ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-xl p-3' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-xl p-3'}>
                  <Text className={isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}>{task.title}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-slate-700 text-sm font-medium mb-2 dark:text-slate-300">How long?</Text>
          <View className="flex-row gap-2 mb-10">
            {(DURATIONS || []).map((d) => {
              const isActive = duration === d;
              return (
                <Pressable key={d} onPress={() => setDuration(d)} className={isActive ? 'flex-1 bg-indigo-600/20 border-2 border-indigo-400 rounded-xl py-3 items-center' : 'flex-1 bg-white dark:bg-slate-900 border-2 border-transparent rounded-xl py-3 items-center'}>
                  <Text className={isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}>{d} min</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleStart} className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400 mb-6">
            <Text className="text-white text-center font-semibold text-lg">Ready to focus?</Text>
          </Pressable>

          <View className="flex-row gap-2">
            <Pressable onPress={() => router?.push?.('/focus/pomodoro')} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-3 items-center">
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-medium">⏱️ Pomodoro instead</Text>
            </Pressable>
            <Pressable onPress={() => router?.push?.('/focus/rsd')} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-3 items-center">
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-medium">💔 RSD Protocol</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
