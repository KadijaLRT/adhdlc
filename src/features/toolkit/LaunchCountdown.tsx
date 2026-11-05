import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';

/**
 * "5-4-3-2-1 Launch": name the task, count down, then just begin. The
 * countdown itself is the tool — it interrupts the hesitation loop
 * before overthinking can restart it.
 */
export default function LaunchCountdown() {
  const [task, setTask] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [launched, setLaunched] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleStart = () => {
    if (!task.trim()) return;
    setLaunched(false);
    setCount(5);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCount((c) => {
        if (c === null || c <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setLaunched(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleReset = () => {
    setTask('');
    setCount(null);
    setLaunched(false);
  };

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">🚀 5-4-3-2-1 Launch</Text>
      <Text className="text-slate-500 text-xs mb-3">Name the task. Count down. Just begin — for 1 to 5 minutes only.</Text>

      {count === null ? (
        <>
          <TextInput
            value={task}
            onChangeText={setTask}
            placeholder="What are you launching into?"
            placeholderTextColor="#64748b"
            className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-3"
          />
          <Pressable onPress={handleStart} disabled={!task.trim()} className={task.trim() ? 'bg-indigo-600 rounded-xl py-3 items-center active:bg-indigo-500 btn3d btn3d-p' : 'bg-slate-300 dark:bg-slate-700 rounded-xl py-3 items-center'}>
            <Text className="text-white text-sm font-semibold">Start countdown</Text>
          </Pressable>
        </>
      ) : launched ? (
        <View className="items-center py-2">
          <Text className="text-emerald-600 dark:text-emerald-400 text-2xl font-bold mb-1">Go.</Text>
          <Text className="text-slate-600 dark:text-slate-300 text-sm text-center mb-3">{task}</Text>
          <Pressable onPress={handleReset} className="py-2">
            <Text className="text-slate-500 text-xs">Launch something else</Text>
          </Pressable>
        </View>
      ) : (
        <View className="items-center py-4">
          <Text className="text-indigo-600 dark:text-indigo-400 text-5xl font-bold">{count}</Text>
        </View>
      )}
    </View>
  );
}
