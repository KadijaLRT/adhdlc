import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

// Flavor/self-identification content, honestly labeled as such: these
// are not clinical ADHD subtypes (the DSM recognizes three
// presentations: inattentive, hyperactive-impulsive, combined). This is
// a relatable self-description tool, and it's used only to color
// Aviva's tone slightly, never as a diagnostic input anywhere.
const BRAIN_TYPES = [
  { id: 'inattentive_dreamer', label: 'The Inattentive Dreamer', emoji: '☁️', traits: 'Overthinking · Forgetfulness · Daydreaming' },
  { id: 'hyperactive_motor', label: 'The Hyperactive Motor', emoji: '⚡', traits: 'Restlessness · Fidgeting · Impulsivity' },
  { id: 'visionary_creative', label: 'The Visionary Creative', emoji: '🎨', traits: 'Creativity · Hyperfocus · Chaos' },
  { id: 'disorganized_explorer', label: 'The Disorganized Explorer', emoji: '🗺️', traits: 'Lost items · Time blindness · Scattered' },
  { id: 'multi_tasker', label: 'The Multi-Tasker', emoji: '🔀', traits: 'Easily distracted · Task-switching · Energy bursts' },
  { id: 'sensory_sensitive', label: 'The Sensory Sensitive', emoji: '🎧', traits: 'Sensitivity · Overwhelm · Need for quiet' },
  { id: 'hyperfocused_achiever', label: 'The Hyperfocused Achiever', emoji: '🎯', traits: 'Hyperfocus · Flow state · Tunnel vision' },
  { id: 'time_crunched_planner', label: 'The Time-Crunched Planner', emoji: '⏱️', traits: 'Procrastination · Last minute · Stress' },
  { id: 'social_charmer', label: 'The Social Charmer', emoji: '🐸', traits: 'Talkative · Interrupting · Social energy' },
  { id: 'masked_regulator', label: 'The Masked Regulator', emoji: '🎭', traits: 'Internal struggle · Coping strategies · Burnout' },
  { id: 'emotional_feeler', label: 'The Emotional Feeler', emoji: '💗', traits: 'Intense emotions · Rejection sensitivity · Mood swings' },
  { id: 'combined_type', label: 'The Combined Type', emoji: '🐉', traits: 'Mixed traits · Unpredictable · Adaptable' },
];

export default function BrainTypeScreen() {
  const router = useRouter();
  const brainTypes = useOnboardingStore((s) => s.brainTypes);
  const toggleInList = useOnboardingStore((s) => s.toggleInList);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/braintype');

  const handleContinue = () => router?.push?.('/onboarding/support');

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">Which ones sound like your brain?</Text>
          <Text className="text-slate-400 text-sm mb-6">Most people are a mix. Pick as many as feel right. These are relatable descriptions, not clinical categories.</Text>

          <View className="gap-2 mb-8">
            {(BRAIN_TYPES || []).map((type) => {
              const isActive = brainTypes.includes(type.id);
              return (
                <Pressable
                  key={type.id}
                  onPress={() => toggleInList('brainTypes', type.id)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-4' : 'bg-slate-900 border-2 border-transparent rounded-xl p-4'}
                >
                  <Text className="text-lg mb-1">{type.emoji}</Text>
                  <Text className={isActive ? 'text-emerald-300 font-medium mb-1' : 'text-slate-100 font-medium mb-1'}>{type.label}</Text>
                  <Text className="text-slate-500 text-xs">{type.traits}</Text>
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
