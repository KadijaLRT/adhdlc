import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

// The branching question: this single screen determines which later
// screens even appear. Nobody answers a question about a feature they
// didn't ask to use.
const MODULES = [
  { id: 'executive_function', label: 'Executive Function', emoji: '🧠' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { id: 'sleep', label: 'Sleep', emoji: '😴' },
  { id: 'work', label: 'Work/Career', emoji: '💼' },
  { id: 'school', label: 'School', emoji: '📚' },
  { id: 'home', label: 'Home & Cleaning', emoji: '🏠' },
  { id: 'emotional_regulation', label: 'Emotional Regulation', emoji: '🧘' },
  { id: 'medication', label: 'Medication', emoji: '💊' },
  { id: 'planning', label: 'Planning & Organization', emoji: '📅' },
];

export default function ModulesScreen() {
  const router = useRouter();
  const selectedModules = useOnboardingStore((s) => s.selectedModules);
  const toggleInList = useOnboardingStore((s) => s.toggleInList);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/modules');

  const buildModuleScreenQueue = useOnboardingStore((s) => s.buildModuleScreenQueue);

  const handleContinue = () => {
    buildModuleScreenQueue();
    router?.push?.('/onboarding/symptoms');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">What would you like help with?</Text>
          <Text className="text-slate-400 text-sm mb-6">Select all that apply. This decides which questions we ask next — nothing more than that.</Text>

          <View className="flex-row flex-wrap gap-2 mb-8">
            {(MODULES || []).map((m) => {
              const isActive = selectedModules.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => toggleInList('selectedModules', m.id)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3 w-[47%]' : 'bg-slate-900 border-2 border-transparent rounded-xl p-3 w-[47%]'}
                >
                  <Text className="text-lg mb-1">{m.emoji}</Text>
                  <Text className={isActive ? 'text-emerald-300 text-sm font-medium' : 'text-slate-300 text-sm font-medium'}>{m.label}</Text>
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
