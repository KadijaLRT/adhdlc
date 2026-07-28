import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/index';
import { STUCK_PROMPTS, getRandomPrompt } from '@/content/stuckPrompts';
import { Heading } from '@/shared/components/Heading';
import LaunchCountdown from '@/features/toolkit/LaunchCountdown';
import DopamineMenuCard from '@/features/toolkit/DopamineMenuCard';
import PinchToolCard from '@/features/toolkit/PinchToolCard';

type Room = 'eat' | 'work' | 'gym';
const ROOM_LABELS: Record<Room, string> = { eat: 'Eating', work: 'Work', gym: 'Gym' };
type ExtraTool = 'launch' | 'dopamine' | 'pinch' | null;

export default function StuckFlow() {
  const router = useRouter();
  const bodyDoublingRoom = useAppStore((s) => s.bodyDoublingRoom);
  const setBodyDoublingRoom = useAppStore((s) => s.setBodyDoublingRoom);
  const setOverwhelmed = useAppStore((s) => s.setOverwhelmed);
  const incrementMilestone = useAppStore((s) => s.incrementMilestone);
  const awardProgress = useAppStore((s) => s.awardProgress);

  const [currentPrompt, setCurrentPrompt] = useState(STUCK_PROMPTS?.[0] || { id: 'water', text: 'Take a sip of water.' });
  const [extraTool, setExtraTool] = useState<ExtraTool>(null);

  const handleNextStep = () => {
    setCurrentPrompt(getRandomPrompt(currentPrompt?.id));
    incrementMilestone('stuck_flow_used');
    awardProgress('confidence', 3, 1);
  };
  const handleDone = () => {
    setOverwhelmed(false);
    setBodyDoublingRoom(null);
    router?.back?.();
  };
  const handleRoomSelect = (room: Room) => {
    const isTurningOn = bodyDoublingRoom !== room;
    setBodyDoublingRoom(bodyDoublingRoom === room ? null : room);
    if (isTurningOn) incrementMilestone('body_doubling_session');
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 w-full max-w-md self-center px-6 pt-safe pb-safe justify-center">
        <View className="mb-10">
          <Heading>I&apos;m feeling stuck</Heading>
          <Text className="text-slate-500 text-base mt-1">No pressure. Just one small thing.</Text>
        </View>
        <View className="bg-white rounded-2xl p-8 mb-8 items-center dark:bg-slate-900">
          <Text className="text-indigo-700 text-xs uppercase tracking-wider mb-3 dark:text-indigo-300">Try this micro step</Text>
          <Text className="text-slate-50 text-xl text-center font-medium">{currentPrompt?.text || 'Take a sip of water.'}</Text>
        </View>
        <Pressable onPress={handleNextStep} className="bg-indigo-600 rounded-full py-4 px-8 mb-4 active:bg-indigo-500">
          <Text className="text-white text-lg text-center font-semibold">Did it. What&apos;s next?</Text>
        </Pressable>
        <View className="mb-6">
          <Text className="text-slate-500 text-sm mb-3 text-center">Want to start a body doubling session?</Text>
          <View className="flex-row flex-wrap justify-center gap-2">
            {(Object.keys(ROOM_LABELS) as Room[]).map((room) => {
              const isActive = bodyDoublingRoom === room;
              return (
                <Pressable key={room} onPress={() => handleRoomSelect(room)}
                  className={isActive ? 'border-2 border-emerald-400 bg-emerald-400/10 rounded-full py-3 px-5' : 'border-2 border-stone-300 rounded-full py-3 px-5 active:border-slate-500'}>
                  <Text className={isActive ? 'text-emerald-700 font-medium' : 'text-slate-700 font-medium'}>
                    {bodyDoublingRoom === room ? '🟢 ' : '⚪️ '}{ROOM_LABELS[room]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-row gap-2 mb-2">
          <Pressable onPress={() => setExtraTool(extraTool === 'launch' ? null : 'launch')} className="flex-1 border-2 border-stone-300 rounded-xl py-2.5 items-center">
            <Text className="text-slate-600 text-xs font-medium">🚀 Launch</Text>
          </Pressable>
          <Pressable onPress={() => setExtraTool(extraTool === 'dopamine' ? null : 'dopamine')} className="flex-1 border-2 border-stone-300 rounded-xl py-2.5 items-center">
            <Text className="text-slate-600 text-xs font-medium">⚡ Dopamine Menu</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => setExtraTool(extraTool === 'pinch' ? null : 'pinch')} className="border-2 border-stone-300 rounded-xl py-2.5 items-center mb-4">
          <Text className="text-slate-600 text-xs font-medium">🧲 What could make this easier? (PINCH)</Text>
        </Pressable>
        {extraTool === 'launch' && <View className="mb-6"><LaunchCountdown /></View>}
        {extraTool === 'dopamine' && <View className="mb-6"><DopamineMenuCard /></View>}
        {extraTool === 'pinch' && <View className="mb-6"><PinchToolCard /></View>}
        {extraTool === 'pinch' && <View className="mb-6"><PinchToolCard /></View>}

        <Pressable onPress={handleDone} className="py-3">
          <Text className="text-slate-500 text-center text-sm">I&apos;m okay now, take me back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
