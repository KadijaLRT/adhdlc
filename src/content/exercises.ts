import { getBodyGroup } from './bodyGroups';
import { EXERCISE_CATALOG, type CatalogRow, type ExerciseKind } from './exerciseCatalog';

export interface Exercise {
  name: string; muscle: string; group: string; icon: string; tag: string;
  rest: number; inc: number; sets: number; reps: string; repsMin: number;
  uni?: boolean; eq: string[]; cues: string; points: string[];
  /**
   * Exact equipment needed, as OR-of-AND over ids in equipment.ts: the exercise
   * can be done when ANY inner list is fully owned. `[[]]` means no equipment.
   * This is the only thing the gym filter reads.
   */
  requires: string[][];
  /** Movement type, used to decide what the app may pick for someone and how to rank it. */
  kind: ExerciseKind;
  /** Multi-joint movement; ordered before isolation work in a session. */
  compound: boolean;
  /** Technical or specialist lifts. Never auto-picked for plans; still searchable. */
  advanced: boolean;
  /** True for equipment with no meaningful "weight" to log (rowing machine, bike). */
  noWeight?: boolean;
}


interface KindParams {
  sets: number; reps: string; repsMin: number; rest: number; inc: number;
  tag: string; cues: string; points: string[];
}

const KIND_PARAMS: Record<ExerciseKind, KindParams> = {
  loaded_comp: {
    sets: 3, reps: '8-10', repsMin: 8, rest: 90, inc: 2.5, tag: 'Compound',
    cues: 'Brace your core and move through a range you control. Keep the weight steady on the way down as well as up.',
    points: ['Brace your core', 'Controlled range', 'Steady lowering'],
  },
  loaded_iso: {
    sets: 3, reps: '12-15', repsMin: 12, rest: 60, inc: 2.5, tag: 'Isolation',
    cues: 'Slow and controlled. Feel the target muscle working through the full range, without swinging.',
    points: ['Slow and controlled', 'Full range', 'No swinging'],
  },
  bw_comp: {
    sets: 3, reps: '10-15', repsMin: 10, rest: 60, inc: 0, tag: 'Bodyweight',
    cues: 'Move with control. Make it easier or harder by changing the angle or the range.',
    points: ['Controlled reps', 'Adjust angle to fit you'],
  },
  bw_iso: {
    sets: 3, reps: '12-20', repsMin: 12, rest: 45, inc: 0, tag: 'Bodyweight',
    cues: 'Slow and controlled, and feel the target muscle. Stop the set when form starts to slip.',
    points: ['Slow and controlled', 'Stop when form slips'],
  },
  hold: {
    sets: 3, reps: '30-45 sec', repsMin: 1, rest: 45, inc: 0, tag: 'Hold',
    cues: 'Hold steady and keep breathing. End the set when your form starts to slip, not before.',
    points: ['Keep breathing', 'Stop when form slips'],
  },
  prehab: {
    sets: 2, reps: '15-20', repsMin: 15, rest: 45, inc: 0, tag: 'Light and controlled',
    cues: 'Light weight, slow reps. This is for joint health and control, not for going heavy.',
    points: ['Keep it light', 'Slow reps'],
  },
  olympic: {
    sets: 4, reps: '3-5', repsMin: 3, rest: 120, inc: 2.5, tag: 'Advanced lift',
    cues: 'A technical lift. Use a light weight, learn the movement, and consider coaching before loading it.',
    points: ['Light weight first', 'Technique over load'],
  },
  plyo: {
    sets: 3, reps: '5-8', repsMin: 5, rest: 60, inc: 0, tag: 'Power',
    cues: 'Explosive but controlled. Land softly, and stop the set when reps get sloppy.',
    points: ['Explosive up, soft landing', 'Stop when sloppy'],
  },
  cardio_machine: {
    sets: 1, reps: '15-30 min', repsMin: 1, rest: 0, inc: 0, tag: 'Cardio',
    cues: 'Pick a pace where you can still talk in short sentences. Build time up gradually.',
    points: ['Conversational pace', 'Build time gradually'],
  },
  cardio_move: {
    sets: 3, reps: '30-45 sec', repsMin: 1, rest: 30, inc: 0, tag: 'Cardio',
    cues: 'Keep a steady rhythm for the full interval. Slow down rather than skipping the rest.',
    points: ['Steady rhythm', 'Slow down, do not skip'],
  },
};

const LOWER_BODY = new Set(['quads', 'glutes', 'hamstrings']);

function buildExercise(row: CatalogRow): Exercise {
  const p = KIND_PARAMS[row.kind];
  const eqIds = Array.from(new Set(row.requires.flat()));
  const eq = eqIds.length ? eqIds : ['bodyweight'];
  const loadedInc =
    row.kind === 'loaded_comp' && (LOWER_BODY.has(row.group) || /deadlift/i.test(row.name)) ? 5 : p.inc;
  // Loadable holds (farmers walk, weighted plank) can be progressed; plain bodyweight stays at 0.
  const inc = row.kind === 'hold' && eq[0] !== 'bodyweight' ? 2.5 : loadedInc;
  return {
    name: row.name,
    muscle: row.muscle,
    group: row.group,
    icon: getBodyGroup(row.group)?.icon || '\uD83D\uDCAA',
    tag: row.advanced ? 'Advanced' : p.tag,
    rest: p.rest,
    inc,
    sets: p.sets,
    reps: row.uni ? `${p.reps} each` : p.reps,
    repsMin: p.repsMin,
    ...(row.uni ? { uni: true } : {}),
    eq,
    cues: p.cues,
    points: p.points,
    requires: row.requires,
    kind: row.kind,
    compound: row.compound,
    advanced: row.advanced,
    ...(row.kind === 'cardio_machine' ? { noWeight: true } : {}),
  };
}

/**
 * The whole exercise list, built from the catalog (exerciseCatalog.ts), which
 * was rebuilt from the StrengthLog directory and the readable part of the
 * Calistree library. Sets, reps, rest and weight increments come from the
 * kind of movement, and body goals then shape reps, rest and sets on top of
 * that through trainingSchemes.ts, so the list itself carries no hand-tuned
 * numbers that could disagree with the goal logic.
 */
export const WORKOUT_EXERCISES: Record<string, Exercise> = Object.fromEntries(
  EXERCISE_CATALOG.map((row) => [row.id, buildExercise(row)] as const),
);

/**
 * True for an exercise with no weighted-equipment option at all (e.g.
 * Plank Variations, Wall Sit, Push-Up Variations, Burpee) — logging a
 * weight for these is meaningless, unlike an exercise that merely
 * supports a bodyweight variant alongside real weighted equipment
 * (Barbell Hip Thrust lists both "barbell" and "bodyweight" and
 * genuinely does get weighted; this correctly returns false for it).
 * No separate field was added to every exercise entry for this — the
 * existing `eq` array already carries the real signal.
 */
export function isBodyweightOnlyExercise(exercise: Pick<Exercise, 'eq'>): boolean {
  return exercise.eq.length === 1 && exercise.eq[0] === 'bodyweight';
}

/**
 * Compound (multi-joint) vs isolation (single-joint) is a field on each
 * catalog row, so it can never drift out of sync with a separate id list.
 * Used to order a session the way a trainer would: compound movements first,
 * while energy and neural drive are highest.
 */
export function isCompoundExercise(exerciseId: string): boolean {
  return WORKOUT_EXERCISES?.[exerciseId]?.compound === true;
}

/**
 * Parses a target duration in seconds out of an exercise's reps
 * string (e.g. "45-60 sec", "30 sec each", "15-20 sec each side",
 * "15-30 min") — returns null for a genuinely rep-based exercise
 * ("10-12", "max"). For a range, the upper bound is used as the
 * target: this app's position elsewhere (forgiving, non-punitive
 * systems) is to encourage reaching the fuller end of a stated range
 * rather than defaulting to the minimum. Verified against every
 * "sec"/"min"-containing reps string actually present in this file.
 */
export function parseTimeBasedSeconds(reps: string): number | null {
  const match = reps.match(/(\d+)(?:-(\d+))?\s*(sec|min)/i);
  if (!match) return null;
  const low = match[1] ? parseInt(match[1], 10) : NaN;
  const high = match[2] ? parseInt(match[2], 10) : low;
  if (!Number.isFinite(high)) return null;
  const unit = (match[3] || 'sec').toLowerCase();
  return unit === 'min' ? high * 60 : high;
}

/** True for an exercise whose reps field is a time duration rather than a rep count — the set-row UI shows a countdown timer instead of a reps number input for these. */
export function isTimeBasedExercise(exercise: Pick<Exercise, 'reps'>): boolean {
  return parseTimeBasedSeconds(exercise.reps) !== null;
}

/**
 * Normalizes an exercise name for duplicate detection: lowercases,
 * strips everything but letters/digits, and drops a single trailing
 * "s" (so "Frog Pump" and "Frog Pumps" collapse to the same key, as do
 * "Chest Supported Row" and "Chest-Supported Row", and "Devil's Press"
 * and "Devil Press"). This is deliberately just name-based, not a full
 * movement-pattern classifier — it exists to catch the exact failure
 * mode that happened in practice (the same exercise re-added under a
 * cosmetically different name), not to judge whether two differently-
 * named exercises are "close enough" to be the same movement. Two
 * genuinely different exercises that happen to share a normalized name
 * would be a real bug in the data, not a false positive.
 */
export function normalizeExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '');
}

/**
 * Scans the full library for two or more entries whose names normalize
 * to the same key. Returns one array per colliding group (each holding
 * every id+name that collided), empty groups filtered out. Used by
 * both the dev-time assertion below and scripts/checkExerciseDuplicates.ts
 * so there is exactly one implementation of "what counts as a
 * duplicate" — this is the standing guard requested after the
 * Chest-Supported Row / Frog Pumps / Devil Press-style duplicates that
 * had silently accumulated in the file.
 */
export function findDuplicateExerciseNames(
  exercises: Record<string, Pick<Exercise, 'name'>>
): { id: string; name: string }[][] {
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const [id, exercise] of Object.entries(exercises)) {
    const key = normalizeExerciseName(exercise.name);
    const bucket = groups.get(key) || [];
    bucket.push({ id, name: exercise.name });
    groups.set(key, bucket);
  }
  return Array.from(groups.values()).filter((bucket) => bucket.length > 1);
}

/**
 * Flags groups of 2+ exercises sharing the exact same muscle, equipment
 * set, and rep/rest/set scheme — the parameter signature, not the name.
 * This exists because the name-normalization check above missed real
 * duplicates that used unrelated names for the identical movement
 * (Cable Kickback / Standing Cable Hip Extension / Cable Glute Kickback
 * (standing) all shared eq:["cable"], muscle:"Glutes", reps:"15 each",
 * repsMin:15, rest:60, inc:2.5, sets:3, uni:true — a dead giveaway once
 * looked at side by side, but three unrelated-looking names). This is
 * deliberately a WARNING, not a hard failure: two genuinely different
 * isolation exercises can legitimately share a parameter signature by
 * coincidence, so a match here means "a human should look at this,"
 * not "this is definitely wrong." Equipment arrays are compared
 * order-independently (a exercise listing ["barbell","dumbbell"] and
 * one listing ["dumbbell","barbell"] should still match).
 */
export function findSuspiciousParameterMatches(
  exercises: Record<string, Pick<Exercise, 'name' | 'muscle' | 'eq' | 'reps' | 'repsMin' | 'rest' | 'sets' | 'inc' | 'uni'>>
): { id: string; name: string }[][] {
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const [id, exercise] of Object.entries(exercises)) {
    const eqKey = [...(exercise.eq || [])].sort().join(',');
    const key = [
      exercise.muscle,
      eqKey,
      exercise.reps,
      exercise.repsMin,
      exercise.rest,
      exercise.sets,
      exercise.inc,
      !!exercise.uni,
    ].join('|');
    const bucket = groups.get(key) || [];
    bucket.push({ id, name: exercise.name });
    groups.set(key, bucket);
  }
  return Array.from(groups.values()).filter((bucket) => bucket.length > 1);
}

// Dev-time guard: throws immediately on module load if a future edit
// (by anyone, including an AI assistant making batch additions) adds
// an exercise whose name collides with an existing one after
// normalization. This is the actual enforcement mechanism — not a
// comment asking someone to remember to check. Only runs in
// development so it can never crash a production build; the CI/local
// script (scripts/checkExerciseDuplicates.ts) is what should catch
// this before a change ever ships, but this is the backstop in case
// that step gets skipped.
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  const duplicates = findDuplicateExerciseNames(WORKOUT_EXERCISES);
  if (duplicates.length > 0) {
    const details = duplicates
      .map((group) => group.map((e) => `${e.id}:"${e.name}"`).join(' + '))
      .join('\n  ');
    throw new Error(
      `exercises.ts: duplicate exercise name(s) detected — the same movement was added twice under different ids.\n  ${details}\n` +
      `Remove or rename one of each pair before shipping. If these are genuinely different exercises (different equipment/movement) despite the name collision, rename one to disambiguate rather than suppressing this check.`
    );
  }
}
