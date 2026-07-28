import { View, Text, Pressable, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Heading, Subheading } from '@/shared/components/Heading';
import { useAppStore, selectProfile, selectStreaks, selectMilestones, selectTasks, selectSetLogs } from '@/store/index';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAppStore(selectProfile);
  const clearProfile = useAppStore((s) => s.clearProfile);
  const streaks = useAppStore(selectStreaks);
  const milestones = useAppStore(selectMilestones);
  const tasks = useAppStore(selectTasks);
  const setLogs = useAppStore(selectSetLogs);

  const handleResetOnboarding = async () => {
    await clearProfile();
    router?.replace?.('/onboarding/welcome');
  };

  const handleExportData = async () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile,
      tasks,
      streaks,
      milestones,
      setLogs,
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

        <Pressable onPress={handleResetOnboarding} className="py-2">
          <Text className="text-red-500 text-center text-xs">Start over from setup</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
