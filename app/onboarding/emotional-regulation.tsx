import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

const HELPERS = [
  { id: 'walking', label: 'Walking', emoji: '🚶' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'breathing', label: 'Breathing', emoji: '🫁' },
  { id: 'quiet', label: 'Quiet', emoji: '🤫' },
  { id: 'journaling', label: 'Journaling', emoji: '📝' },
  { id: 'talking', label: 'Talking', emoji: '💬' },
  { id: 'body_doubling', label: 'Body doubling', emoji: '👥' },
];

export default function EmotionalRegulationScreen() {
  const router = useRouter();
  const emotionalRegulationHelpers = useOnboardingStore((s) => s.emotionalRegulationHelpers);
  const toggleInList = useOnboardingStore((s) => s.toggleInList);
  const goToNextModuleScreen = useOnboardingStore((s) => s.goToNextModuleScreen);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/emotional-regulation');

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">What usually helps?</Text>
          <Text className="text-slate-400 text-sm mb-6">Shapes what Overwhelmed Mode and Stuck Flow suggest first.</Text>

          <View className="flex-row flex-wrap gap-2 mb-8">
            {(HELPERS || []).map((item) => {
              const isActive = emotionalRegulationHelpers.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleInList('emotionalRegulationHelpers', item.id)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 px-4' : 'bg-slate-900 border-2 border-transparent rounded-full py-2 px-4'}
                >
                  <Text className={isActive ? 'text-emerald-300 text-sm' : 'text-slate-300 text-sm'}>{item.emoji} {item.label}</Text>
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
