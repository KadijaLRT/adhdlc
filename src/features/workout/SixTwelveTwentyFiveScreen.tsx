import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectFitnessPreferences, selectGyms, selectActiveGymId } from '@/store/index';
import {
  SIX_TWELVE_TWENTYFIVE_GROUPS, pickSixTwelveTwentyFiveTemplate, type SixTwelveTwentyFiveGroup,
} from '@/content/sixTwelveTwentyFive';
import { WORKOUT_EXERCISES } from '@/content/exercises';
import { Heading, Subheading } from '@/shared/components/Heading';

function InfoRow({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <View className="flex-row gap-2 mb-1.5">
      <Text className="text-sm">{emoji}</Text>
      <Text className="text-slate-600 dark:text-slate-300 text-xs flex-1 leading-4">{children}</Text>
    </View>
  );
}

/**
 * Landing screen for the 6-12-25 method: brief explainer (what it is,
 * who it's a good fit for), then a muscle-group grid. Picking a group
 * builds the 3-exercise template and hands it to the runner screen —
 * this screen itself never starts a session.
 */
export default function SixTwelveTwentyFiveScreen() {
  const router = useRouter();
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const gyms = useAppStore(selectGyms);
  const activeGymId = useAppStore(selectActiveGymId);
  const activeGym = gyms.find((g) => g.id === activeGymId) || null;
  const equipment = activeGym?.equipment?.length ? activeGym.equipment : fitnessPreferences?.equipment;

  const [showMore, setShowMore] = useState(false);

  const handlePickGroup = (group: SixTwelveTwentyFiveGroup) => {
    const template = pickSixTwelveTwentyFiveTemplate(group, equipment);
    if (!template.length) return; // no exercises available for this group with current equipment — nothing to start
    router?.push?.({
      pathname: '/workout/six-twelve-twentyfive/run',
      params: {
        group,
        exerciseIds: template.map((s) => s.exerciseId).join(','),
      },
    });
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">6-12-25 Method</Heading>
        <Text className="text-slate-500 text-sm mb-4">
          Three exercises, same muscle group, back-to-back: 6 reps heavy, 12 reps moderate, 25 reps light.
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4">
          <InfoRow emoji="🏆">Heavy compound movement, ~80–85% effort, 6 reps — builds mechanical tension.</InfoRow>
          <InfoRow emoji="⚖️">Reduce the load, 12 reps — the sweet spot between load and volume.</InfoRow>
          <InfoRow emoji="🔥">Lighter weight, 25 reps — accumulates fatigue, metabolites, and the burn.</InfoRow>

          <Pressable onPress={() => setShowMore((v) => !v)} className="mt-2">
            <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">
              {showMore ? 'Hide details' : 'Who is this a good fit for? →'}
            </Text>
          </Pressable>

          {showMore && (
            <View className="mt-3 pt-3 border-t border-stone-100 dark:border-slate-800">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">Good fit</Text>
              <Text className="text-slate-500 text-xs mb-3 leading-4">
                Intermediate/advanced lifters · muscle-building phases · breaking a plateau · time-efficient training.
              </Text>
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">Not the best fit</Text>
              <Text className="text-slate-500 text-xs leading-4">
                Beginners still learning movement patterns · lifters still building a strength foundation · anyone without experience training under fatigue.
              </Text>
            </View>
          )}
        </View>

        <Subheading className="mb-2">Choose a muscle group</Subheading>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {SIX_TWELVE_TWENTYFIVE_GROUPS.map((g) => {
            const template = pickSixTwelveTwentyFiveTemplate(g.id, equipment);
            const disabled = template.length === 0;
            return (
              <Pressable
                key={g.id}
                onPress={() => handlePickGroup(g.id)}
                disabled={disabled}
                className={
                  disabled
                    ? 'w-[31%] bg-stone-100 dark:bg-slate-900 rounded-2xl p-3 items-center opacity-40'
                    : 'w-[31%] bg-white dark:bg-slate-900 rounded-2xl p-3 items-center active:opacity-70'
                }
              >
                <Text className="text-xl mb-1">{g.icon}</Text>
                <Text className="text-slate-800 dark:text-slate-200 text-xs font-medium text-center">{g.label}</Text>
                {!disabled && (
                  <Text className="text-slate-400 text-[10px] mt-1 text-center" numberOfLines={2}>
                    {template.map((s) => WORKOUT_EXERCISES?.[s.exerciseId]?.name).filter(Boolean).join(' · ')}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text className="text-slate-400 text-[11px] text-center leading-4">
          Exercises are chosen automatically based on your saved equipment. You can swap any exercise once you start.
        </Text>
      </View>
    </ScrollView>
  );
}
