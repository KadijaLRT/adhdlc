import { useMemo, useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView } from 'react-native';
import { useAppStore, selectCycleTrackingEnabled, selectCycleLogs, selectDateFormat, selectEnergyLogs, selectStressLogs, type CycleLogEntry } from '@/store/index';
import { getPeriodStartDates, getAverageCycleLength, getPredictedNextPeriod, getPhaseCorrelations } from './cyclePredictions';
import CycleCalendar from './CycleCalendar';
import AppleHealthImportCard from '@/features/settings/AppleHealthImportCard';
import { formatDate } from '@/shared/formatDate';

type Phase = CycleLogEntry['phase'];
const PHASE_OPTIONS: { phase: Phase; label: string }[] = [
  { phase: 'menstrual', label: 'Menstrual' }, { phase: 'follicular', label: 'Follicular' },
  { phase: 'ovulation', label: 'Ovulation' }, { phase: 'luteal', label: 'Luteal' }, { phase: 'unspecified', label: 'Not sure' },
];
const LEVEL_EMOJI: Record<'low' | 'medium' | 'high', string> = { low: '🔋', medium: '🔋🔋', high: '🔋🔋🔋' };

export default function CycleTracking() {
  const cycleTrackingEnabled = useAppStore(selectCycleTrackingEnabled);
  const setCycleTrackingEnabled = useAppStore((s) => s.setCycleTrackingEnabled);
  const cycleLogs = useAppStore(selectCycleLogs);
  const energyLogs = useAppStore(selectEnergyLogs);
  const stressLogs = useAppStore(selectStressLogs);
  const dateFormat = useAppStore(selectDateFormat);
  const logCycleForToday = useAppStore((s) => s.logCycleForToday);
  const logCycleForDate = useAppStore((s) => s.logCycleForDate);
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const todaysLog = (cycleLogs || []).find((l) => l.date === today);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedDateLog = selectedDate ? (cycleLogs || []).find((l) => l.date === selectedDate) : null;

  const periodStarts = useMemo(() => getPeriodStartDates(cycleLogs || []), [cycleLogs]);
  const averageCycleLength = useMemo(() => getAverageCycleLength(periodStarts), [periodStarts]);
  const predictedNext = useMemo(() => getPredictedNextPeriod(periodStarts, averageCycleLength), [periodStarts, averageCycleLength]);
  const lastPeriodStart = periodStarts[periodStarts.length - 1];
  const correlations = useMemo(
    () => getPhaseCorrelations(cycleLogs || [], energyLogs || [], stressLogs || []),
    [cycleLogs, energyLogs, stressLogs]
  );
  const hasAnyCorrelationData = correlations.some((c) => c.daysLogged > 0 && (c.averageEnergy || c.averageStress));

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View className="bg-white rounded-2xl p-5 w-full dark:bg-slate-900">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-slate-900 text-base font-semibold dark:text-slate-100">Cycle Tracking</Text>
          <Switch value={cycleTrackingEnabled} onValueChange={setCycleTrackingEnabled}
            trackColor={{ false: '#334155', true: '#4f46e5' }} thumbColor="#e2e8f0" />
        </View>
        <Text className="text-slate-500 text-xs mb-4">Optional. Off by default. Only you can see this.</Text>
        {cycleTrackingEnabled && (
          <View className="flex-row flex-wrap gap-2">
            {(PHASE_OPTIONS || []).map((option) => {
              const isActive = todaysLog?.phase === option.phase;
              return (
                <Pressable key={option.phase} onPress={() => logCycleForToday(option.phase)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 px-4' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-2 px-4 active:border-stone-300'}>
                  <Text className={isActive ? 'text-emerald-700 dark:text-emerald-400 text-sm font-medium' : 'text-slate-700 dark:text-slate-300 text-sm font-medium'}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {cycleTrackingEnabled && (
        <>
          <CycleCalendar cycleLogs={cycleLogs || []} onSelectDate={(date) => setSelectedDate(date)} />
          {selectedDate && (
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-indigo-400">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{formatDate(selectedDate, dateFormat)}</Text>
                <Pressable onPress={() => setSelectedDate(null)}>
                  <Text className="text-slate-400 text-sm">✕</Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {PHASE_OPTIONS.map((option) => {
                  const isActive = selectedDateLog?.phase === option.phase;
                  return (
                    <Pressable
                      key={option.phase}
                      onPress={() => { logCycleForDate(selectedDate, option.phase); setSelectedDate(null); }}
                      className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 px-4' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-2 px-4 active:border-stone-300'}
                    >
                      <Text className={isActive ? 'text-emerald-700 dark:text-emerald-400 text-sm font-medium' : 'text-slate-700 dark:text-slate-300 text-sm font-medium'}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}
      {cycleTrackingEnabled && periodStarts.length > 0 && (
        <View className="bg-white rounded-2xl p-5 w-full dark:bg-slate-900">
          <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-3">History & Estimate</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-500 text-sm">Periods logged</Text>
            <Text className="text-slate-800 dark:text-slate-200 text-sm font-medium">{periodStarts.length}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-500 text-sm">Last period started</Text>
            <Text className="text-slate-800 dark:text-slate-200 text-sm font-medium">{lastPeriodStart ? formatDate(lastPeriodStart, dateFormat) : '—'}</Text>
          </View>
          {averageCycleLength ? (
            <>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-500 text-sm">Average cycle length</Text>
                <Text className="text-slate-800 dark:text-slate-200 text-sm font-medium">{averageCycleLength} days</Text>
              </View>
              {predictedNext && (
                <View className="bg-indigo-600/10 rounded-xl p-3 mt-2">
                  <Text className="text-indigo-700 dark:text-indigo-300 text-sm font-medium">Next period estimate: {formatDate(predictedNext, dateFormat)}</Text>
                  <Text className="text-slate-500 text-xs mt-1">Based on your average cycle — an estimate, not a guarantee.</Text>
                </View>
              )}
            </>
          ) : (
            <Text className="text-slate-500 text-xs mt-1">Log or import one more period to see your average cycle length and an estimate for your next one.</Text>
          )}
        </View>
      )}

      {cycleTrackingEnabled && hasAnyCorrelationData && (
        <View className="bg-white rounded-2xl p-5 w-full dark:bg-slate-900">
          <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-1">Energy & Stress by Phase</Text>
          <Text className="text-slate-500 text-xs mb-3">
            Comparing days you logged a phase against your energy and stress check-ins for those same days. There's no separate mood tracker in the app yet — this uses what's already there.
          </Text>
          <View className="gap-2">
            {correlations.filter((c) => c.daysLogged > 0).map((c) => (
              <View key={c.phase} className="flex-row items-center justify-between bg-stone-50 dark:bg-slate-800 rounded-xl p-3">
                <View className="flex-1">
                  <Text className="text-slate-800 dark:text-slate-200 text-sm font-medium">{PHASE_OPTIONS.find((p) => p.phase === c.phase)?.label}</Text>
                  <Text className="text-slate-400 text-xs">{c.daysLogged} day{c.daysLogged === 1 ? '' : 's'} logged</Text>
                </View>
                <View className="items-end">
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">{c.averageEnergy ? `${LEVEL_EMOJI[c.averageEnergy]} energy` : 'No energy data'}</Text>
                  <Text className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">{c.averageStress ? `${LEVEL_EMOJI[c.averageStress]} stress` : 'No stress data'}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text className="text-slate-400 text-xs mt-3">Only days with both a logged phase and a check-in count here — nothing is estimated or filled in.</Text>
        </View>
      )}

      {cycleTrackingEnabled && (
        <AppleHealthImportCard />
      )}
    </ScrollView>
  );
}
