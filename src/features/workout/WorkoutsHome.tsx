import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  useAppStore, selectActiveProgramId, selectFitnessPreferences, selectFitnessCardDismissed, selectEnergyLevel,
  selectGyms, selectActiveGymId, selectSetLogs, selectWeekdayAssignment,
} from '@/store/index';
import { PROGRAMS } from '@/content/programs';
import { getCurrentProgramWeek, getSessionsThisWeek } from './buildProgramSession';
import { buildWeeklySplit, type WeeklySplitDay } from './buildWeeklySplit';
import { getWeightProgressLabel } from './weightProgress';
import { pickStartSomewhereExercise } from './pickStartSomewhere';
import { WORKOUT_EXERCISES } from '@/content/exercises';
import { getWarmupForGroups } from '@/content/warmupContent';
import PersonalizeFitnessCard from './PersonalizeFitnessCard';
import RecoveryPlanCard from './RecoveryPlanCard';
import InlineStepTimer from '@/shared/components/InlineStepTimer';
import { Heading, Subheading } from '@/shared/components/Heading';
import { getRepository } from '@/core/storage';
import { buildSessionKey } from './WorkoutDaySession';
import type { WorkoutSessionDraft } from '@/store/slices/workoutSlice';

function DayStrip({
  days, activeIndex, onJumpTo, onEditDay,
}: {
  days: WeeklySplitDay[]; activeIndex: number;
  onJumpTo: (index: number) => void; onEditDay: (weekdayIndex: number) => void;
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={days}
      keyExtractor={(d) => d.weekdayLabel}
      contentContainerStyle={{ gap: 8, marginBottom: 16 }}
      renderItem={({ item, index }) => {
        const isActive = index === activeIndex;
        return (
          <View className={isActive ? 'bg-indigo-600/10 border-2 border-indigo-500 rounded-2xl p-3 items-center w-24' : 'bg-white border-2 border-transparent rounded-2xl p-3 items-center w-24'}>
            <Pressable onPress={() => onJumpTo(index)} className="items-center">
              <Text className={isActive ? 'text-indigo-700 text-xs font-bold' : 'text-slate-500 text-xs font-bold'}>{item.weekdayLabel}</Text>
              <Text className={isActive ? 'text-indigo-700 text-sm font-semibold mt-1' : 'text-slate-700 text-sm mt-1'}>
                {item.isRestDay ? 'Rest' : `Day ${item.dayLetter}`}
              </Text>
            </Pressable>
            <Pressable onPress={() => onEditDay(index)} className="mt-1.5">
              <Text className="text-slate-400 text-[10px]">✏️ edit</Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

function DayCard({
  day, onStart, onLayout, programId, isResumable,
}: {
  day: WeeklySplitDay; onStart: () => void; onLayout: (y: number) => void; programId?: string; isResumable?: boolean;
}) {
  const router = useRouter();
  const setLogs = useAppStore(selectSetLogs);
  const [showWarmup, setShowWarmup] = useState(false);

  // Tied specifically to what this day trains — a lower-body day gets
  // the lower-body warm-up, not a generic one. Deliberately separate
  // from Recovery/stretching (which lives on rest days below): warming
  // up is prep for today's session, recovery is a different concern
  // for a different kind of day, and the two shouldn't route to the
  // same place.
  const warmup = useMemo(() => getWarmupForGroups(day.muscleGroups), [day.muscleGroups]);

  if (day.isRestDay) {
    return (
      <View
        onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
        className="bg-white rounded-2xl p-6 mb-4 items-center dark:bg-slate-900"
      >
        <Text className="text-2xl mb-2">😌</Text>
        <Text className="text-slate-900 text-lg font-semibold mb-1 dark:text-slate-100">Rest day</Text>
        <Text className="text-slate-500 text-sm text-center mb-4">Recovery is part of the program, not a break from it.</Text>
        <RecoveryPlanCard compact />
      </View>
    );
  }

  return (
    <View
      onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
      className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900"
    >
      <View className="bg-indigo-600/10 self-start rounded-full px-3 py-1 mb-2">
        <Text className="text-indigo-700 text-xs font-bold dark:text-indigo-300">DAY {day.dayLetter}</Text>
      </View>
      <Text className="text-slate-900 text-xl font-bold mb-1 dark:text-slate-100">{day.title}</Text>
      <Text className="text-slate-500 text-xs mb-1 capitalize">{day.muscleGroups.join(' & ')}</Text>
      <Text className="text-slate-500 text-xs mb-4">~{day.estimatedMinutes} min (estimate) · {day.exerciseIds.length} exercises</Text>

      <View className="gap-2 mb-4">
        {day.exerciseIds.map((id) => {
          const exercise = WORKOUT_EXERCISES?.[id];
          const progressLabel = getWeightProgressLabel(id, setLogs);
          return (
            <View key={id} className="flex-row items-center justify-between py-1">
              <Text className="text-slate-800 text-sm flex-1 dark:text-slate-200">{exercise?.icon} {exercise?.name || id}</Text>
              {progressLabel && <Text className="text-emerald-700 text-xs font-semibold dark:text-emerald-400">{progressLabel}</Text>}
            </View>
          );
        })}
      </View>

      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={() => router?.push?.({
            pathname: '/workout/checkin',
            params: { exerciseIds: day.exerciseIds.join(','), programId: programId || '', dayTitle: day.title },
          })}
          className="flex-1 border-2 border-stone-300 rounded-xl py-3 items-center dark:border-slate-700"
        >
          <Text className="text-slate-700 text-xs dark:text-slate-300">🩺 Body Check-in</Text>
        </Pressable>
        <Pressable onPress={() => setShowWarmup(!showWarmup)} className="flex-1 border-2 border-stone-300 rounded-xl py-3 items-center dark:border-slate-700">
          <Text className="text-slate-700 text-xs dark:text-slate-300">🔥 {showWarmup ? 'Hide Warm-Up' : 'Warm-Up'}</Text>
        </Pressable>
      </View>

      {showWarmup && (
        <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">{warmup.title} — for today's {day.muscleGroups.join(' & ')} session</Text>
          <InlineStepTimer steps={warmup.steps} />
        </View>
      )}

      {isResumable && (
        <View className="bg-indigo-400/10 border border-indigo-400 rounded-xl p-3 mb-3">
          <Text className="text-indigo-700 dark:text-indigo-300 text-xs font-medium">↩ Workout in progress — pick up right where you left off.</Text>
        </View>
      )}
      <Pressable onPress={onStart} className="bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-500">
        <Text className="text-white font-semibold">{isResumable ? `▶ Resume Day ${day.dayLetter}` : `▶ Start Day ${day.dayLetter}`}</Text>
      </Pressable>
    </View>
  );
}

// This is the Workouts tab's landing page. It opens directly on the
// day-of-week split (auto-assigning a program on first visit if none
// is active yet) rather than requiring a program pick first. Programs,
// Progress, and Recovery are all reachable from here as sub-screens;
// none of them compete for their own bottom tab slot.
export default function WorkoutsHome() {
  const router = useRouter();
  const activeProgramId = useAppStore(selectActiveProgramId);
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const fitnessCardDismissed = useAppStore(selectFitnessCardDismissed);
  const energyLevel = useAppStore(selectEnergyLevel);
  const isLowEnergyToday = energyLevel === 'low';
  const gyms = useAppStore(selectGyms);
  const activeGymId = useAppStore(selectActiveGymId);
  const weekdayAssignment = useAppStore(selectWeekdayAssignment);
  const sessionsCompletedInProgram = useAppStore((s) => s.sessionsCompletedInProgram);
  const autoAssignDefaultProgram = useAppStore((s) => s.autoAssignDefaultProgram);

  const [activeIndex, setActiveIndex] = useState(0);
  const [hasCheckedAutoAssign, setHasCheckedAutoAssign] = useState(false);
  const [inProgressDraft, setInProgressDraft] = useState<WorkoutSessionDraft | null>(null);

  // Re-checked on every focus, not just mount — tab screens in expo-router
  // stay mounted when you switch tabs, so a mount-only check would miss a
  // session that got started, finished, or abandoned while this tab
  // wasn't the active one. useFocusEffect fires both on first focus and
  // every time navigation returns here.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const repo = await getRepository();
          const draft = await repo.getWorkoutSessionDraft();
          if (!cancelled) setInProgressDraft(draft);
        } catch (error) {
          console.error('WorkoutsHome: failed to check for an in-progress workout draft', error);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<Record<number, number>>({});
  const stripOffsetY = useRef(0);

  // Runs once on mount. autoAssignDefaultProgram itself is a no-op if a
  // program is already active or was deliberately stopped and then
  // never restarted, since it only ever assigns when activeProgramId is
  // null at call time — see programSlice.ts.
  useEffect(() => {
    if (hasCheckedAutoAssign) return;
    setHasCheckedAutoAssign(true);
    autoAssignDefaultProgram(fitnessPreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProgram = PROGRAMS.find((p) => p.id === activeProgramId) || null;
  const activeGym = gyms.find((g) => g.id === activeGymId) || null;

  const weeklySplit = useMemo(
    () => (activeProgram ? buildWeeklySplit(activeProgram, fitnessPreferences, weekdayAssignment, activeGym?.equipment) : []),
    [activeProgram, fitnessPreferences, weekdayAssignment, activeGym]
  );

  // getDay() is already Sunday-indexed (0=Sun...6=Sat), matching the array directly.
  useEffect(() => {
    const todayIndex = Math.min(new Date().getDay(), Math.max(weeklySplit.length - 1, 0));
    setActiveIndex(todayIndex);
  }, [weeklySplit.length]);

  const handleEditDay = (weekdayIndex: number) => {
    router?.push?.({ pathname: '/workout/schedule-day', params: { weekdayIndex: String(weekdayIndex) } });
  };

  const handleJumpTo = (index: number) => {
    setActiveIndex(index);
    const offset = cardOffsets.current[index];
    if (offset !== undefined) {
      scrollRef.current?.scrollTo({ y: stripOffsetY.current + offset - 12, animated: true });
    }
  };

  const handleStartDay = (day: WeeklySplitDay) => {
    if (!day.exerciseIds.length) return;
    const sessionKey = buildSessionKey(activeProgram?.id, day.title, day.exerciseIds);
    const matchingDraft = inProgressDraft?.sessionKey === sessionKey ? inProgressDraft : null;
    router?.push?.({
      pathname: '/workout/day-session',
      params: {
        exerciseIds: day.exerciseIds.join(','),
        programId: activeProgram?.id || '',
        dayTitle: day.title,
        // Reuse the original start time when resuming, so the elapsed
        // timer reflects when the workout actually began rather than
        // restarting from zero.
        sessionStartedAt: matchingDraft?.sessionStartedAt || new Date().toISOString(),
        energyLightened: isLowEnergyToday ? '1' : '',
      },
    });
  };

  const handleStartSomewhere = () => {
    const picked = pickStartSomewhereExercise(fitnessPreferences);
    if (picked) {
      const sets = WORKOUT_EXERCISES?.[picked.id]?.sets || 3;
      router?.push?.({
        pathname: `/workout/session/${picked.id}`,
        params: {
          sessionStartedAt: new Date().toISOString(),
          sessionTotalSets: String(isLowEnergyToday ? Math.max(2, sets - 1) : sets),
          sessionDoneSets: '0',
          energyLightened: isLowEnergyToday ? '1' : '',
        },
      });
    }
  };

  const currentWeek = activeProgram ? getCurrentProgramWeek(activeProgram, sessionsCompletedInProgram) : 0;
  const sessionsThisWeek = activeProgram ? getSessionsThisWeek(activeProgram, sessionsCompletedInProgram) : 0;

  return (
    <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Workout</Heading>
        <Text className="text-slate-500 text-sm mb-4">Do as much or as little as feels right today.</Text>

        {!fitnessCardDismissed && <PersonalizeFitnessCard />}

        {isLowEnergyToday && (
          <View className="bg-amber-400/10 border border-amber-400 rounded-xl p-3 mb-3">
            <Text className="text-amber-700 text-xs dark:text-amber-400">🔋 Energy is low today — sessions are lightened up automatically (one fewer set each). Change it anytime from Home.</Text>
          </View>
        )}

        <Pressable onPress={handleStartSomewhere} className="bg-indigo-600 rounded-2xl py-4 mb-3 items-center active:bg-indigo-500">
          <Text className="text-white font-semibold text-base">Don't overthink it — Start Somewhere</Text>
        </Pressable>

        <View className="flex-row gap-2 mb-4">
          <Pressable onPress={() => router?.push?.('/fitness/programs')} className="flex-1 bg-white rounded-xl py-3 items-center dark:bg-slate-900">
            <Text className="text-slate-700 text-sm dark:text-slate-300">🏋️ Programs</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/fitness/recovery')} className="flex-1 bg-white rounded-xl py-3 items-center dark:bg-slate-900">
            <Text className="text-slate-700 text-sm dark:text-slate-300">🧘 Recovery</Text>
          </Pressable>
          <Pressable onPress={() => router?.push?.('/fitness/progress')} className="flex-1 bg-white rounded-xl py-3 items-center dark:bg-slate-900">
            <Text className="text-slate-700 text-sm dark:text-slate-300">📈 Progress</Text>
          </Pressable>
        </View>

        {activeProgram && weeklySplit.length > 0 && (
          <View onLayout={(e) => { stripOffsetY.current = e.nativeEvent.layout.y; }}>
            <Subheading className="mb-2">{activeProgram.emoji} {activeProgram.title}</Subheading>
            <Text className="text-slate-500 text-xs mb-3">
              Week {currentWeek} of {activeProgram.durationWeeks} · {sessionsThisWeek} of {activeProgram.daysPerWeek} sessions this week
            </Text>

            <DayStrip
              days={weeklySplit}
              activeIndex={activeIndex}
              onJumpTo={handleJumpTo}
              onEditDay={handleEditDay}
            />

            {weeklySplit.map((day, index) => (
              <DayCard
                key={day.weekdayLabel}
                day={day}
                onStart={() => handleStartDay(day)}
                onLayout={(y) => { cardOffsets.current[index] = y; }}
                programId={activeProgram?.id}
                isResumable={!!inProgressDraft && inProgressDraft.sessionKey === buildSessionKey(activeProgram?.id, day.title, day.exerciseIds)}
              />
            ))}
          </View>
        )}

        <Pressable onPress={() => router?.push?.('/fitness/exercises')} className="py-3 items-center">
          <Text className="text-indigo-600 text-sm font-medium">Browse all exercises by muscle group →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
