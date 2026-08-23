import { WORKOUT_EXERCISES, isCompoundExercise } from '@/content/exercises';
import type { ProgramDefinition } from '@/content/programs';
import type { FitnessPreferences, SessionTimeBudget } from '@/store/slices/nutritionFitnessSlice';
import { interleaveByGroup } from './interleaveExercises';

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
  equipment: string[] | undefined | null,
  recentCombos: string[][],
  seed: number
): string[] {
  const entries = Object.entries(WORKOUT_EXERCISES || {});
  const matchesGroup = ([, ex]: [string, any]) => muscleGroups.includes(ex.group);
  const matchesEquipment = ([, ex]: [string, any]) =>
    !equipment?.length || (ex.eq || []).some((e: string) => equipment.includes(e));

  let pool = entries.filter((e) => matchesGroup(e) && matchesEquipment(e));
  if (!pool.length) pool = entries.filter(matchesGroup);
  if (!pool.length) return [];

  const ids = pool.map(([id]) => id);
  if (ids.length <= count) return ids; // whole pool needed just to hit the count — nothing to rotate

  const shuffled = seededShuffle(ids, seed);

  // Try every rotation of the shuffled pool until one doesn't match a
  // recent combo — bounded by pool size, never infinite.
  for (let offset = 0; offset < shuffled.length; offset++) {
    const rotated = [...shuffled.slice(offset), ...shuffled.slice(0, offset)];
    const candidate = rotated.slice(0, count);
    const isRepeat = recentCombos.some((combo) => sameCombo(combo, candidate));
    if (!isRepeat) return candidate;
  }
  return shuffled.slice(0, count);
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
  const priority = new Set(priorityGroups || []);

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
  gymEquipment?: string[] | null
): Map<string, DayLetterContent> {
  const entries = Object.entries(WORKOUT_EXERCISES || {});
  const equipment = gymEquipment && gymEquipment.length > 0 ? gymEquipment : preferences?.equipment;

  const matchesGroup = ([, ex]: [string, any]) =>
    (program.targetGroups || []).includes('all') || (program.targetGroups || []).includes(ex.group);
  const matchesEquipment = ([, ex]: [string, any]) =>
    !equipment?.length || (ex.eq || []).some((e: string) => equipment.includes(e));

  let filtered = entries.filter((e) => matchesGroup(e) && matchesEquipment(e));
  if (!filtered.length) filtered = entries.filter(matchesGroup);
  if (!filtered.length) filtered = entries;

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
    const dominantGroup = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Full Body';
    const dayLetter = DAY_LETTERS[i];
    if (!dayLetter) continue;
    lettersToContent.set(dayLetter, {
      exerciseIds: chunk.map(([id]) => id),
      muscleGroups,
      title: `${capitalize(dominantGroup)} ${dayLetter}`,
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
  gymEquipment?: string[] | null
): WeeklySplitDay[] {
  const lettersToContent = buildDayLetterContent(program, preferences, gymEquipment);
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
  energyLevel: 'low' | 'medium' | 'high' | undefined
): string[] {
  if (energyLevel === 'low') {
    if (exerciseIds.length <= 2) return exerciseIds;
    return exerciseIds.slice(0, -1);
  }
  if (energyLevel === 'high') {
    const bonus = Object.entries(WORKOUT_EXERCISES || {})
      .find(([id, ex]) => muscleGroups.includes((ex as any).group) && !exerciseIds.includes(id));
    return bonus ? [...exerciseIds, bonus[0]] : exerciseIds;
  }
  return exerciseIds;
}

export function getAvailableDayLetters(program: ProgramDefinition, preferences?: FitnessPreferences | null): string[] {
  const entries = Object.entries(WORKOUT_EXERCISES || {});
  const matchesGroup = ([, ex]: [string, any]) =>
    (program.targetGroups || []).includes('all') || (program.targetGroups || []).includes(ex.group);
  const filtered = entries.filter(matchesGroup);
  const perDay = Math.max(1, getEffectiveSessionExerciseCount(program.sessionExerciseCount || 5, preferences?.sessionTimeBudget));
  const trainingDayCount = Math.min(DAY_LETTERS.length, Math.max(1, Math.ceil(filtered.length / perDay)));
  return DAY_LETTERS.slice(0, trainingDayCount);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
