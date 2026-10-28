import type { ActivityLevel, SessionTimeBudget, WeightGoalDirection } from '@/store/slices/nutritionFitnessSlice';
import { expandLegacyGroups } from './bodyGroups';
import { parseTimeBasedSeconds } from './exercises';

/**
 * Reps, rest and sets are worked out from everything the person has told the
 * app, never from one setting alone:
 *
 *  - exercise goals (build muscle, get stronger, lose fat, glutes, cardio,
 *    flexibility, general health), blended by weight, not first-one-wins
 *  - weight direction (lose, maintain, gain), as one input among the others
 *  - activity level (newer or less active people stay in a moderate range)
 *  - session length (short sessions trim rest, long ones add a little)
 *  - focus areas (a little extra volume for the muscles they care about)
 *
 * The exercise's own nature still matters: the blend is applied as a shift on
 * top of each exercise's own baseline, so a heavy squat and a cable curl end up
 * in different ranges even for the same person, and both move with the goals.
 * With nothing set, every exercise keeps its own baseline untouched.
 */

export interface TrainingInputs {
  weightGoalDirections?: WeightGoalDirection[] | null;
  exerciseGoals?: string[] | null;
  activityLevel?: ActivityLevel | null;
  sessionTimeBudget?: SessionTimeBudget | null;
  focusAreas?: string[] | null;
}

/** What a person's inputs add up to, before it is applied to any particular exercise. */
export interface TrainingProfile {
  /** Added to an exercise's own rep midpoint. Negative is heavier and lower reps. */
  repShift: number;
  /** Added to rest (seconds) before the exercise-type scaling. */
  restShift: number;
  /** Extra set on compound lifts. */
  compoundSetBonus: number;
  /** Extra set on exercises for the person's focus areas. */
  focusSetBonus: number;
  /** Focus areas, already expanded to current group ids. */
  focusGroups: string[];
  /** Shown in the UI so the connection between your answers and the numbers is never hidden. */
  rationale: string;
}

interface GoalTarget {
  label: string;
  weight: number;
  /** Rep midpoint this goal favors for a typical lift. */
  reps: number;
  /** Rest in seconds this goal favors. */
  rest: number;
  /** Counts toward the "strength or size" share that decides the compound set bonus. */
  buildsMuscle: boolean;
}

// Neutral point the shifts are measured from: a typical 8-12 rep set with about 75 seconds of rest.
const NEUTRAL_REPS = 10;
const NEUTRAL_REST = 75;

const GOAL_TARGETS: Record<string, GoalTarget> = {
  get_stronger: { label: 'get stronger', weight: 3, reps: 5, rest: 150, buildsMuscle: true },
  build_muscle: { label: 'build muscle', weight: 3, reps: 10, rest: 90, buildsMuscle: true },
  glutes_curves: { label: 'glutes and curves', weight: 2, reps: 12, rest: 75, buildsMuscle: true },
  lose: { label: 'lose weight', weight: 2, reps: 13, rest: 50, buildsMuscle: false },
  gain: { label: 'gain weight', weight: 2, reps: 9, rest: 100, buildsMuscle: true },
  cardio: { label: 'cardio fitness', weight: 1.5, reps: 15, rest: 40, buildsMuscle: false },
  flexibility: { label: 'flexibility', weight: 1, reps: 12, rest: 45, buildsMuscle: false },
  general_health: { label: 'general health', weight: 1, reps: 11, rest: 75, buildsMuscle: false },
};

/** Weight direction: lose wins over gain if someone picked both, same rule the nutrition side uses. */
export function resolveEffectiveWeightGoal(directions: WeightGoalDirection[] | null | undefined): 'lose' | 'gain' | 'maintain' {
  if (!directions?.length) return 'maintain';
  if (directions.includes('lose')) return 'lose';
  if (directions.includes('gain')) return 'gain';
  return 'maintain';
}

/** How far to pull toward a moderate 8 to 15 rep range for people newer to lifting. */
function moderationFor(level: ActivityLevel | null | undefined): number {
  if (level === 'mostly_sitting') return 0.5;
  if (level === 'somewhat_active') return 0.25;
  return 0;
}

function restShiftForSession(time: SessionTimeBudget | null | undefined): number {
  return time === 'short' ? -15 : time === 'long' ? 15 : 0;
}

/**
 * Blends every active goal into one profile. Returns null when nothing the
 * person said changes anything, so a person with no answers sees no change.
 */
export function getTrainingScheme(inputs: TrainingInputs | null | undefined): TrainingProfile | null {
  const goalIds = new Set<string>();
  for (const g of inputs?.exerciseGoals || []) {
    if (g === 'lose_fat') goalIds.add('lose');
    else if (GOAL_TARGETS[g]) goalIds.add(g);
  }
  const direction = resolveEffectiveWeightGoal(inputs?.weightGoalDirections);
  if (direction === 'lose') goalIds.add('lose'); // same goal as "Lose Fat", counted once
  if (direction === 'gain') goalIds.add('gain');

  const active = Array.from(goalIds).map((id) => GOAL_TARGETS[id]!).filter(Boolean);
  const totalWeight = active.reduce((sum, g) => sum + g.weight, 0);

  const blendedReps = totalWeight > 0 ? active.reduce((s, g) => s + g.weight * g.reps, 0) / totalWeight : NEUTRAL_REPS;
  const blendedRest = totalWeight > 0 ? active.reduce((s, g) => s + g.weight * g.rest, 0) / totalWeight : NEUTRAL_REST;

  // Newer or less active people are pulled toward a moderate range, so a strength goal does not mean heavy triples on day one.
  const moderation = moderationFor(inputs?.activityLevel);
  const moderatedReps = blendedReps + moderation * (11 - blendedReps);

  const repShift = totalWeight > 0 ? Math.round((moderatedReps - NEUTRAL_REPS) * 10) / 10 : 0;
  const restShift = (totalWeight > 0 ? Math.round(blendedRest - NEUTRAL_REST) : 0) + restShiftForSession(inputs?.sessionTimeBudget);

  const buildShare = totalWeight > 0 ? active.filter((g) => g.buildsMuscle).reduce((s, g) => s + g.weight, 0) / totalWeight : 0;
  const experienced = inputs?.activityLevel !== 'mostly_sitting';
  const compoundSetBonus = buildShare >= 0.5 && experienced ? 1 : 0;

  const focusGroups = expandLegacyGroups(inputs?.focusAreas || []);
  const focusSetBonus = focusGroups.length > 0 ? 1 : 0;

  if (repShift === 0 && restShift === 0 && compoundSetBonus === 0 && focusSetBonus === 0) return null;

  const parts: string[] = [];
  if (active.length > 0) {
    const labels = active.map((g) => g.label);
    const list = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0];
    const lean = repShift <= -2 ? 'heavier weights and fewer reps' : repShift >= 2 ? 'lighter weights and more reps' : 'a moderate rep range';
    parts.push(`Your goals (${list}) point to ${lean} on this kind of exercise.`);
  }
  if (moderation > 0) parts.push('Your activity level keeps the range moderate while you build up.');
  if (inputs?.sessionTimeBudget === 'short') parts.push('Short sessions trim the rest between sets.');
  if (inputs?.sessionTimeBudget === 'long') parts.push('Long sessions allow a little more rest.');
  if (compoundSetBonus > 0) parts.push('Big multi-joint lifts get an extra set.');
  if (focusSetBonus > 0) parts.push('Your focus areas get an extra set.');

  return { repShift, restShift, compoundSetBonus, focusSetBonus, focusGroups, rationale: parts.join(' ') };
}

type Adjustable = {
  reps: string; repsMin: number; rest: number; sets?: number; compound?: boolean; kind?: string; group?: string;
};

// Only these kinds are plain rep work. Holds, light rehab, jumps, Olympic lifts and cardio keep their own numbers.
const REP_KINDS: ReadonlySet<string> = new Set(['loaded_comp', 'loaded_iso', 'bw_comp', 'bw_iso']);

/** How much of the rest shift each kind takes: heavy compound lifts need it, small isolation work much less. */
const REST_SCALE: Record<string, number> = { loaded_comp: 1, loaded_iso: 0.5, bw_comp: 0.5, bw_iso: 0.5 };

/** Lowest sensible rep midpoint per kind, so a goal can never ask for heavy singles on an isolation move. */
const MIN_CENTER: Record<string, number> = { loaded_comp: 4, loaded_iso: 6, bw_comp: 6, bw_iso: 8 };
const MAX_CENTER = 25;

function parseRepRange(reps: string, fallbackLow: number): { low: number; high: number } | null {
  const range = reps.match(/^\s*(\d+)\s*-\s*(\d+)/);
  if (range) return { low: parseInt(range[1]!, 10), high: parseInt(range[2]!, 10) };
  const single = reps.match(/^\s*(\d+)\b/);
  if (single) {
    const n = parseInt(single[1]!, 10);
    return { low: n, high: n };
  }
  return Number.isFinite(fallbackLow) && fallbackLow > 0 ? { low: fallbackLow, high: fallbackLow } : null;
}

/**
 * Applies the person's blended profile on top of one exercise's own baseline.
 * Never touches exercises with no real rep range (timed holds, light rehab
 * work, jumps, Olympic lifts, cardio), and keeps "each side" wording.
 */
export function getEffectiveExercise<T extends Adjustable>(exercise: T, inputs: TrainingInputs | null | undefined): T {
  const profile = getTrainingScheme(inputs);
  if (!profile) return exercise;
  if (!exercise.kind || !REP_KINDS.has(exercise.kind)) return exercise;
  if (parseTimeBasedSeconds(exercise.reps) !== null) return exercise;

  const baseline = parseRepRange(exercise.reps, exercise.repsMin);
  if (!baseline) return exercise;

  const kind = exercise.kind;
  let reps = exercise.reps;
  let low = exercise.repsMin;
  if (profile.repShift !== 0) {
    const baseCenter = (baseline.low + baseline.high) / 2;
    const center = Math.min(MAX_CENTER, Math.max(MIN_CENTER[kind] ?? 6, baseCenter + profile.repShift));
    low = Math.max((MIN_CENTER[kind] ?? 6) - 1, Math.round(center * 0.8));
    const high = Math.max(low + 2, Math.round(center * 1.2));
    const sideSuffix = exercise.reps.match(/\s+each(?:\s+side)?\s*$/i)?.[0] || '';
    reps = `${low}-${high}${sideSuffix}`;
  }

  const restScale = REST_SCALE[kind] ?? 0.5;
  const rest = profile.restShift !== 0
    ? Math.min(180, Math.max(30, Math.round((exercise.rest + profile.restShift * restScale) / 5) * 5))
    : exercise.rest;

  let sets = typeof exercise.sets === 'number' ? exercise.sets : undefined;
  if (sets !== undefined) {
    if (exercise.compound && profile.compoundSetBonus > 0) sets += profile.compoundSetBonus;
    const inFocus = !!exercise.group && profile.focusGroups.includes(exercise.group);
    if (inFocus && profile.focusSetBonus > 0) sets += profile.focusSetBonus;
    sets = Math.min(5, sets);
  }

  return {
    ...exercise,
    reps,
    repsMin: low,
    rest,
    ...(sets !== undefined ? { sets } : {}),
  };
}
