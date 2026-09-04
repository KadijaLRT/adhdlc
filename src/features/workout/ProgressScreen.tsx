import { View, Text, ScrollView } from 'react-native';
import { useAppStore, selectSetLogs, selectPersonalRecords, selectUnitSystem } from '@/store/index';
import { WORKOUT_EXERCISES } from '@/content/exercises';
import { Heading, Subheading } from '@/shared/components/Heading';
import { convertWeightForDisplay, weightUnitLabel } from '@/shared/formatUnits';
import {
  calculateWorkoutStreak,
  calculateTotalWorkouts,
  calculateTotalVolume,
  calculateEstimatedMinutes,
  calculateWeeklyVolume,
  getTopRecords,
} from './progressCalculations';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-white rounded-2xl p-4 flex-1 dark:bg-slate-900">
      <Text className="text-amber-700 text-2xl font-bold mb-1 dark:text-amber-400">{value}</Text>
      <Text className="text-slate-500 text-xs">{label}</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const setLogs = useAppStore(selectSetLogs);
  const unitSystem = useAppStore(selectUnitSystem);
  const wUnit = weightUnitLabel(unitSystem);
  const personalRecords = useAppStore(selectPersonalRecords);

  const streak = calculateWorkoutStreak(setLogs);
  const totalWorkouts = calculateTotalWorkouts(setLogs);
  const totalVolume = calculateTotalVolume(setLogs);
  const estimatedMinutes = calculateEstimatedMinutes(setLogs);
  const weeklyVolume = calculateWeeklyVolume(setLogs);
  const topRecords = getTopRecords(personalRecords);

  const maxVolume = Math.max(...weeklyVolume.map((w) => w.volume), 1);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Progress</Heading>
        <Text className="text-slate-500 text-sm mb-6">
          Every number here only ever adds up. Nothing here can go backward.
        </Text>

        <View className="flex-row gap-3 mb-3">
          <StatCard label="Day streak" value={String(streak)} />
          <StatCard label="Total workouts" value={String(totalWorkouts)} />
        </View>
        <View className="flex-row gap-3 mb-6">
          <StatCard label="Minutes (est.)" value={String(estimatedMinutes)} />
          <StatCard label="Volume lifted" value={`${convertWeightForDisplay(totalVolume, unitSystem).toLocaleString()} ${wUnit}`} />
        </View>

        <Subheading className="mb-3">Last 6 weeks</Subheading>
        <View className="bg-white rounded-2xl p-4 mb-6 flex-row items-end gap-2 dark:bg-slate-900" style={{ height: 140 }}>
          {(weeklyVolume || []).map((point) => (
            <View key={point.weekLabel} className="flex-1 items-center">
              <View
                className="w-full bg-indigo-500 rounded-t-md"
                style={{ height: Math.max((point.volume / maxVolume) * 90, point.volume > 0 ? 6 : 2) }}
              />
              {/*
                Bug fix: this fixed-height (140px) chart container had
                no ceiling on how large this label's text could render
                under OS-level accessibility font scaling (up to 200%+
                on iOS) — at large enough scaling, the label could
                genuinely clip against the container's fixed height. A
                bar chart's proportions are meant to stay visually
                compact regardless of text-size preference, so this
                caps scaling on just this small label rather than
                growing the whole chart to accommodate it.
              */}
              <Text className="text-slate-500 text-[10px] mt-2" maxFontSizeMultiplier={1.3}>{point.weekLabel}</Text>
            </View>
          ))}
        </View>

        <Subheading className="mb-3">Recent records</Subheading>
        {topRecords.length === 0 ? (
          <Text className="text-slate-500 text-sm">Log a set to start building your records here.</Text>
        ) : (
          <View className="gap-2">
            {topRecords.map((record) => {
              const exercise = WORKOUT_EXERCISES?.[record.exerciseId];
              return (
                <View key={record.exerciseId} className="bg-white rounded-xl p-3 flex-row items-center justify-between dark:bg-slate-900">
                  <Text className="text-slate-800 text-sm dark:text-slate-200">{exercise?.name || record.exerciseId}</Text>
                  <Text className="text-emerald-700 text-sm font-medium dark:text-emerald-400">
                    {convertWeightForDisplay(record.bestWeight, unitSystem)} {wUnit} × {record.bestReps}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
