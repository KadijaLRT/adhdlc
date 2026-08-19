import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

// Matches Aviva's "What shows up for you?" checklist. These directly
// tag the profile so future coaching content (Aviva's system prompt
// context, School's deadline-panic framing, etc.) can reference them —
// wired in AvivaBrain context, not just stored for display.
const SYMPTOMS = [
  { id: 'easily_distracted', label: 'Easily distracted', emoji: '🌀' },
  { id: 'forgetfulness', label: 'Forgetfulness', emoji: '🧠' },
  { id: 'time_blindness', label: 'Time blindness', emoji: '⏰' },
  { id: 'procrastination', label: 'Procrastination', emoji: '😬' },
  { id: 'hyperfocus', label: 'Hyperfocus', emoji: '🔍' },
  { id: 'impulsivity', label: 'Impulsivity', emoji: '⚡' },
  { id: 'emotional_dysregulation', label: 'Emotional dysregulation', emoji: '🌊' },
  { id: 'rejection_sensitivity', label: 'Rejection sensitivity (RSD)', emoji: '💔' },
  { id: 'executive_dysfunction', label: 'Executive dysfunction', emoji: '📋' },
  { id: 'sensory_sensitivity', label: 'Sensory sensitivity', emoji: '🎧' },
];

export default function SymptomsScreen() {
  const router = useRouter();
  const adhdSymptoms = useOnboardingStore((s) => s.adhdSymptoms);
  const toggleInList = useOnboardingStore((s) => s.toggleInList);
  const setField = useOnboardingStore((s) => s.setField);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/symptoms');

  const handleAll = () => setField('adhdSymptoms', SYMPTOMS.map((s) => s.id));
  const handleContinue = () => router?.push?.('/onboarding/braintype');

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">What shows up for you?</Text>
          <Text className="text-slate-400 text-sm mb-6">Pick whatever feels true. This shapes your reminders, coaching, and daily tips.</Text>

          <View className="flex-row flex-wrap gap-2 mb-4">
            {(SYMPTOMS || []).map((item) => {
              const isActive = adhdSymptoms.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleInList('adhdSymptoms', item.id)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3 w-[47%]' : 'bg-slate-900 border-2 border-transparent rounded-xl p-3 w-[47%]'}
                >
                  <Text className="text-lg mb-1">{item.emoji}</Text>
                  <Text className={isActive ? 'text-emerald-300 text-sm font-medium' : 'text-slate-300 text-sm font-medium'}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleAll} className="border-2 border-slate-700 rounded-xl py-3 items-center mb-8">
            <Text className="text-slate-300 text-sm">✨ All of the above</Text>
          </Pressable>

          <Pressable onPress={handleContinue} className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400">
            <Text className="text-white text-lg text-center font-semibold">Continue →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
