import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

const SLEEP_STRUGGLES = [
  { id: 'falling_asleep', label: 'Falling asleep', emoji: '🌙' },
  { id: 'staying_asleep', label: 'Staying asleep', emoji: '🌛' },
  { id: 'waking_up', label: 'Waking up', emoji: '⏰' },
  { id: 'bedtime_routine', label: 'Bedtime routine', emoji: '🛏️' },
];

export default function SleepScreen() {
  const router = useRouter();
  const sleepStruggles = useOnboardingStore((s) => s.sleepStruggles);
  const toggleInList = useOnboardingStore((s) => s.toggleInList);
  const goToNextModuleScreen = useOnboardingStore((s) => s.goToNextModuleScreen);
  // Bug fix: this screen (and medication.tsx, emotional-regulation.tsx)
  // used only OnboardingBackOnlyHeader — no step indicator at all —
  // while sibling conditional module screens (body.tsx, food.tsx)
  // correctly show "Step X of Y". Someone who selected fitness + sleep
  // + medication would see the progress bar during fitness questions,
  // watch it vanish for sleep and medication, then have it reappear at
  // the final screen — an inconsistent, broken-feeling flow, even
  // though getStepInfo already computes the exact right step for every
  // one of these screens; they just weren't rendering it.
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/sleep');

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">What do you struggle with?</Text>
          <Text className="text-slate-400 text-sm mb-6">Pick whatever's true. Shapes your wind-down and Evening check-in.</Text>

          <View className="gap-2 mb-8">
            {(SLEEP_STRUGGLES || []).map((item) => {
              const isActive = sleepStruggles.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleInList('sleepStruggles', item.id)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-4' : 'bg-slate-900 border-2 border-transparent rounded-xl p-4'}
                >
                  <Text className={isActive ? 'text-emerald-300 font-medium' : 'text-slate-100 font-medium'}>{item.emoji} {item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => goToNextModuleScreen(router)} className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400">
            <Text className="text-white text-lg text-center font-semibold">Continue →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
