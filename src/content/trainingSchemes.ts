import type { WeightGoalDirection } from '@/store/slices/nutritionFitnessSlice';
import { parseTimeBasedSeconds } from './exercises';

export interface TrainingScheme {
  /** Overrides the exercise's own default rep range entirely. */
  reps: string;
  repsMin: number;
  /** Rest in seconds between sets. */
  restSeconds: number;
  /** Shown in the UI so the "why" is never hidden — every scheme change is explained, not just applied silently. */
  rationale: string;
}

/**
 * Real, distinct rep/rest schemes per stated weight goal — not a small
 * nudge on top of each exercise's own baseline, but three genuinely
 * different training approaches, since exercise science treats these
 * as different goals requiring different programming, not the same
 * program lightly adjusted:
 *
 * - Losing weight: higher reps (12-20) at shorter rest (30-45s)
 *   maximizes time under tension and metabolic/cardiovascular demand
 *   per session — more calories burned per set, more density, without
 *   needing maximal loads that are harder to recover from in a likely
 *   caloric deficit.
 * - Gaining weight/muscle: moderate reps (6-10) at longer rest
 *   (90-120s) prioritizes mechanical tension — heavier relative loads
 *   with full recovery between sets, the combination hypertrophy and
 *   strength research consistently favors for building size/strength,
 *   which a caloric surplus is specifically there to support.
 * - Maintain / no stated direction: each exercise's own existing
 *   baseline (repsMin/reps/rest already defined in exercises.ts) is
 *   left completely untouched — this is the only path that behaves
 *   exactly as the app always has, so someone with no stated goal (or
 *   who picked "maintain") sees zero change.
 */
export const TRAINING_SCHEMES: Record<'lose' | 'gain' | 'maintain', TrainingScheme | null> = {
  lose: {
    reps: '12-20',
    repsMin: 12,
    restSeconds: 40,
    rationale: 'Higher reps, shorter rest — this raises the metabolic demand of each set, which fits a goal to lose weight better than heavy, low-rep work.',
  },
  gain: {
    reps: '6-10',
    repsMin: 6,
    restSeconds: 105,
    rationale: 'Moderate reps, full rest — this prioritizes mechanical tension and lets you lift heavier relative to your max, which is what building size and strength actually requires.',
  },
  // null is deliberate, not an oversight — see the doc comment above.
  // A null scheme means "use this exercise's own defined baseline,"
  // signaled explicitly rather than an empty/guessed object.
  maintain: null,
};

/**
 * Resolves a person's weightGoalDirections array (which can technically
 * hold both 'lose' and 'gain' at once, however unlikely) to one
 * effective goal. Same resolution rule already used on the nutrition
 * side (estimateNutritionTargets.ts) for the exact same array, so a
 * person who picked both sees one consistent "current real intent"
 * across both workout and nutrition — not two different guesses.
 */
export function resolveEffectiveWeightGoal(directions: WeightGoalDirection[] | undefined): 'lose' | 'gain' | 'maintain' {
  if (!directions?.length) return 'maintain';
  if (directions.includes('lose')) return 'lose';
  if (directions.includes('gain')) return 'gain';
  return 'maintain';
}

export function getTrainingScheme(directions: WeightGoalDirection[] | undefined): TrainingScheme | null {
  return TRAINING_SCHEMES[resolveEffectiveWeightGoal(directions)];
}

/**
 * Applies the person's goal-based training scheme on top of one
 * exercise's own defined baseline — sets/rest/inc(rement) stay exactly
 * as defined (a scheme changes rep range and rest, not how many sets
 * or how much weight to add on a PR), reps/repsMin get overridden by
 * the scheme when one applies. A 'maintain' goal (or no goal stated)
 * returns the exercise completely unchanged, matching how this app has
 * always behaved for someone without a stated direction.
 *
 * Deliberately does NOT touch exercises with no real rep range to
 * override — a fixed time-based hold (Plank, "45 sec") isn't a rep
 * scheme's business, since "12-20 reps" makes no sense applied to a
 * hold duration. Reuses the exact same parseTimeBasedSeconds check
 * WorkoutDaySession.tsx already uses to decide "is this a timer, not a
 * rep count" — same signal, not a second, differently-matching
 * reimplementation of it.
 */
export function getEffectiveExercise<T extends { reps: string; repsMin: number; rest: number }>(
  exercise: T,
  directions: WeightGoalDirection[] | undefined
): T {
  const scheme = getTrainingScheme(directions);
  if (!scheme) return exercise;
  const isTimeBased = parseTimeBasedSeconds(exercise.reps) !== null;
  if (isTimeBased) return exercise;
  return { ...exercise, reps: scheme.reps, repsMin: scheme.repsMin, rest: scheme.restSeconds };
}
