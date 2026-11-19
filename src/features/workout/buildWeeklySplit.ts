import { WORKOUT_EXERCISES, isCompoundExercise } from '@/content/exercises';
import { bodyGroupLabel, expandLegacyGroups, getBodyGroup } from '@/content/bodyGroups';
import type { ProgramDefinition } from '@/content/programs';
import type { FitnessPreferences, SessionTimeBudget } from '@/store/slices/nutritionFitnessSlice';
import { interleaveByGroup } from './interleaveExercises';
import { targetsGroup, UNRESTRICTED, filterAutoPickEntries, isAutoSelectable, rankForPlanning, type EquipmentContext } from './exerciseAvailability';

// Full calendar week, Sunday first. The 6 lettered training days
// (A–F) land on Monday–Saturday; Sunday is always a rest day with no
// scheduled workout, matching a standard 6-day split.
export const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
export const DAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export interface WeeklySplitDay {
  dayLetter: string | null; // null on the rest day
  weekdayLabel: string;
  title: string;
  muscleGroups: string[];
  exerciseIds: string[];
  estimatedMinutes: number;
  isRestDay: boolean;
}

export interface DayLetterContent {
  exerciseIds: string[];
  muscleGroups: string[];
  title: string;
  estimatedMinutes: number;
}

/**
 * Computes what each lettered day (A, B, C...) actually contains —
 * independent of which weekday it's assigned to. Shared by
 * buildWeeklySplit (which places these onto the calendar) and the
 * schedule picker (which needs to show every option's real content,
 * not just its letter, so a person can choose based on what a day
 * actually is rather than guessing from "Day C").
 */
/**
 * Scales a program's baseline exercise count by the person's stated
 * session-length preference. This is a standing structural adjustment —
 * it changes what's actually in Day A/B/etc, not just what happens when
 * today's session starts (that's energy-based trimming, handled
 * separately at session start, since it's transient and shouldn't
 * rewrite the fixed weekly split for everyone's next visit to Day A).
 * Clamped to a sane range so "short" can never hit zero exercises and
 * "long" can't run away into an unreasonably long single session.
 */
export function getEffectiveSessionExerciseCount(baseCount: number, timeBudget?: SessionTimeBudget | null): number {
  const delta = timeBudget === 'short' ? -1 : timeBudget === 'long' ? 1 : 0;
  return Math.max(2, Math.min(8, baseCount + delta));
}

/**
 * A small, seedable PRNG (mulberry32-style) — not for security, just
 * for a shuffle that's reproducible for a given seed (so re-rendering
 * the same session doesn't re-shuffle under someone's feet) but varies
 * naturally by date.
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let s = seed || 1;
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const a = result[i];
    const b = result[j];
    if (a === undefined || b === undefined) continue;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

function sameCombo(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

/**
 * Picks a fresh set of exercises for a day's muscle groups every time
 * it's started, instead of the same static list every time — no
 * combination should ever repeat if the pool has enough exercises to
 * avoid it. Rotates through the *entire* eligible pool for these
 * muscle groups (not just whatever was originally chunked into this
 * day letter), seeded by the current date so it's stable for the
 * whole day but different the next time this day comes around, and
 * explicitly excludes whatever's in recentCombos (the last few times
 * this exact day was actually started).
 *
 * If the eligible pool is too small to avoid every recent combo (a
 * narrow equipment/focus-area filter can do this), this falls back to
 * the least-recently-used arrangement rather than failing or looping
 * forever — some repetition on a genuinely tiny pool is unavoidable,
 * but it's still never the literal same list as last time when any
 * alternative exists.
 */
export function getVariedExerciseSelection(
  muscleGroups: string[],
  count: number,
  equipment: EquipmentContext,
  recentCombos: string[][],
  seed: number,
  priorityGroups?: string[] | null
): string[] {
  const entries = Object.entries(WORKOUT_EXERCISES || {});
  const matchesGroup = ([, ex]: [string, any]) => muscleGroups.includes(ex.group);

  // No fallback to "show everything": if the equipment rules out the whole
  // pool, the caller gets an empty list and shows an honest empty state.
  const pool = filterAutoPickEntries(entries.filter(matchesGroup), equipment);
  if (!pool.length) return [];

  if (pool.length <= count) return pool.map(([id]) => id); // whole pool needed just to hit the count — nothing to rotate

  // Group by muscle group and shuffle each group independently so a flat
  // shuffle never concentrates all picks into whichever group happens to
  // have the largest catalog (e.g. 4 chest + 1 triceps on a Full Body day).
  const byGroup = new Map<string, string[]>();
  for (const [id, ex] of pool) {
    const list = byGroup.get(ex.group) || [];
    list.push(id);
    byGroup.set(ex.group, list);
  }
  const priority = new Set(expandLegacyGroups(priorityGroups));
  const allGroupKeys = Array.from(byGroup.keys());
  const priorityKeys = seededShuffle(allGroupKeys.filter((g) => priority.has(g)), seed);
  const otherKeys = seededShuffle(allGroupKeys.filter((g) => !priority.has(g)), seed + 97);
  const groupKeys = [...priorityKeys, ...otherKeys];

  // Build candidate lists by rotating each group's shuffled pool by `offset`
  // and round-robining 1 exercise per group until `count` is reached.
  const shuffledGroups = groupKeys.map((g, idx) => seededShuffle(byGroup.get(g) || [], seed + idx + 1));
  const maxOffset = Math.max(1, ...shuffledGroups.map((g) => g.length));

  for (let offset = 0; offset < maxOffset; offset++) {
    const candidate: string[] = [];
    let round = 0;
    while (candidate.length < count) {
      let addedThisRound = false;
      for (const groupIds of shuffledGroups) {
        if (candidate.length >= count) break;
        if (round < groupIds.length) {
          const picked = groupIds[(round + offset) % groupIds.length];
          if (picked && !candidate.includes(picked)) {
            candidate.push(picked);
            addedThisRound = true;
          }
        }
      }
      if (!addedThisRound) break;
      round++;
    }
    const isRepeat = recentCombos.some((combo) => sameCombo(combo, candidate));
    if (!isRepeat) return candidate;
  }

  // Fallback: offset 0 round-robin
  const fallback: string[] = [];
  let round = 0;
  while (fallback.length < count) {
    let added = false;
    for (const groupIds of shuffledGroups) {
      if (fallback.length >= count) break;
      const picked = groupIds[round];
      if (picked && !fallback.includes(picked)) {
        fallback.push(picked);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return fallback;
}

/**
 * Orders a session's exercises the way a trainer actually would,
 * rather than leaving them in whatever order variety/energy selection
 * happened to produce. Two real, independently-converged principles
 * from exercise science drive this (multiple sources agree,
 * see isCompoundExercise's own doc comment for the classification
 * itself):
 *
 * 1. If a muscle group needs extra attention, train it first — force
 *    output and neural drive are highest at the start of a session, so
 *    that's when priority work benefits most from full effort. This
 *    reuses `priorityGroups` (the person's existing `focusAreas`
 *    preference, already used by interleaveByGroup to weight which
 *    exercises get selected in the first place) rather than
 *    introducing a second, separately-configured priority concept —
 *    "which muscles I want extra attention on" is one setting, not two.
 * 2. Within whatever isn't priority-ordered, compound (multi-joint)
 *    movements go before isolation (single-joint) work — compound
 *    lifts demand more coordination and neural drive, which are both
 *    highest early in a session; isolation work is comparatively
 *    forgiving of some accumulated fatigue.
 *
 * Stable within each group (doesn't reshuffle exercises that are
 * already in the same priority/compound-vs-isolation bucket), so this
 * only reorders when it actually changes something meaningful, not on
 * every call.
 */
export function orderExercisesLikeATrainer(exerciseIds: string[], priorityGroups?: string[] | null): string[] {
  const priority = new Set(expandLegacyGroups(priorityGroups));

  const rank = (id: string): number => {
    const exercise = WORKOUT_EXERCISES?.[id];
    const isPriority = !!exercise && priority.has(exercise.group);
    const isCompound = isCompoundExercise(id);
    if (isPriority && isCompound) return 0;
    if (isPriority) return 1;
    if (isCompound) return 2;
    return 3;
  };

  // A stable sort (Array.prototype.sort is guaranteed stable in every
  // JS engine this app targets) — exercises within the same rank keep
  // their existing relative order rather than getting shuffled again.
  return [...exerciseIds].sort((a, b) => rank(a) - rank(b));
}

export function buildDayLetterContent(
  program: ProgramDefinition,
  preferences: FitnessPreferences | null,
  equipment: EquipmentContext = UNRESTRICTED
): Map<string, DayLetterContent> {
  const entries = Object.entries(WORKOUT_EXERCISES || {});

  const matchesGroup = ([, ex]: [string, any]) =>
    targetsGroup(program.targetGroups, ex.group);

  // Only exercises doable with the active equipment. No fallbacks: an empty
  // result means an empty plan, which the UI explains.
  let filtered = rankForPlanning(filterAutoPickEntries(entries.filter(matchesGroup), equipment));

  // Exercises are listed in the content file one muscle group at a
  // time (all glutes, then all hamstrings, etc). Without this, a
  // program targeting more than one group gets its early days
  // entirely filled from whichever group happens to come first in the
  // file, before the chunking below ever reaches the other group.
  // Passing focusAreas here also biases the mix toward what the person
  // said they actually care about, without dropping the program's other
  // groups to zero.
  filtered = interleaveByGroup(filtered, preferences?.focusAreas);

  const perDay = Math.max(1, getEffectiveSessionExerciseCount(program.sessionExerciseCount || 5, preferences?.sessionTimeBudget));
  const trainingDayCount = Math.min(DAY_LETTERS.length, Math.max(1, Math.ceil(filtered.length / perDay)));

  const lettersToContent = new Map<string, DayLetterContent>();
  for (let i = 0; i < trainingDayCount; i++) {
    const chunk = filtered.slice(i * perDay, i * perDay + perDay);
    if (!chunk.length) break;
    const groupCounts = new Map<string, number>();
    for (const [, ex] of chunk) groupCounts.set(ex.group, (groupCounts.get(ex.group) || 0) + 1);
    const muscleGroups = Array.from(groupCounts.keys());
    const dayLetter = DAY_LETTERS[i];
    if (!dayLetter) continue;
    lettersToContent.set(dayLetter, {
      exerciseIds: chunk.map(([id]) => id),
      muscleGroups,
      title: `${dayTitleForGroups(muscleGroups)} ${dayLetter}`,
      estimatedMinutes: chunk.length * 10,
    });
  }
  return lettersToContent;
}

/**
 * Splits the program's matched exercise pool into up to 6 fixed days
 * (Day A–F), one per weekday Mon–Sat. Unlike the multi-week rotation
 * used elsewhere in Programs, this is a fixed weekly split — Day A is
 * always the same exercises until the person edits it, matching a
 * traditional gym split structure (Lower Body A, Upper Body A, etc).
 */
export function buildWeeklySplit(
  program: ProgramDefinition,
  preferences: FitnessPreferences | null,
  customAssignment?: (string | null)[],
  equipment: EquipmentContext = UNRESTRICTED
): WeeklySplitDay[] {
  const lettersToContent = buildDayLetterContent(program, preferences, equipment);
  const trainingDayCount = lettersToContent.size;

  // Default assignment: Sunday rest, Monday–Saturday get A–F in order.
  const defaultAssignment: (string | null)[] = [null, ...DAY_LETTERS.slice(0, trainingDayCount)];
  while (defaultAssignment.length < 7) defaultAssignment.push(null);
  const assignment = customAssignment && customAssignment.length === 7 ? customAssignment : defaultAssignment;

  const days: WeeklySplitDay[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const letter = assignment[weekday];
    const weekdayLabel = WEEKDAY_LABELS[weekday] || '';
    if (!letter || !lettersToContent.has(letter)) {
      days.push({
        dayLetter: null,
        weekdayLabel,
        title: 'Rest Day',
        muscleGroups: [],
        exerciseIds: [],
        estimatedMinutes: 0,
        isRestDay: true,
      });
    } else {
      const content = lettersToContent.get(letter)!;
      days.push({
        dayLetter: letter,
        weekdayLabel,
        title: content.title,
        muscleGroups: content.muscleGroups,
        exerciseIds: content.exerciseIds,
        estimatedMinutes: content.estimatedMinutes,
        isRestDay: false,
      });
    }
  }

  return days;
}

/**
 * Adjusts *today's* actual exercise list based on a same-day energy
 * check-in — separate from getEffectiveSessionExerciseCount above,
 * which changes the standing plan itself. This only affects what's
 * pulled up when a session is started right now; the underlying Day
 * A/B/etc content in the weekly split is never rewritten by it, so a
 * low-energy day doesn't permanently shrink what Day A means going
 * forward. Never trims below 2 exercises, and only adds a bonus
 * exercise on a high-energy day if a distinct one from the same muscle
 * groups actually exists to add.
 */
export function getEnergyAdjustedExerciseIds(
  exerciseIds: string[],
  muscleGroups: string[],
  energyLevel: 'low' | 'medium' | 'high' | undefined,
  equipment: EquipmentContext = UNRESTRICTED
): string[] {
  if (energyLevel === 'low') {
    if (exerciseIds.length <= 2) return exerciseIds;
    return exerciseIds.slice(0, -1);
  }
  if (energyLevel === 'high') {
    const bonus = Object.entries(WORKOUT_EXERCISES || {})
      // Bug fix: (ex as any).group papered over what should just be a
      // normal typed property access — WORKOUT_EXERCISES is already
      // Record<string, Exercise>, so ex.group is already properly
      // typed with no cast needed. Left as any, a typo like ex.grop
      // would have silently compiled and returned undefined forever
      // instead of being caught here.
      .find(([id, ex]) => muscleGroups.includes(ex.group) && !exerciseIds.includes(id) && isAutoSelectable(id, ex, equipment));
    return bonus ? [...exerciseIds, bonus[0]] : exerciseIds;
  }
  return exerciseIds;
}

export function getAvailableDayLetters(
  program: ProgramDefinition,
  preferences?: FitnessPreferences | null,
  equipment: EquipmentContext = UNRESTRICTED
): string[] {
  const entries = Object.entries(WORKOUT_EXERCISES || {});
  const matchesGroup = ([, ex]: [string, any]) =>
    targetsGroup(program.targetGroups, ex.group);
  const filtered = filterAutoPickEntries(entries.filter(matchesGroup), equipment);
  const perDay = Math.max(1, getEffectiveSessionExerciseCount(program.sessionExerciseCount || 5, preferences?.sessionTimeBudget));
  const trainingDayCount = Math.min(DAY_LETTERS.length, Math.ceil(filtered.length / perDay));
  return DAY_LETTERS.slice(0, trainingDayCount);
}

/**
 * One group keeps its own name; two groups name both; same-region groups
 * read as Upper/Lower Body (plus "& Core" when paired only with core);
 * only days that actually span upper + lower (or full-body lifts) read as Full Body.
 */
function dayTitleForGroups(groups: string[]): string {
  if (groups.length === 1 && groups[0]) return bodyGroupLabel(groups[0]);
  const regions = new Set(groups.map((g) => getBodyGroup(g)?.region || 'full'));
  if (regions.size === 1) {
    const only = Array.from(regions)[0];
    if (only === 'upper') return 'Upper Body';
    if (only === 'lower') return 'Lower Body';
    if (only === 'core') return 'Core';
  }
  const nonCore = Array.from(regions).filter((r) => r !== 'core');
  if (nonCore.length === 1 && regions.has('core')) {
    if (nonCore[0] === 'upper') return 'Upper Body & Core';
    if (nonCore[0] === 'lower') return 'Lower Body & Core';
  }
  if (groups.length === 2 && groups[0] && groups[1]) {
    return `${bodyGroupLabel(groups[0])} & ${bodyGroupLabel(groups[1])}`;
  }
  return 'Full Body';
}
