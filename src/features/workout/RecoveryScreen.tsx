import { View, Text, ScrollView } from 'react-native';
import { useAppStore, selectSetLogs, selectCardioActivities } from '@/store/index';
import { calculateWorkoutStreak } from './progressCalculations';
import { RECOVERY_TIPS } from '@/content/recoveryContent';
import RecoveryPlanCard from './RecoveryPlanCard';
import { Heading, Subheading } from '@/shared/components/Heading';
import { CollapsibleSection } from '@/shared/components/CollapsibleSection';

export default function RecoveryScreen() {
  const setLogs = useAppStore(selectSetLogs);
  const cardioActivities = useAppStore(selectCardioActivities);
  const streak = calculateWorkoutStreak(setLogs, cardioActivities.map((c) => c.date));

  // A gentle nudge, never a rule — offered only past a few consecutive
  // days, and phrased as a suggestion, not an instruction.
  const suggestRestDay = streak >= 4;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Recovery</Heading>
        <Text className="text-slate-500 text-sm mb-6">
          Staying consistent matters more than any single hard session.
        </Text>

        {suggestRestDay && (
          <View className="bg-emerald-400/10 border-2 border-emerald-400 rounded-2xl p-4 mb-6">
            <Text className="text-emerald-700 text-sm dark:text-emerald-400">
              You've shown up {streak} days in a row. A rest day today is a completely valid choice, not a step backward.
            </Text>
          </View>
        )}

        <RecoveryPlanCard />

        <Subheading className="mb-3 mt-6">Good to know</Subheading>
        <View className="gap-2">
          <CollapsibleSection title="💧 Hydration" defaultOpen={false} subtitle="Tap to expand">
            <Text className="text-slate-500 text-sm">{RECOVERY_TIPS.hydration}</Text>
          </CollapsibleSection>
          <CollapsibleSection title="😴 Sleep" defaultOpen={false} subtitle="Tap to expand">
            <Text className="text-slate-500 text-sm">{RECOVERY_TIPS.sleep}</Text>
          </CollapsibleSection>
          <CollapsibleSection title="🩹 Soreness" defaultOpen={false} subtitle="Tap to expand">
            <Text className="text-slate-500 text-sm">{RECOVERY_TIPS.soreness}</Text>
          </CollapsibleSection>
          <CollapsibleSection title="🛌 Rest days" defaultOpen={false} subtitle="Tap to expand">
            <Text className="text-slate-500 text-sm">{RECOVERY_TIPS.restDays}</Text>
          </CollapsibleSection>
        </View>
      </View>
    </ScrollView>
  );
}
