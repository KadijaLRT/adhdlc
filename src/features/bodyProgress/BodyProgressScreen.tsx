import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import {
  useAppStore,
  selectWeightLog,
  selectMeasurementLog,
  selectWeightGoalLbs,
  selectWeightGoalDate,
  selectUnitSystem,
  selectDateFormat,
  type MeasurementSite,
} from '@/store/index';
import { Heading } from '@/shared/components/Heading';
import {
  getSevenDayAverage,
  getThirtyDayChange,
  getLatestWeight,
  projectGoalDate,
} from './bodyTrendCalculations';
import { calculateRequiredRate, describeRigor } from './requiredRate';
import AppleHealthImportCard from '@/features/settings/AppleHealthImportCard';
import { convertWeightForDisplay, parseWeightToLbs, weightUnitLabel, convertLengthForDisplay, parseLengthToInches, lengthUnitLabel } from '@/shared/formatUnits';
import { formatDate, toLocalDateString } from '@/shared/formatDate';

const MEASUREMENT_SITES: { id: MeasurementSite; label: string }[] = [
  { id: 'chest', label: 'Chest' },
  { id: 'waist', label: 'Waist' },
  { id: 'hips', label: 'Hips' },
  { id: 'arms', label: 'Arms' },
  { id: 'thighs', label: 'Thighs' },
  { id: 'neck', label: 'Neck' },
];

export default function BodyProgressScreen() {
  const weightLog = useAppStore(selectWeightLog);
  const measurementLog = useAppStore(selectMeasurementLog);
  const weightGoalLbs = useAppStore(selectWeightGoalLbs);
  const weightGoalDate = useAppStore(selectWeightGoalDate);
  const unitSystem = useAppStore(selectUnitSystem);
  const dateFormat = useAppStore(selectDateFormat);
  const logWeight = useAppStore((s) => s.logWeight);
  const logMeasurement = useAppStore((s) => s.logMeasurement);
  const setWeightGoal = useAppStore((s) => s.setWeightGoal);

  const wUnit = weightUnitLabel(unitSystem);
  const lUnit = lengthUnitLabel(unitSystem);

  const [weightInput, setWeightInput] = useState('');
  const [goalInput, setGoalInput] = useState(weightGoalLbs ? String(convertWeightForDisplay(weightGoalLbs, unitSystem)) : '');
  const [selectedSite, setSelectedSite] = useState<MeasurementSite>('waist');
  const [measurementInput, setMeasurementInput] = useState('');

  const latest = getLatestWeight(weightLog);
  const latestEntryDate = [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
  const sevenDayAvg = getSevenDayAverage(weightLog);
  const thirtyDayChange = getThirtyDayChange(weightLog);
  const goalDate = projectGoalDate(weightLog, weightGoalLbs);

  const daysLogged = new Set((weightLog || []).map((w) => w.date)).size;
  const totalLost = weightLog.length >= 2
    ? ([...weightLog].sort((a, b) => a.date.localeCompare(b.date))[0]?.weightLbs || 0) - (latest || 0)
    : 0;

  const handleLogWeight = () => {
    const val = Number(weightInput);
    // `if (!val) return` let a negative number through outright
    // (-20 is truthy in JS) — a body weight is never zero or negative,
    // so this checks the actual numeric range, not just falsiness.
    if (!Number.isFinite(val) || val <= 0) return;
    logWeight(parseWeightToLbs(val, unitSystem));
    setWeightInput('');
  };

  const handleLogMeasurement = () => {
    const val = Number(measurementInput);
    if (!Number.isFinite(val) || val <= 0) return;
    logMeasurement(selectedSite, parseLengthToInches(val, unitSystem));
    setMeasurementInput('');
  };

  const handleSaveGoal = () => {
    const val = Number(goalInput);
    // Same fix as above — an empty field should still clear the goal
    // (setWeightGoal(null)), but a genuinely negative or non-finite
    // typed value shouldn't silently become a valid goal weight.
    const isValidPositive = Number.isFinite(val) && val > 0;
    setWeightGoal(isValidPositive ? parseWeightToLbs(val, unitSystem) : null);
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Progress</Heading>

        <AppleHealthImportCard />
        <Text className="text-slate-500 text-sm mb-6">Trends matter more than any single day.</Text>

        <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900">
          <Text className="text-slate-700 text-sm font-medium mb-3 dark:text-slate-300">Weight trend</Text>
          <View className="flex-row flex-wrap gap-3 mb-3">
            <View className="flex-1 min-w-[45%]">
              <Text className="text-amber-700 text-xl font-bold dark:text-amber-400">{latest !== null ? `${convertWeightForDisplay(latest, unitSystem)} ${wUnit}` : '—'}</Text>
              <Text className="text-slate-500 text-xs">
                {latestEntryDate === toLocalDateString(new Date()) ? 'Today' : latestEntryDate ? formatDate(latestEntryDate, dateFormat) : '—'}
              </Text>
            </View>
            <View className="flex-1 min-w-[45%]">
              <Text className="text-amber-700 text-xl font-bold dark:text-amber-400">{sevenDayAvg !== null ? convertWeightForDisplay(sevenDayAvg, unitSystem).toFixed(1) : '—'}</Text>
              <Text className="text-slate-500 text-xs">7-day average</Text>
            </View>
            <View className="flex-1 min-w-[45%]">
              <Text className={thirtyDayChange !== null && thirtyDayChange < 0 ? 'text-emerald-700 text-xl font-bold' : 'text-slate-800 text-xl font-bold'}>
                {thirtyDayChange !== null ? `${thirtyDayChange > 0 ? '+' : ''}${convertWeightForDisplay(thirtyDayChange, unitSystem).toFixed(1)} ${wUnit}` : '—'}
              </Text>
              <Text className="text-slate-500 text-xs">30-day change</Text>
            </View>
            <View className="flex-1 min-w-[45%]">
              <Text className="text-slate-800 text-xl font-bold dark:text-slate-200">{goalDate ? formatDate(goalDate, dateFormat) : '—'}</Text>
              <Text className="text-slate-500 text-xs">Projected goal date</Text>
            </View>
          </View>

          {weightGoalLbs && weightGoalDate && latest !== null && (() => {
            const rate = calculateRequiredRate(latest, weightGoalLbs, weightGoalDate);
            if (!rate) return null;
            return (
              <View className={rate.isAggressive || rate.isPastDate ? 'bg-amber-400/10 border-2 border-amber-400 rounded-xl p-3 mb-4' : 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3 mb-4'}>
                <Text className={rate.isAggressive || rate.isPastDate ? 'text-amber-700 text-xs font-medium mb-1' : 'text-emerald-700 text-xs font-medium mb-1'}>
                  Your goal date · {formatDate(weightGoalDate, dateFormat)}
                </Text>
                <Text className="text-slate-700 text-sm dark:text-slate-300">{describeRigor(rate)}</Text>
                {!rate.isPastDate && (
                  <Text className="text-slate-500 text-xs mt-1">≈ {convertWeightForDisplay(rate.requiredWeeklyLbs, unitSystem).toFixed(2)} {wUnit}/week needed to stay on pace</Text>
                )}
              </View>
            );
          })()}

          <View className="flex-row gap-2 mb-2">
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder={`Log today's weight (${wUnit})`}
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              onSubmitEditing={handleLogWeight}
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
            <Pressable onPress={handleLogWeight} className="bg-indigo-600 rounded-xl px-4 justify-center">
              <Text className="text-white text-sm font-semibold">Log</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-2">
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder={`Goal weight (${wUnit})`}
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              onSubmitEditing={handleSaveGoal}
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
            <Pressable onPress={handleSaveGoal} className="bg-stone-100 rounded-xl px-4 justify-center dark:bg-slate-800">
              <Text className="text-slate-700 text-sm font-medium dark:text-slate-300">Set goal</Text>
            </Pressable>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900">
          <Text className="text-slate-700 text-sm font-medium mb-2 dark:text-slate-300">Body measurements</Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {(MEASUREMENT_SITES || []).map((site) => {
              const isActive = selectedSite === site.id;
              const latestForSite = [...(measurementLog || [])].filter((m) => m.site === site.id).sort((a, b) => b.date.localeCompare(a.date))[0];
              return (
                <Pressable
                  key={site.id}
                  onPress={() => setSelectedSite(site.id)}
                  className={isActive ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-xl p-2 items-center w-[30%]' : 'bg-stone-100 border-2 border-transparent rounded-xl p-2 items-center w-[30%]'}
                >
                  <Text className={isActive ? 'text-indigo-700 text-xs' : 'text-slate-700 text-xs'}>{site.label}</Text>
                  <Text className="text-slate-500 text-xs mt-1">{latestForSite ? `${convertLengthForDisplay(latestForSite.inches, unitSystem)}${lUnit === 'in' ? '"' : lUnit}` : '—'}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row gap-2">
            <TextInput
              value={measurementInput}
              onChangeText={setMeasurementInput}
              placeholder={`${MEASUREMENT_SITES.find((s) => s.id === selectedSite)?.label} (${lUnit})`}
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              onSubmitEditing={handleLogMeasurement}
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
            <Pressable onPress={handleLogMeasurement} className="bg-indigo-600 rounded-xl px-4 justify-center">
              <Text className="text-white text-sm font-semibold">Log</Text>
            </Pressable>
          </View>
        </View>

        <Text className="text-slate-900 text-lg font-semibold mb-3 dark:text-slate-100">Milestones</Text>
        <View className="gap-2">
          {daysLogged >= 1 && <MilestoneRow label="First weight logged" achieved />}
          {totalLost >= 5 && <MilestoneRow label={`First ${convertWeightForDisplay(5, unitSystem)} ${wUnit} change`} achieved />}
          {daysLogged >= 30 && <MilestoneRow label="Logged weight for 30 days" achieved />}
          {daysLogged === 0 && <Text className="text-slate-500 text-sm">Log your first weight to start unlocking milestones.</Text>}
        </View>
      </View>
    </ScrollView>
  );
}

function MilestoneRow({ label, achieved }: { label: string; achieved: boolean }) {
  return (
    <View className="bg-white rounded-xl p-3 flex-row items-center gap-2 dark:bg-slate-900">
      <Text>{achieved ? '🏆' : '⚪️'}</Text>
      <Text className="text-slate-800 text-sm dark:text-slate-200">{label}</Text>
    </View>
  );
}
