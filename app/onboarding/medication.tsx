import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

export default function MedicationScreen() {
  const router = useRouter();
  const wantsMedicationReminders = useOnboardingStore((s) => s.wantsMedicationReminders);
  const medicationCount = useOnboardingStore((s) => s.medicationCount);
  const medicationTimes = useOnboardingStore((s) => s.medicationTimes);
  const setField = useOnboardingStore((s) => s.setField);
  const goToNextModuleScreen = useOnboardingStore((s) => s.goToNextModuleScreen);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/medication');

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-6">Would you like medication reminders?</Text>

          <View className="flex-row gap-2 mb-6">
            <Pressable
              onPress={() => setField('wantsMedicationReminders', true)}
              className={wantsMedicationReminders === true ? 'flex-1 bg-emerald-400/10 border-2 border-emerald-400 rounded-xl py-3 items-center' : 'flex-1 bg-slate-900 border-2 border-transparent rounded-xl py-3 items-center'}
            >
              <Text className={wantsMedicationReminders === true ? 'text-emerald-300 font-medium' : 'text-slate-300 font-medium'}>Yes</Text>
            </Pressable>
            <Pressable
              onPress={() => { setField('wantsMedicationReminders', false); goToNextModuleScreen(router); }}
              className={wantsMedicationReminders === false ? 'flex-1 bg-emerald-400/10 border-2 border-emerald-400 rounded-xl py-3 items-center' : 'flex-1 bg-slate-900 border-2 border-transparent rounded-xl py-3 items-center'}
            >
              <Text className={wantsMedicationReminders === false ? 'text-emerald-300 font-medium' : 'text-slate-300 font-medium'}>No</Text>
            </Pressable>
          </View>

          {wantsMedicationReminders === true && (
            <>
              <Text className="text-slate-100 text-base font-medium mb-2">How many medications?</Text>
              <TextInput
                value={medicationCount}
                onChangeText={(v) => setField('medicationCount', v)}
                placeholder="e.g. 2"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 mb-6"
              />
              <Text className="text-slate-100 text-base font-medium mb-2">What times?</Text>
              <TextInput
                value={medicationTimes}
                onChangeText={(v) => setField('medicationTimes', v)}
                placeholder="e.g. 8am, 2pm"
                placeholderTextColor="#64748b"
                className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 mb-8"
              />
              <Pressable onPress={() => goToNextModuleScreen(router)} className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400">
                <Text className="text-white text-lg text-center font-semibold">Continue →</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
