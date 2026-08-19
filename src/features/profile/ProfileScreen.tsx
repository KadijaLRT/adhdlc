import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Heading, Subheading } from '@/shared/components/Heading';
import {
  useAppStore, selectProfile, selectScheduleItems,
} from '@/store/index';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAppStore(selectProfile);
  const clearProfile = useAppStore((s) => s.clearProfile);
  const scheduleItems = useAppStore(selectScheduleItems);
  const setNutritionPreferences = useAppStore((s) => s.setNutritionPreferences);
  const setFitnessPreferences = useAppStore((s) => s.setFitnessPreferences);
  const setWellnessPreferences = useAppStore((s) => s.setWellnessPreferences);
  const setCycleTrackingEnabled = useAppStore((s) => s.setCycleTrackingEnabled);
  const removeScheduleItem = useAppStore((s) => s.removeScheduleItem);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleResetOnboarding = async () => {
    await clearProfile();
    await setNutritionPreferences({ allergies: [], dietaryRestrictions: [], foodsLoved: [], foodsAvoided: [] });
    await setFitnessPreferences({ equipment: [], primaryGoal: null });
    // Explicitly omits weedLog — that's logged history, not a setup
    // preference, and clearing it here would be real, unexpected data
    // loss for someone who just wants to redo their setup answers.
    await setWellnessPreferences({ bloodTypeEnabled: false, bloodType: null, cannabisModuleEnabled: false });
    await setCycleTrackingEnabled(false);
    // Only removes items onboarding itself created (see the `med-`
    // prefix used in onboarding/final.tsx) — anything the person added
    // to their schedule afterward is left untouched.
    const onboardingCreatedItems = (scheduleItems || []).filter((item) => item.id.startsWith('med-'));
    for (const item of onboardingCreatedItems) {
      // eslint-disable-next-line no-await-in-loop -- small, bounded list (a handful of medication reminders at most), sequential removal keeps this simple and avoids any write-ordering surprise
      await removeScheduleItem(item.id);
    }
    router?.replace?.('/onboarding/welcome');
  };

  const handleExportData = async () => {
    // Previously listed only 5 specific fields (profile, tasks,
    // streaks, milestones, setLogs) — genuinely just a fraction of
    // what this app tracks (routines, schedule, school, nutrition,
    // workout programs, body progress, and more), despite the button
    // saying "Export my data." Rather than hand-list every field
    // (which is exactly how the old version drifted out of date as
    // the app grew — a new store slice added later never
    // automatically shows up in a manually-maintained list),
    // getState() pulls the entire live store: every actual data field
    // this app has, automatically comprehensive as new ones get
    // added. JSON.stringify silently omits the ~100+ action functions
    // mixed into the same store object — only plain data survives.
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      data: useAppStore.getState(),
    };
    try {
      await Share.share({
        message: JSON.stringify(exportPayload, null, 2),
        title: 'ADHD Life Coach data export',
      });
    } catch (error) {
      console.error('ProfileScreen: export failed', error);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">{profile?.displayName || 'You'}</Heading>
        <Text className="text-slate-500 text-sm mb-6">
          {profile?.biggestHurdle ? `Working on: ${profile.biggestHurdle}` : 'Your preferences, settings, and data.'}
        </Text>

        <Subheading className="mb-3">Personalize</Subheading>
        <View className="gap-2 mb-6">
          <Pressable onPress={() => router?.push?.('/settings/edit-nutrition')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">🍎 Nutrition preferences</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/settings/edit-fitness')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">💪 Fitness preferences</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
        </View>

        <Subheading className="mb-3">Settings</Subheading>
        <View className="gap-2 mb-6">
          <Pressable onPress={() => router?.push?.('/settings/notifications')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">🔔 Notifications</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/settings/accessibility')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">♿ Accessibility</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
        </View>

        <Subheading className="mb-3">Your data</Subheading>
        <View className="gap-2 mb-6">
          <Pressable onPress={handleExportData} className="bg-white dark:bg-slate-900 rounded-xl p-4">
            <Text className="text-slate-800 dark:text-slate-200 text-sm mb-1">Export my data</Text>
            <Text className="text-slate-500 text-xs">Everything stays on your device. This shares a copy, nothing is uploaded automatically.</Text>
          </Pressable>
        </View>

        {confirmingReset ? (
          <View className="border-2 border-red-400 bg-red-400/10 rounded-2xl p-4">
            <Text className="text-red-500 text-sm font-medium mb-3">
              This resets your setup answers — energy baseline, coaching style, food/fitness/wellness preferences, cycle tracking, and any medication reminders from onboarding. Your tasks, streaks, workout history, and everything else you've built up stay exactly as they are.
            </Text>
            <View className="flex-row gap-2">
              <Pressable onPress={handleResetOnboarding} className="flex-1 bg-red-500 rounded-xl py-2.5 items-center active:bg-red-400">
                <Text className="text-white text-sm font-semibold">Start over</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmingReset(false)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingReset(true)} className="py-2">
            <Text className="text-red-500 text-center text-xs">Start over from setup</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
