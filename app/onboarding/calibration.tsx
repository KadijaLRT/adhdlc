import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import type { AgeBracket } from '@/store/index';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

const AGE_BRACKETS: { id: AgeBracket; label: string; range: string }[] = [
  { id: 'middle_school', label: 'Middle School', range: '12–13' },
  { id: 'high_school', label: 'High School', range: '14–17' },
  { id: 'college', label: 'College', range: '18–22' },
  { id: 'adult', label: 'Adult', range: '23–39' },
  { id: 'midlife_adult', label: 'Midlife Adult', range: '40–59' },
  { id: 'senior', label: 'Senior', range: '60+' },
];

export default function CalibrationScreen() {
  const router = useRouter();
  const displayName = useOnboardingStore((s) => s.displayName);
  const ageBracket = useOnboardingStore((s) => s.ageBracket);
  const setField = useOnboardingStore((s) => s.setField);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/calibration');

  const handleContinue = () => {
    // Same fix as welcome.tsx — never let a haptics rejection go unhandled.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router?.push?.('/onboarding/modules');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">What should I call you?</Text>
          <TextInput
            value={displayName}
            onChangeText={(v) => setField('displayName', v)}
            placeholder="Your name"
            placeholderTextColor="#64748b"
            className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 mb-6 text-lg"
          />

          <Text className="text-slate-100 text-base font-medium mb-3">Where are you in life right now?</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {(AGE_BRACKETS || []).map((bracket) => {
              const isActive = ageBracket === bracket.id;
              return (
                <Pressable
                  key={bracket.id}
                  onPress={() => setField('ageBracket', bracket.id)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3 w-[31%]' : 'bg-slate-900 border-2 border-transparent rounded-xl p-3 w-[31%]'}
                >
                  <Text className={isActive ? 'text-emerald-300 text-sm font-medium' : 'text-slate-300 text-sm font-medium'}>{bracket.label}</Text>
                  <Text className="text-slate-500 text-xs">{bracket.range}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleContinue} className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400 mt-2">
            <Text className="text-white text-lg text-center font-semibold">Continue →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
