import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore, selectAdhdFocusModeEnabled, selectSetLogs, selectRecentWarmupHistory } from '@/store/index';
import type { SetLogEntry } from '@/store/slices/workoutSlice';
import { WORKOUT_EXERCISES, isBodyweightOnlyExercise, parseTimeBasedSeconds, type Exercise } from '@/content/exercises';
import { suggestNextSet } from './weightProgress';
import { toLocalDateString } from '@/shared/formatDate';
import { getWarmupForGroups, warmupCategoryForGroups } from '@/content/warmupContent';
import InlineStepTimer from '@/shared/components/InlineStepTimer';
import InlineSetTimer from '@/shared/components/InlineSetTimer';
import { Heading } from '@/shared/components/Heading';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { WorkoutSessionDraft, WorkoutSessionSetRow } from '@/store/slices/workoutSlice';

type SetRow = WorkoutSessionSetRow;

/**
 * Identifies which in-progress session a saved draft belongs to. Built
 * from program + day title only — day titles are already unique per
 * program (e.g. "Quads B" only ever refers to one lettered day), so
 * that alone is a stable, sufficient identity. This deliberately does
 * NOT include the actual exercise list: which exercises are in a
 * session can now vary intentionally (see getVariedExerciseSelection)
 * and gets adjusted further by today's energy level, so two calls for
 * the "same" day can legitimately have different exercise lists —
 * keying on them would make WorkoutsHome's structural lookup and this
 * component's own lookup disagree on whether a draft matches, exactly
 * the kind of mismatch that made "Resume Day X" silently fail to
 * detect an in-progress session.
 */
export function buildSessionKey(programId: string | undefined, dayTitle: string | undefined, _exerciseIds?: string[]): string {
  return `${programId || ''}|${dayTitle || ''}`;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Builds `count` sets worth of rows — for a unilateral exercise,
 * that's `count` Right/Left pairs, not `count` generic rows.
 *
 * Every row's reps prefill from the suggestion (the double-progression
 * target — see suggestNextSet), and the FIRST set's weight also
 * prefills from the suggestion — later sets are deliberately left
 * blank rather than all prefilled identically, since real training
 * routinely uses the same weight for every set within a session but
 * that's a decision the person should confirm per set, not have
 * silently assumed for sets they haven't done yet.
 */
function buildSetRows(count: number, exercise: Exercise, exerciseId: string, setLogs: SetLogEntry[], isUnilateral: boolean): SetRow[] {
  const suggestion = suggestNextSet(exerciseId, exercise.reps, exercise.repsMin, exercise.inc, setLogs);
  const suggestedReps = suggestion.reps || String(exercise.repsMin || 10);
  if (!isUnilateral) {
    return Array.from({ length: count }, (_, i) => ({ weight: i === 0 ? suggestion.weight : '', reps: suggestedReps, done: false }));
  }
  const rows: SetRow[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({ weight: i === 0 ? suggestion.weight : '', reps: suggestedReps, done: false, side: 'right' });
    rows.push({ weight: i === 0 ? suggestion.weight : '', reps: suggestedReps, done: false, side: 'left' });
  }
  return rows;
}

function searchExercises(query: string, excludeIds: string[]): { id: string; name: string; muscle: string; icon: string }[] {
  const q = query.trim().toLowerCase();
  const excluded = new Set(excludeIds);
  return Object.entries(WORKOUT_EXERCISES || {})
    .filter(([id, ex]) => !excluded.has(id) && (!q || ex.name.toLowerCase().includes(q) || ex.muscle.toLowerCase().includes(q)))
    .slice(0, 20)
    .map(([id, ex]) => ({ id, name: ex.name, muscle: ex.muscle, icon: ex.icon }));
}

/**
 * Shows every exercise for the day at once — expandable cards, each
 * with its own set rows — rather than a strict one-exercise-at-a-time
 * wizard. Sets can be added or removed per exercise for this session
 * only; it never changes the exercise's default set count going
 * forward, just what you're doing today.
 */
export default function WorkoutDaySession({
  exerciseIds, programId, dayTitle, sessionStartedAt, reducedGroups, energyLightened,
}: {
  exerciseIds: string[]; programId?: string; dayTitle?: string;
  sessionStartedAt?: string; reducedGroups?: string[]; energyLightened?: boolean;
}) {
  const router = useRouter();
  const logSet = useAppStore((s) => s.logSet);
  const recordProgramSession = useAppStore((s) => s.recordProgramSession);
  const adhdFocusModeEnabled = useAppStore(selectAdhdFocusModeEnabled);
  const setAdhdFocusMode = useAppStore((s) => s.setAdhdFocusMode);
  const setLogs = useAppStore(selectSetLogs);

  const [sessionExerciseIds, setSessionExerciseIds] = useState<string[]>(exerciseIds);
  const [expandedId, setExpandedId] = useState<string | null>(exerciseIds[0] || null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordBanner, setRecordBanner] = useState<string | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [sessionRecorded, setSessionRecorded] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [showWarmup, setShowWarmup] = useState(false);

  // Derived from the session's own exercises rather than passed in as a
  // prop — WorkoutDaySession only ever receives exerciseIds/programId/
  // dayTitle via route params, not the day's structural muscleGroups.
  // Same warm-up content this used to show on the pre-workout setup
  // screen (getWarmupForGroups, same collapsible format) — just
  // relocated to live inside the actual workout day instead.
  const sessionMuscleGroups = useMemo(
    () => Array.from(new Set(sessionExerciseIds.map((id) => WORKOUT_EXERCISES?.[id]?.group).filter((g): g is string => !!g))),
    [sessionExerciseIds]
  );
  const recentWarmupHistory = useAppStore(selectRecentWarmupHistory);
  const recordUsedWarmupCombo = useAppStore((s) => s.recordUsedWarmupCombo);
  const warmupCategory = useMemo(() => warmupCategoryForGroups(sessionMuscleGroups), [sessionMuscleGroups]);
  const warmup = useMemo(() => {
    // Same seeding approach as exercise variety (WorkoutsHome.tsx) —
    // today's date as YYYYMMDD, stable through re-renders today,
    // different the next time this screen is opened.
    const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    return getWarmupForGroups(sessionMuscleGroups, 5, recentWarmupHistory[warmupCategory] || [], seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentWarmupHistory intentionally excluded: it's read once to pick today's varied warm-up, not something a re-render should re-roll against its own just-recorded entry
  }, [sessionMuscleGroups, warmupCategory]);

  // Records which specific moves were actually shown, once per mount
  // (not on every render) — this is what getVariedWarmupSelection
  // checks next time to avoid repeating the identical combo. Recording
  // on mount (not on "did they actually do it") matches how exercise
  // variety already records at session start rather than completion —
  // simpler, and avoids the warm-up ever being repeated purely because
  // someone opened the session without finishing the warm-up card.
  useEffect(() => {
    if (warmup.steps.length) recordUsedWarmupCombo(warmupCategory, warmup.steps.map((s) => s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only on mount, not every time `warmup` is recomputed
  }, []);

  // The session's real start time — normally seeded from the
  // sessionStartedAt route param, but overwritten with the original
  // draft's timestamp if an in-progress session is restored below, so the
  // elapsed timer reflects when the workout actually began, not when this
  // screen happened to remount.
  const [startedAtMs, setStartedAtMs] = useState<number>(() => (sessionStartedAt ? new Date(sessionStartedAt).getTime() : Date.now()));

  const sessionKey = useMemo(() => buildSessionKey(programId, dayTitle), [programId, dayTitle]);
  const [isDraftChecked, setIsDraftChecked] = useState(false);
  const persistDraft = useRef(createWriteGuard(async (draft: WorkoutSessionDraft | null) => {
    const repo = await getRepository();
    await repo.saveWorkoutSessionDraft(draft);
  })).current;

  // Per-exercise set rows, seeded from each exercise's default set
  // count and (if flagged) lightened by one — but freely add/remove
  // from there for just this session.
  const [rowsByExercise, setRowsByExercise] = useState<Record<string, SetRow[]>>(() => {
    const initial: Record<string, SetRow[]> = {};
    for (const id of exerciseIds) {
      const exercise = WORKOUT_EXERCISES?.[id];
      if (!exercise) continue;
      const isReduced = energyLightened || (reducedGroups?.length && reducedGroups.includes(exercise.group));
      const setCount = isReduced ? Math.max(2, exercise.sets - 1) : exercise.sets;
      initial[id] = buildSetRows(setCount, exercise, id, setLogs, !!exercise.uni);
    }
    return initial;
  });

  // Restore an in-progress session, if one exists for this exact day.
  // Runs once on mount, before the autosave effect below is allowed to
  // write anything — otherwise a fresh, empty default state would
  // overwrite the very draft this is trying to recover.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const repo = await getRepository();
        const draft = await repo.getWorkoutSessionDraft();
        if (cancelled) return;
        if (draft && draft.sessionKey === sessionKey) {
          // Same staleness rule as WorkoutsHome.tsx's own draft check —
          // this is a second, independent loading path (someone can
          // land directly on this screen via a deep link or the
          // browser's back button without passing through that
          // screen's check first), so it needs the same protection
          // rather than assuming the other check already covered it.
          const isStale = toLocalDateString(new Date(draft.updatedAt)) !== toLocalDateString(new Date());
          if (isStale) {
            await repo.saveWorkoutSessionDraft(null);
          } else {
            if (draft.sessionExerciseIds?.length) setSessionExerciseIds(draft.sessionExerciseIds);
            if (draft.rowsByExercise) setRowsByExercise(draft.rowsByExercise);
            if (draft.sessionStartedAt) setStartedAtMs(new Date(draft.sessionStartedAt).getTime());
          }
        }
      } catch (error) {
        console.error('WorkoutDaySession: failed to restore in-progress session draft', error);
      } finally {
        if (!cancelled) setIsDraftChecked(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosaves the entire in-progress session on every change — typed
  // weight/reps, checked-off sets, added/removed/swapped exercises — so
  // exiting to the phone Home Screen (which can kill the app process
  // outright, not just background it) never loses anything beyond what
  // was true a moment before. Gated on isDraftChecked so this can't fire
  // with fresh default state before the restore check above has run.
  useEffect(() => {
    if (!isDraftChecked) return;
    persistDraft({
      sessionKey,
      sessionStartedAt: new Date(startedAtMs).toISOString(),
      programId,
      dayTitle,
      sessionExerciseIds,
      rowsByExercise,
      updatedAt: new Date().toISOString(),
    });
  }, [isDraftChecked, sessionKey, startedAtMs, programId, dayTitle, sessionExerciseIds, rowsByExercise, persistDraft]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAtMs) / 1000))), 1000);
    return () => clearInterval(interval);
  }, [startedAtMs]);

  const [confirmingTimerReset, setConfirmingTimerReset] = useState(false);
  const handleResetTimer = () => {
    // startedAtMs is the single source of truth the elapsed-timer
    // effect above already derives from — resetting it to now is all
    // that's needed, no separate elapsedSeconds state to touch.
    setStartedAtMs(Date.now());
    setConfirmingTimerReset(false);
  };

  const totalSets = useMemo(() => Object.values(rowsByExercise).reduce((sum, rows) => sum + rows.length, 0), [rowsByExercise]);
  const doneSets = useMemo(() => Object.values(rowsByExercise).reduce((sum, rows) => sum + rows.filter((r) => r.done).length, 0), [rowsByExercise]);
  const allDone = totalSets > 0 && doneSets === totalSets;

  const handleAddSet = (exerciseId: string) => {
    const exercise = WORKOUT_EXERCISES?.[exerciseId];
    const reps = String(exercise?.repsMin || 10);
    setRowsByExercise((prev) => {
      const newRows = exercise?.uni
        ? [{ weight: '', reps, done: false, side: 'right' as const }, { weight: '', reps, done: false, side: 'left' as const }]
        : [{ weight: '', reps, done: false }];
      return { ...prev, [exerciseId]: [...(prev[exerciseId] || []), ...newRows] };
    });
  };

  const handleRemoveSet = (exerciseId: string) => {
    const exercise = WORKOUT_EXERCISES?.[exerciseId];
    const removeCount = exercise?.uni ? 2 : 1;
    setRowsByExercise((prev) => {
      const rows = prev[exerciseId] || [];
      if (rows.length <= removeCount) return prev; // never go below one set (one pair, for unilateral) for an exercise still in the session
      return { ...prev, [exerciseId]: rows.slice(0, -removeCount) };
    });
  };

  // Adds a whole new exercise to just this session — never touches the
  // program itself, so tomorrow's version of this day is unaffected.
  const handleAddExercise = (exerciseId: string) => {
    const exercise = WORKOUT_EXERCISES?.[exerciseId];
    if (!exercise || sessionExerciseIds.includes(exerciseId)) return;
    setSessionExerciseIds((prev) => [...prev, exerciseId]);
    setRowsByExercise((prev) => ({
      ...prev,
      [exerciseId]: buildSetRows(exercise.sets, exercise, exerciseId, setLogs, !!exercise.uni),
    }));
    setExpandedId(exerciseId);
    setShowAddExercise(false);
    setExerciseSearch('');
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSessionExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
    setRowsByExercise((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    if (expandedId === exerciseId) setExpandedId(null);
  };

  const handleMoveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    setSessionExerciseIds((prev) => {
      const index = prev.indexOf(exerciseId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev; // already at an end — nothing to do
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex]!;
      next[targetIndex] = temp!;
      return next;
    });
  };

  const exerciseSearchResults = useMemo(
    () => searchExercises(exerciseSearch, sessionExerciseIds),
    [exerciseSearch, sessionExerciseIds]
  );

  const updateRow = (exerciseId: string, index: number, updates: Partial<SetRow>) => {
    setRowsByExercise((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] || []).map((row, i) => (i === index ? { ...row, ...updates } : row)),
    }));
  };

  const handleCompleteSet = async (exerciseId: string, index: number) => {
    const row = rowsByExercise[exerciseId]?.[index];
    if (!row) return;
    if (row.done) {
      // Tapping an already-checked set un-checks it — this needs to be a
      // real toggle, not a one-way door, same as handleToggleExerciseDone
      // below already treats a fully-done exercise. Doesn't retract the
      // logged set from history (there's no undo-log mechanism yet, and
      // handleToggleExerciseDone's own "uncheck all" path has the same
      // gap) — just corrects what's shown as complete right now.
      updateRow(exerciseId, index, { done: false });
      return;
    }
    // `Number(x) || 0` only catches 0/NaN/empty — a genuinely negative
    // typed value like -20 is truthy and passed straight through,
    // corrupting PR/volume stats downstream. 0 needs to stay valid
    // (a real, common case for bodyweight exercises), so this can't
    // just check truthiness; it specifically clamps negative values
    // to 0 while still allowing a legitimate 0 through untouched.
    const safeWeight = Math.max(0, Number(row.weight) || 0);
    // A completed timed set writes reps as "Ns" (e.g. "45s") — see
    // InlineSetTimer's onComplete wiring above. Number("45s") is NaN,
    // which would silently zero out the actual held duration instead
    // of logging it, so the trailing "s" is stripped before parsing.
    // Downstream PR-tracking (logSet) then treats "seconds held"
    // exactly like reps — both are a plain "more is better" number,
    // so no other change was needed there.
    const safeReps = Math.max(0, Number(String(row.reps).replace(/s$/i, '')) || 0);
    const { isNewRecord } = await logSet(exerciseId, safeWeight, safeReps);
    updateRow(exerciseId, index, { done: true });
    if (isNewRecord) {
      setRecordBanner(`🏆 New personal record — ${WORKOUT_EXERCISES?.[exerciseId]?.name || 'nice lift'}`);
      setTimeout(() => setRecordBanner(null), 3000);
    }
  };

  // The one-tap way to mark a whole exercise done at once, rather than
  // requiring every set to be checked off individually. Still logs
  // each set (so PRs and volume tracking stay accurate) — just does it
  // for all of them in one action. Tapping again when already fully
  // done un-checks everything, so it's a real toggle, not a one-way door.
  const handleToggleExerciseDone = async (exerciseId: string) => {
    const rows = rowsByExercise[exerciseId] || [];
    const allDone = rows.length > 0 && rows.every((r) => r.done);
    if (allDone) {
      setRowsByExercise((prev) => ({
        ...prev,
        [exerciseId]: (prev[exerciseId] || []).map((row) => ({ ...row, done: false })),
      }));
      return;
    }
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]?.done) await handleCompleteSet(exerciseId, i);
    }
  };

  // Replaces one exercise with another, in place — keeps the same slot
  // in the list and carries the set count forward rather than
  // resetting to the new exercise's default, so swapping mid-session
  // (equipment taken, an injury flare-up) doesn't lose what was
  // already planned for that slot.
  const handleSwapExercise = (oldExerciseId: string, newExerciseId: string) => {
    const oldExercise = WORKOUT_EXERCISES?.[oldExerciseId];
    const newExercise = WORKOUT_EXERCISES?.[newExerciseId];
    if (!newExercise || sessionExerciseIds.includes(newExerciseId)) return;
    const oldRowCount = rowsByExercise[oldExerciseId]?.length || newExercise.sets;
    // A "set" is one row normally, but one Right+Left pair for a
    // unilateral exercise — divide back down to the actual set count
    // before rebuilding for the new exercise, so swapping a unilateral
    // exercise for a bilateral one (or vice versa) still carries over
    // the intended number of sets, not the raw row count.
    const existingSetCount = oldExercise?.uni ? Math.max(1, Math.round(oldRowCount / 2)) : oldRowCount;

    setSessionExerciseIds((prev) => prev.map((id) => (id === oldExerciseId ? newExerciseId : id)));
    setRowsByExercise((prev) => {
      const next = { ...prev };
      delete next[oldExerciseId];
      next[newExerciseId] = buildSetRows(existingSetCount, newExercise, newExerciseId, setLogs, !!newExercise.uni);
      return next;
    });
    if (expandedId === oldExerciseId) setExpandedId(newExerciseId);
    setSwappingId(null);
    setExerciseSearch('');
  };

  const handleFinish = async () => {
    if (programId && !sessionRecorded) {
      setSessionRecorded(true);
      await recordProgramSession();
    }
    // Routed through the same write-guarded persistDraft (not a direct
    // repo call) so this clear can never be overtaken by an autosave that
    // was still in flight from a change made a moment before Finish was tapped.
    await persistDraft(null);
    router?.replace?.('/(tabs)/workout');
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="w-full max-w-md self-center px-5 pt-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <Pressable onPress={() => router?.back?.()} className="flex-row items-center mb-2 self-start py-1 -ml-1 pr-2">
          <Text className="text-slate-500 text-sm">‹ Back</Text>
        </Pressable>
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-2">
            <Text className="text-slate-900 dark:text-slate-100 text-base font-bold">{dayTitle || "Today's workout"}</Text>
            <Text className="text-slate-500 text-xs mt-0.5">{sessionExerciseIds.length} exercise{sessionExerciseIds.length === 1 ? '' : 's'}</Text>
          </View>
          <View className="items-end">
            {confirmingTimerReset ? (
              <View className="flex-row items-center gap-2">
                <Pressable onPress={handleResetTimer} hitSlop={6}>
                  <Text className="text-red-500 text-xs font-semibold">Reset?</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmingTimerReset(false)} hitSlop={6}>
                  <Text className="text-slate-400 text-xs">Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmingTimerReset(true)} hitSlop={6}>
                <Text className="text-emerald-600 dark:text-emerald-400 text-xl font-bold">{formatElapsed(elapsedSeconds)}</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-2 mt-2">
          <View className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%` }} />
          </View>
          <Text className="text-slate-500 text-xs font-medium">{doneSets}/{totalSets} sets</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="w-full max-w-md self-center">
          {recordBanner && (
            <View className="bg-amber-400/10 border border-amber-400 rounded-xl p-3 mb-4">
              <Text className="text-amber-600 dark:text-amber-400 text-center text-sm font-medium">{recordBanner}</Text>
            </View>
          )}

          <Pressable onPress={() => setShowWarmup(!showWarmup)} className="border-2 border-stone-300 dark:border-slate-700 rounded-xl py-3 items-center mb-3">
            <Text className="text-slate-700 text-xs dark:text-slate-300">🔥 {showWarmup ? 'Hide Warm-Up' : 'Warm-Up'}</Text>
          </Pressable>
          {showWarmup && (
            <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">{warmup.title} — for today's {sessionMuscleGroups.join(' & ')} session</Text>
              <InlineStepTimer steps={warmup.steps} />
            </View>
          )}

          {sessionExerciseIds.map((exerciseId, exerciseIndex) => {
            const exercise = WORKOUT_EXERCISES?.[exerciseId];
            if (!exercise) return null;
            const hidesWeightInput = isBodyweightOnlyExercise(exercise);
            const timeTargetSeconds = parseTimeBasedSeconds(exercise.reps);
            const rows = rowsByExercise[exerciseId] || [];
            const exerciseDone = rows.length > 0 && rows.every((r) => r.done);
            const isExpanded = expandedId === exerciseId;
            const isReducedThisExercise = !!(energyLightened || (reducedGroups?.length && reducedGroups.includes(exercise.group)));

            return (
              <View key={exerciseId} className="bg-white dark:bg-slate-900 rounded-2xl mb-3 overflow-hidden">
                <Pressable onPress={() => setExpandedId(isExpanded ? null : exerciseId)} className="p-4 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1 pr-2">
                    <Pressable
                      onPress={() => handleToggleExerciseDone(exerciseId)}
                      hitSlop={8}
                      className={exerciseDone ? 'w-6 h-6 rounded-full bg-emerald-500 items-center justify-center' : 'w-6 h-6 rounded-full border-2 border-stone-300 dark:border-slate-700 items-center justify-center'}
                    >
                      {exerciseDone && <Text className="text-white text-xs">✓</Text>}
                    </Pressable>
                    <View className="flex-1">
                      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{exercise.icon} {exercise.name}</Text>
                      <Text className="text-slate-500 text-xs">
                        {exercise.muscle} · {exercise.uni ? Math.round(rows.length / 2) : rows.length} set{(exercise.uni ? Math.round(rows.length / 2) : rows.length) === 1 ? '' : 's'}{exercise.uni ? ' · each side' : ''}{isReducedThisExercise ? ' · lightened' : ''}
                      </Text>
                      {(() => {
                        // Recomputed from setLogs (past sessions), not
                        // the live row state — this should keep
                        // showing why the prefill happened even as the
                        // person edits today's numbers, not disappear
                        // or change as soon as they type.
                        const suggestion = suggestNextSet(exerciseId, exercise.reps, exercise.repsMin, exercise.inc, setLogs);
                        if (suggestion.reason === 'increase') {
                          return <Text className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-0.5">↑ Try {suggestion.weight} — you hit the top of your range last time</Text>;
                        }
                        if (suggestion.reason === 'repeat') {
                          return <Text className="text-slate-400 text-[11px] mt-0.5">Beat {suggestion.reps} reps to earn a weight increase next time</Text>;
                        }
                        return null;
                      })()}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleMoveExercise(exerciseId, 'up')}
                    disabled={exerciseIndex === 0}
                    hitSlop={6}
                    className="px-1"
                    accessibilityLabel={`Move ${exercise.name} up`}
                    accessibilityRole="button"
                  >
                    <Text className={exerciseIndex === 0 ? 'text-slate-200 dark:text-slate-700 text-xs' : 'text-slate-400 text-xs'}>▲</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleMoveExercise(exerciseId, 'down')}
                    disabled={exerciseIndex === sessionExerciseIds.length - 1}
                    hitSlop={6}
                    className="px-1"
                    accessibilityLabel={`Move ${exercise.name} down`}
                    accessibilityRole="button"
                  >
                    <Text className={exerciseIndex === sessionExerciseIds.length - 1 ? 'text-slate-200 dark:text-slate-700 text-xs' : 'text-slate-400 text-xs'}>▼</Text>
                  </Pressable>
                  <Pressable onPress={() => { setSwappingId(exerciseId); setShowAddExercise(false); setExerciseSearch(''); }} className="px-2">
                    <Text className="text-slate-400 text-xs">🔄</Text>
                  </Pressable>
                  <Pressable onPress={() => handleRemoveExercise(exerciseId)} className="px-2">
                    <Text className="text-slate-400 text-xs">✕</Text>
                  </Pressable>
                  <Text className="text-slate-400 text-xs">{isExpanded ? '▲' : '▼'}</Text>
                </Pressable>

                {swappingId === exerciseId && (
                  <View className="px-4 pb-4">
                    <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2">Swap for…</Text>
                    <TextInput
                      value={exerciseSearch}
                      onChangeText={setExerciseSearch}
                      placeholder="Search by name or muscle…"
                      placeholderTextColor="#64748b"
                      autoFocus
                      className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2"
                    />
                    <ScrollView style={{ maxHeight: 256 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {exerciseSearchResults.map((ex) => (
                        <Pressable key={ex.id} onPress={() => handleSwapExercise(exerciseId, ex.id)} className="py-2 border-b border-stone-100 dark:border-slate-800 flex-row items-center gap-2">
                          <Text className="text-base">{ex.icon}</Text>
                          <View>
                            <Text className="text-slate-800 dark:text-slate-200 text-sm">{ex.name}</Text>
                            <Text className="text-slate-500 text-xs">{ex.muscle}</Text>
                          </View>
                        </Pressable>
                      ))}
                      {exerciseSearchResults.length === 0 && (
                        <Text className="text-slate-500 text-xs py-2">No matches.</Text>
                      )}
                    </ScrollView>
                    <Pressable onPress={() => { setSwappingId(null); setExerciseSearch(''); }} className="py-2 mt-1">
                      <Text className="text-slate-500 text-center text-xs">Cancel</Text>
                    </Pressable>
                  </View>
                )}

                {isExpanded && swappingId !== exerciseId && (
                  <View className="px-4 pb-4">
                    {!adhdFocusModeEnabled && <Text className="text-slate-500 text-xs mb-3">{exercise.cues}</Text>}

                    <View className="flex-row items-center px-1 mb-1">
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide w-10">Set</Text>
                      {!hidesWeightInput && <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide flex-1 text-center">Weight</Text>}
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide flex-1 text-center">{timeTargetSeconds !== null ? 'Time' : 'Reps'}</Text>
                      <View className="w-8" />
                    </View>

                    {rows.map((row, index) => {
                      const setNumber = row.side ? Math.floor(index / 2) + 1 : index + 1;
                      const sideLabel = row.side === 'right' ? 'R' : row.side === 'left' ? 'L' : null;
                      return (
                      <View key={index} className="flex-row items-center gap-1.5 mb-2">
                        <Text className="text-slate-500 text-xs w-10 text-center">{setNumber}{sideLabel ? ` ${sideLabel}` : ''}</Text>
                        {!hidesWeightInput && (
                          <View className="flex-1">
                            <TextInput
                              value={row.weight}
                              onChangeText={(v) => updateRow(exerciseId, index, { weight: v })}
                              placeholder="0"
                              placeholderTextColor="#64748b"
                              keyboardType="numeric"
                              editable={!row.done}
                              className={row.done ? 'w-full bg-stone-100 dark:bg-slate-800 text-slate-400 text-center rounded-lg py-2' : 'w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center rounded-lg py-2'}
                            />
                          </View>
                        )}
                        <View className="flex-1">
                          {timeTargetSeconds !== null ? (
                            row.done ? (
                              <View className="w-full bg-stone-100 dark:bg-slate-800 rounded-lg py-2 items-center">
                                <Text className="text-slate-400 text-sm">{row.reps || `${timeTargetSeconds}s`}</Text>
                              </View>
                            ) : (
                              <InlineSetTimer
                                targetSeconds={timeTargetSeconds}
                                onComplete={(heldSeconds) => updateRow(exerciseId, index, { reps: `${heldSeconds}s` })}
                              />
                            )
                          ) : (
                            <TextInput
                              value={row.reps}
                              onChangeText={(v) => updateRow(exerciseId, index, { reps: v })}
                              keyboardType="numeric"
                              editable={!row.done}
                              className={row.done ? 'w-full bg-stone-100 dark:bg-slate-800 text-slate-400 text-center rounded-lg py-2' : 'w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center rounded-lg py-2'}
                            />
                          )}
                        </View>
                        <Pressable onPress={() => handleCompleteSet(exerciseId, index)} className="w-8 items-center">
                          <View className={row.done ? 'w-7 h-7 rounded-full bg-emerald-500 items-center justify-center' : 'w-7 h-7 rounded-full border-2 border-emerald-500 items-center justify-center'}>
                            {row.done && <Text className="text-white text-xs">✓</Text>}
                          </View>
                        </Pressable>
                      </View>
                      );
                    })}

                    <View className="flex-row gap-2 mt-2">
                      <Pressable onPress={() => handleAddSet(exerciseId)} className="flex-1 border border-dashed border-stone-300 dark:border-slate-700 rounded-lg py-2 items-center">
                        <Text className="text-slate-500 text-xs">+ Add set{exercise.uni ? ' (R+L)' : ''}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemoveSet(exerciseId)}
                        disabled={rows.length <= (exercise.uni ? 2 : 1)}
                        className={rows.length <= (exercise.uni ? 2 : 1) ? 'flex-1 border border-stone-200 dark:border-slate-800 rounded-lg py-2 items-center opacity-40' : 'flex-1 border border-dashed border-stone-300 dark:border-slate-700 rounded-lg py-2 items-center'}
                      >
                        <Text className="text-slate-500 text-xs">− Remove set{exercise.uni ? ' (R+L)' : ''}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {showAddExercise ? (
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4">
              <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-3">Add an exercise</Text>
              <TextInput
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                placeholder="Search by name or muscle…"
                placeholderTextColor="#64748b"
                autoFocus
                className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2"
              />
              {/* A plain View with only a max-height class doesn't clip
                  or scroll overflow content on its own — once results
                  exceed 256px, they spilled out past this box and sat
                  on top of "Cancel", "Simplify (hide cues)", and
                  "Finish workout" below it instead of being contained.
                  A real ScrollView with nestedScrollEnabled actually
                  bounds and scrolls the list. */}
              <ScrollView style={{ maxHeight: 256 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {exerciseSearchResults.map((ex) => (
                  <Pressable key={ex.id} onPress={() => handleAddExercise(ex.id)} className="py-2 border-b border-stone-100 dark:border-slate-800 flex-row items-center gap-2">
                    <Text className="text-base">{ex.icon}</Text>
                    <View>
                      <Text className="text-slate-800 dark:text-slate-200 text-sm">{ex.name}</Text>
                      <Text className="text-slate-500 text-xs">{ex.muscle}</Text>
                    </View>
                  </Pressable>
                ))}
                {exerciseSearchResults.length === 0 && (
                  <Text className="text-slate-500 text-xs py-2">No matches.</Text>
                )}
              </ScrollView>
              <Pressable onPress={() => { setShowAddExercise(false); setExerciseSearch(''); }} className="py-2 mt-1">
                <Text className="text-slate-500 text-center text-xs">Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowAddExercise(true)} className="border-2 border-dashed border-stone-300 dark:border-slate-700 rounded-2xl py-3 items-center mb-4">
              <Text className="text-slate-500 text-sm">+ Add an exercise</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => setAdhdFocusMode(!adhdFocusModeEnabled)}
            className="py-2 mb-4"
          >
            <Text className="text-slate-600 text-center text-xs">{adhdFocusModeEnabled ? 'Show exercise cues' : 'Simplify (hide cues)'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowFinishConfirm(true)}
            className={allDone ? 'bg-emerald-500 rounded-2xl py-4 items-center active:bg-emerald-400' : 'bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-500'}
          >
            <Text className="text-white font-semibold text-base">{allDone ? 'Finish workout ✓' : 'Finish workout'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {showFinishConfirm && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center px-6">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm">
            <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-2">
              {allDone ? 'You showed up. That counts.' : 'Finish early?'}
            </Text>
            <Text className="text-slate-500 text-sm leading-5 mb-5">
              {formatElapsed(elapsedSeconds)} · {doneSets}/{totalSets} sets logged
              {!allDone ? ' — anything not marked done just won\'t count toward this session.' : ''}
            </Text>
            <View className="flex-row gap-3">
              <Pressable onPress={() => setShowFinishConfirm(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl py-3 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Keep going</Text>
              </Pressable>
              <Pressable onPress={handleFinish} className="flex-1 bg-emerald-500 rounded-xl py-3 items-center">
                <Text className="text-white text-sm font-semibold">Done ✓</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
