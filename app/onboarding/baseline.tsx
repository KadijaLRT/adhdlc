import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useAppStore, type EnergyLevel } from '@/store/index';
import { syncProfileIfSignedIn } from '@/core/supabase/client';

const LEVELS: { level: EnergyLevel; label: string }[] = [
  { level: 'low', label: 'Low' }, { level: 'medium', label: 'Medium' }, { level: 'high', label: 'High' },
];

export default function BaselineScreen() {
  const router = useRouter();
  const biggestHurdle = useOnboardingStore((s) => s.biggestHurdle);
  const energyBaseline = useOnboardingStore((s) => s.energyBaseline);
  const stressThreshold = useOnboardingStore((s) => s.stressThreshold);
  const setField = useOnboardingStore((s) => s.setField);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const setEnergyLevel = useAppStore((s) => s.setEnergyLevel);
  const setProfile = useAppStore((s) => s.setProfile);

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timezone = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'UTC';
    const profile = { timezone, energyBaseline, stressThreshold, biggestHurdle, onboardingCompletedAt: new Date().toISOString() };

    // Local save is the real, immediate source of truth — fully offline,
    // no account required.
    setEnergyLevel(energyBaseline);
    await setProfile(profile);

    // Optional, silent-if-absent cloud sync. Never blocks navigation.
    syncProfileIfSignedIn(profile);

    resetOnboarding();
    router?.replace?.('/(tabs)/home');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 w-full max-w-md self-center px-6 pt-safe pb-safe justify-center">
        <Text accessibilityRole="header" className="text-slate-100 text-2xl font-semibold mb-6">
          Let&apos;s set your baseline.
        </Text>
        <Text className="text-slate-300 text-base mb-2">Typical energy level</Text>
        <View className="flex-row gap-2 mb-6">
          {(LEVELS || []).map((option) => {
            const isActive = energyBaseline === option.level;
            return (
              <Pressable key={option.level} onPress={() => setField('energyBaseline', option.level)}
                accessibilityRole="radio" accessibilityState={{ selected: isActive }} accessibilityLabel={`Energy baseline ${option.label}`}
                className={isActive ? 'flex-1 bg-indigo-600/20 border-2 border-indigo-400 rounded-xl py-3 items-center' : 'flex-1 bg-slate-800 border-2 border-transparent rounded-xl py-3 items-center'}>
                <Text className={isActive ? 'text-indigo-200' : 'text-slate-300'}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-slate-300 text-base mb-2">Typical stress level</Text>
        <View className="flex-row gap-2 mb-10">
          {(LEVELS || []).map((option) => {
            const isActive = stressThreshold === option.level;
            return (
              <Pressable key={option.level} onPress={() => setField('stressThreshold', option.level)}
                accessibilityRole="radio" accessibilityState={{ selected: isActive }} accessibilityLabel={`Stress threshold ${option.label}`}
                className={isActive ? 'flex-1 bg-amber-400/10 border-2 border-amber-400 rounded-xl py-3 items-center' : 'flex-1 bg-slate-800 border-2 border-transparent rounded-xl py-3 items-center'}>
                <Text className={isActive ? 'text-amber-200' : 'text-slate-300'}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={handleFinish} accessibilityRole="button" accessibilityLabel="Finish onboarding and go to home dashboard"
          className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400">
          <Text className="text-slate-950 text-lg text-center font-semibold">Take me to my dashboard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
