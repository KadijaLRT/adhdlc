import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

const SUPPORT_METHODS = [
  { id: 'medication', label: 'Medication', emoji: '💊' },
  { id: 'cannabis', label: 'Cannabis', emoji: '🌿', minAgeBracket: 'college' as const },
  { id: 'therapy', label: 'Therapy or coaching', emoji: '🧠' },
  { id: 'movement', label: 'Movement', emoji: '💪' },
  { id: 'routines', label: 'Routines & systems', emoji: '📋' },
  { id: 'figuring_out', label: 'Still figuring it out', emoji: '🤷' },
];

// Age brackets under 18: middle_school (12–13), high_school (14–17).
// Cannabis isn't offered as a support-method option below college-age
// brackets — this isn't a values judgment on the option itself (it's
// offered to adults elsewhere in the app), it's a straightforward
// age-appropriateness gate on what onboarding presents to a minor.
const UNDER_18_BRACKETS = ['middle_school', 'high_school'];

// These directly determine which optional modules get surfaced:
// "cannabis" pre-suggests the Strain Explorer, "movement" nudges toward
// Workout, "routines" nudges toward the Routines tab — via
// suggestedModules below, read by Home/Today after onboarding.

export default function SupportScreen() {
  const router = useRouter();
  const supportMethods = useOnboardingStore((s) => s.supportMethods);
  const ageBracket = useOnboardingStore((s) => s.ageBracket);
  const toggleInList = useOnboardingStore((s) => s.toggleInList);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/support');

  const goToNextModuleScreen = useOnboardingStore((s) => s.goToNextModuleScreen);

  const isUnder18 = ageBracket ? UNDER_18_BRACKETS.includes(ageBracket) : false;
  const visibleSupportMethods = SUPPORT_METHODS.filter((item) => !(item.id === 'cannabis' && isUnder18));

  const handleContinue = () => goToNextModuleScreen(router);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">How do you support yourself?</Text>
          <Text className="text-slate-400 text-sm mb-6">Whatever works for you counts. No judgment here.</Text>

          <View className="flex-row flex-wrap gap-2 mb-8">
            {(visibleSupportMethods || []).map((item) => {
              const isActive = supportMethods.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleInList('supportMethods', item.id)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-4 w-[47%]' : 'bg-slate-900 border-2 border-transparent rounded-xl p-4 w-[47%]'}
                >
                  <Text className="text-lg mb-1">{item.emoji}</Text>
                  <Text className={isActive ? 'text-emerald-300 text-sm font-medium' : 'text-slate-300 text-sm font-medium'}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleContinue} className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400">
            <Text className="text-white text-lg text-center font-semibold">Continue →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
