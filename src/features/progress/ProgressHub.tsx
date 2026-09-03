import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useAppStore, selectStreaks, selectMilestones, selectTasks, selectSavedRecipeIds, selectSetLogs, selectUnitSystem,
} from '@/store/index';
import { MILESTONE_DEFINITIONS, getUnlockedTiers } from '@/content/milestoneDefinitions';
import { SKILLS, UNLOCKABLES, xpToLevel, xpForNextLevel } from '@/content/rpgCatalog';
import { calculateWorkoutStreak, calculateTotalVolume } from '@/features/workout/progressCalculations';
import { convertWeightForDisplay, weightUnitLabel } from '@/shared/formatUnits';
import { Heading, Subheading } from '@/shared/components/Heading';

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-1 min-w-[45%]">
      <Text className="text-amber-700 text-xl font-bold mb-1">{value}</Text>
      <Text className="text-slate-500 text-xs">{label}</Text>
    </View>
  );
}

/**
 * Everything that's tracked data or measured progress across the app —
 * moved here from the You/Profile tab, which is now purely identity
 * and settings. Sits between Wellness and You in the tab bar.
 */
export default function ProgressHub() {
  const router = useRouter();
  const totalXp = useAppStore((s) => s.totalXp);
  const coins = useAppStore((s) => s.coins);
  const skillXp = useAppStore((s) => s.skillXp);
  const ownedUnlockables = useAppStore((s) => s.ownedUnlockables);
  const purchaseUnlockable = useAppStore((s) => s.purchaseUnlockable);
  const streaks = useAppStore(selectStreaks);
  const milestones = useAppStore(selectMilestones);
  const tasks = useAppStore(selectTasks);
  const savedRecipeIds = useAppStore(selectSavedRecipeIds);
  const setLogs = useAppStore(selectSetLogs);
  const unitSystem = useAppStore(selectUnitSystem);

  const longestStreak = Math.max(0, ...(streaks || []).map((s) => s.count || 0));
  const tasksCompleted = (tasks || []).filter((t) => t.isComplete).length;
  const workoutStreak = calculateWorkoutStreak(setLogs);
  const totalVolume = calculateTotalVolume(setLogs);

  const level = xpToLevel(totalXp || 0);
  const nextLevelXp = xpForNextLevel(level);
  // Bug fix: this used to be (totalXp / nextLevelXp) * 100 — but
  // nextLevelXp is the ABSOLUTE XP threshold for the next level, which
  // already includes every previous level's XP. That formula shows
  // progress toward a cumulative total, not progress through the
  // current level, so right after leveling up the bar could show ~31%
  // full when real progress through the new level was only ~8% — and
  // the gap widens at higher levels. This computes progress within
  // just the current level's own XP span instead.
  const currentLevelStartXp = level > 1 ? xpForNextLevel(level - 1) : 0;
  const currentLevelSpan = nextLevelXp - currentLevelStartXp;
  const xpIntoCurrentLevel = (totalXp || 0) - currentLevelStartXp;
  const levelProgressPercent = currentLevelSpan > 0
    ? Math.min((xpIntoCurrentLevel / currentLevelSpan) * 100, 100)
    : 100;

  const unlockedMilestoneCount = (MILESTONE_DEFINITIONS || []).reduce((sum, def) => {
    const progress = (milestones || []).find((m) => m.trackedEvent === def.trackedEvent);
    return sum + getUnlockedTiers(def, progress?.count || 0).length;
  }, 0);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Progress</Heading>
        <Text className="text-slate-500 text-sm mb-4">Everything you've tracked, in one place.</Text>

        <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6">
          <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-1">Level {level} · {coins || 0} coins</Text>
          <View className="h-2 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <View className="h-2 bg-amber-400 rounded-full" style={{ width: `${levelProgressPercent}%` }} />
          </View>
          <Text className="text-slate-500 text-xs">{xpIntoCurrentLevel} / {currentLevelSpan} XP to level {level + 1}</Text>
        </View>

        <Subheading className="mb-3">Skills</Subheading>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {(SKILLS || []).map((skill) => (
            <View key={skill.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 w-[31%] items-center">
              <Text className="text-xl mb-1">{skill.emoji}</Text>
              <Text className="text-slate-700 dark:text-slate-300 text-xs text-center">{skill.label}</Text>
              <Text className="text-amber-700 text-sm font-semibold mt-1">{skillXp?.[skill.id] || 0}</Text>
            </View>
          ))}
        </View>

        <Subheading className="mb-3">Your journey</Subheading>
        <View className="flex-row flex-wrap gap-3 mb-6">
          <StatTile label="Tasks completed" value={String(tasksCompleted)} />
          <StatTile label="Longest routine streak" value={`${longestStreak} days`} />
          <StatTile label="Workout day streak" value={String(workoutStreak)} />
          <StatTile label="Volume lifted" value={`${convertWeightForDisplay(totalVolume, unitSystem).toLocaleString()} ${weightUnitLabel(unitSystem)}`} />
          <StatTile label="Saved recipes" value={String((savedRecipeIds || []).length)} />
          <StatTile label="Milestones unlocked" value={String(unlockedMilestoneCount)} />
        </View>

        <Subheading className="mb-3">Detailed progress</Subheading>
        <View className="gap-2 mb-6">
          <Pressable onPress={() => router?.push?.('/achievements')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">🏆 Achievements</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/fitness/progress')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">💪 Workout progress</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/body/progress')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">📏 Weight & measurements</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/nutrition/diary')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">📊 Nutrition diary</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/school')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">🎓 School & GPA</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/settings/cycle-tracking')} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="text-slate-800 dark:text-slate-200 text-sm">🌙 Cycle tracking</Text>
            <Text className="text-slate-600 text-xs">→</Text>
          </Pressable>
        </View>

        <Subheading className="mb-3">Shop</Subheading>
        <View className="gap-2">
          {(UNLOCKABLES || []).map((item) => {
            const owned = (ownedUnlockables || []).includes(item.id);
            return (
              <View key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Text className="text-xl">{item.emoji}</Text>
                  <Text className="text-slate-900 dark:text-slate-100">{item.label}</Text>
                </View>
                {owned ? (
                  <Text className="text-emerald-700 text-sm font-medium">Owned</Text>
                ) : (
                  <Pressable
                    onPress={() => purchaseUnlockable(item.id, item.cost)}
                    disabled={(coins || 0) < item.cost}
                    className={(coins || 0) < item.cost ? 'bg-stone-100 dark:bg-slate-800 rounded-full py-2 px-4' : 'bg-indigo-600 rounded-full py-2 px-4 active:bg-indigo-500'}
                  >
                    <Text className={(coins || 0) < item.cost ? 'text-slate-600 text-xs' : 'text-white text-xs font-semibold'}>{item.cost} coins</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
