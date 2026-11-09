import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore, selectTasks, selectEnergyLevel } from '@/store/index';
import { suggestNextTask } from '@/features/tasks/suggestNextTask';
import DopamineMenuCard from '@/features/toolkit/DopamineMenuCard';

const DURATIONS_SECONDS = [120, 300];

/**
 * The "everything disappears" mode from the document: no nav, no
 * stats, no achievements, no menus. Just breathe, water, one tiny next
 * step, a timer, and a way to unload thoughts. Nothing here is
 * measured or scored — this screen exists to lower the stakes, not
 * raise them.
 */
export default function OverwhelmedMode() {
  const router = useRouter();
  const tasks = useAppStore(selectTasks);
  const energyLevel = useAppStore(selectEnergyLevel);
  const logMomentum = useAppStore((s) => s.logMomentum);
  const reduceMotion = useAppStore((s) => s.reduceMotion);

  const [phase, setPhase] = useState<'breathe' | 'main'>('breathe');
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [showDopamine, setShowDopamine] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  const suggested = suggestNextTask(tasks, energyLevel);
  const tinyStep = suggested?.subSteps?.find((s) => !s.isComplete)?.title || suggested?.title || null;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (timerSeconds === null || timerSeconds <= 0) return;
    const interval = setInterval(() => setTimerSeconds((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  useEffect(() => {
    logMomentum('showed_up');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 items-center justify-center px-8">
        {phase === 'breathe' && (
          <>
            <Animated.View
              style={{ transform: [{ scale: pulse }] }}
              className="w-40 h-40 rounded-full bg-indigo-600/20 border-2 border-indigo-500 mb-10"
            />
            <Text className="text-slate-900 text-xl text-center mb-10 dark:text-slate-100">
              Just breathe for a moment.{'\n'}Nothing else matters right now.
            </Text>
            <Pressable onPress={() => setPhase('main')} className="bg-indigo-600 rounded-full py-4 px-10 active:bg-indigo-500 btn3d btn3d-p">
              <Text className="text-white font-semibold">I'm ready</Text>
            </Pressable>
          </>
        )}

        {phase === 'main' && (
          <View className="w-full max-w-sm gap-4">
            <View className="bg-white rounded-2xl p-5 items-center dark:bg-slate-900 surf3d">
              <Text className="text-slate-500 text-xs uppercase tracking-wider mb-2">One tiny step</Text>
              <Text className="text-slate-900 text-lg text-center font-medium dark:text-slate-100">
                {tinyStep || 'Just sit here for a moment. That counts too.'}
              </Text>
            </View>

            <View className="bg-white rounded-2xl p-5 items-center dark:bg-slate-900 surf3d">
              <Text className="text-slate-500 text-xs uppercase tracking-wider mb-2">💧 Water</Text>
              <Text className="text-slate-700 text-sm text-center dark:text-slate-300">Take a sip, right now if you can.</Text>
            </View>

            {timerSeconds !== null && timerSeconds > 0 && (
              <View className="bg-white rounded-2xl p-5 items-center dark:bg-slate-900 surf3d">
                <Text className="text-slate-50 text-4xl font-bold">
                  {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:{String(timerSeconds % 60).padStart(2, '0')}
                </Text>
              </View>
            )}

            {timerSeconds === null && (
              <View className="flex-row gap-2">
                {DURATIONS_SECONDS.map((secs) => (
                  <Pressable
                    key={secs}
                    onPress={() => setTimerSeconds(secs)}
                    className="flex-1 bg-white rounded-xl py-3 items-center dark:bg-slate-900 surf3d surf3d-tap"
                  >
                    <Text className="text-slate-700 text-sm dark:text-slate-300">{secs / 60} min timer</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable onPress={() => router?.push?.('/stuck')} className="border-2 border-amber-400 rounded-xl py-3 items-center">
              <Text className="text-amber-700 text-sm font-medium dark:text-amber-400">Try a guided micro-step</Text>
            </Pressable>

            <Pressable onPress={() => setShowDopamine(!showDopamine)} className="border-2 border-stone-300 rounded-xl py-3 items-center">
              <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium">⚡ Dopamine Menu</Text>
            </Pressable>
            {showDopamine && <DopamineMenuCard />}

            <Pressable onPress={() => router?.back?.()} className="py-3">
              <Text className="text-slate-600 text-center text-sm dark:text-slate-300">I'm okay, take me back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
