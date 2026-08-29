import { WORKOUT_EXERCISES, isCompoundExercise, isBodyweightOnlyExercise, type Exercise } from './exercises';

/**
 * The 6-12-25 method (popularized by Charles Poliquin): three exercises
 * for the same muscle group, performed back-to-back, at three different
 * rep targets — 6 reps heavy, 12 reps moderate, 25 reps light. The goal
 * is to stack mechanical tension (the heavy 6), volume (the moderate
 * 12), and metabolic stress (the high-rep 25) into one sequence, rather
 * than training only one of those stimuli per session.
 *
 * This is a distinct, self-contained mode from the regular weekly split
 * or program flow — it deliberately doesn't touch workoutSlice.ts or
 * the shared session runners (WorkoutDaySession.tsx / WorkoutSession.tsx),
 * which derive every exercise's set count and rep target from that
 * exercise's own fixed defaults in WORKOUT_EXERCISES. The 6-12-25
 * method needs three different, context-specific rep targets applied
 * to three exercises that otherwise carry their own normal defaults, so
 * it's handled as its own runner instead of bending shared code that
 * every other workout flow in the app also depends on.
 */

export type SixTwelveTwentyFiveGroup =
  | 'glutes' | 'hamstrings' | 'quads' | 'back' | 'chest'
  | 'shoulders' | 'arms' | 'core' | 'calves' | 'fullbody';

export const SIX_TWELVE_TWENTYFIVE_GROUPS: { id: SixTwelveTwentyFiveGroup; label: string; icon: string }[] = [
  { id: 'chest', label: 'Chest', icon: '💪' },
  { id: 'back', label: 'Back', icon: '🔙' },
  { id: 'shoulders', label: 'Shoulders', icon: '🏋️' },
  { id: 'arms', label: 'Arms', icon: '💪' },
  { id: 'glutes', label: 'Glutes', icon: '🍑' },
  { id: 'quads', label: 'Quads', icon: '🦵' },
  { id: 'hamstrings', label: 'Hamstrings', icon: '🦵' },
  { id: 'calves', label: 'Calves', icon: '🦵' },
  { id: 'core', label: 'Core', icon: '🎯' },
  { id: 'fullbody', label: 'Full Body', icon: '🔥' },
];

export interface SixTwelveTwentyFiveSlot {
  role: 'heavy' | 'moderate' | 'light';
  targetReps: number;
  exerciseId: string;
}

/**
 * Picks 3 exercises for the chosen muscle group: a compound movement
 * for the heavy 6, a second (ideally different) movement for the
 * moderate 12, and a lighter/isolation movement for the high-rep 25 —
 * matching the "start with a compound, reduce load, increase reps"
 * structure described in the method. Falls back gracefully whenever the
 * gym-equipment-filtered pool for a group is smaller than 3, rather
 * than returning fewer than 3 slots or crashing — reusing an exercise
 * for a second slot only when the pool is genuinely too small to avoid
 * it, same "fall back rather than fail" approach buildWeeklySplit.ts
 * already uses elsewhere in this app.
 */
export function pickSixTwelveTwentyFiveTemplate(
  group: SixTwelveTwentyFiveGroup,
  equipment?: string[] | null
): SixTwelveTwentyFiveSlot[] {
  const entries = Object.entries(WORKOUT_EXERCISES || {}).filter(([, ex]) => ex.group === group);
  if (!entries.length) return [];

  const matchesEquipment = ([, ex]: [string, Exercise]) =>
    !equipment?.length || (ex.eq || []).some((e) => equipment.includes(e));

  let pool = entries.filter(matchesEquipment);
  if (!pool.length) pool = entries; // equipment filter too narrow for this group — fall back to the full group pool rather than an empty template

  const compounds = pool.filter(([id]) => isCompoundExercise(id));
  const isolations = pool.filter(([id]) => !isCompoundExercise(id));

  // Heavy slot: prefer a compound movement that isn't bodyweight-only
  // (loadable, so "heavy" is meaningful), falling back to any compound,
  // then to whatever's in the pool at all.
  const heavyCandidates = compounds.filter(([, ex]) => !isBodyweightOnlyExercise(ex));
  const heavy = (heavyCandidates[0] || compounds[0] || pool[0])?.[0];

  // Moderate slot: a different compound if one exists, otherwise the
  // next distinct exercise in the pool.
  const moderateCandidates = compounds.filter(([id]) => id !== heavy);
  const moderate = (moderateCandidates[0] || pool.find(([id]) => id !== heavy) || pool[0])?.[0];

  // Light/high-rep slot: prefer a genuine isolation movement distinct
  // from the first two, falling back to any remaining distinct
  // exercise, then to reusing the heavy slot's exercise as a last
  // resort so a template is always returned when the group has at
  // least one exercise.
  const usedSoFar = new Set([heavy, moderate].filter(Boolean));
  const lightCandidates = isolations.filter(([id]) => !usedSoFar.has(id));
  const anyRemaining = pool.filter(([id]) => !usedSoFar.has(id));
  const light = (lightCandidates[0] || anyRemaining[0] || pool[0])?.[0];

  const slots: SixTwelveTwentyFiveSlot[] = [];
  if (heavy) slots.push({ role: 'heavy', targetReps: 6, exerciseId: heavy });
  if (moderate) slots.push({ role: 'moderate', targetReps: 12, exerciseId: moderate });
  if (light) slots.push({ role: 'light', targetReps: 25, exerciseId: light });
  return slots;
}

export const SIX_TWELVE_TWENTYFIVE_ROLE_LABELS: Record<SixTwelveTwentyFiveSlot['role'], string> = {
  heavy: '6 Reps Heavy',
  moderate: '12 Reps Moderate',
  light: '25 Reps Light',
};

export const SIX_TWELVE_TWENTYFIVE_ROLE_HINTS: Record<SixTwelveTwentyFiveSlot['role'], string> = {
  heavy: '~80–85% effort · 1–3 reps left in the tank',
  moderate: 'Enough weight to challenge you · 1–2 reps left in the tank',
  light: 'Lighter weight · chase the burn',
};
