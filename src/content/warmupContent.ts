export type WarmupCategory = 'lower_body' | 'upper_body' | 'core' | 'fullbody';
export type WarmupAnimationType = 'vertical' | 'quickVertical' | 'horizontal' | 'rotate' | 'twist' | 'pulse';

export interface WarmupStep {
  id: string;
  text: string;
  durationSeconds: number;
  emoji?: string; // shown large above the countdown, animated per `animation`
  animation?: WarmupAnimationType;
}

// Dynamic movement, not static stretching — the point of a warm-up is
// to raise heart rate and rehearse the day's movement patterns, not to
// hold a stretch. That's why this is a separate set of moves from
// STRETCH_ROUTINES (recoveryContent.ts) rather than reusing it.
//
// Each step carries an emoji + a movement "shape" (vertical,
// quickVertical, horizontal, rotate, twist, pulse) that
// WarmupMoveAnimation loops on screen — a lightweight stand-in for
// illustrated exercise art that needs no image assets and works
// identically on web and native.
//
// A genuinely larger pool per category (not just one fixed list) —
// getVariedWarmupSelection below rotates through it the same way
// getVariedExerciseSelection (buildWeeklySplit.ts) already rotates
// real workout exercises, so training the same muscle groups on two
// different days doesn't produce the identical warm-up, in the
// identical order, every single time.
const WARMUP_MOVE_POOLS: Record<WarmupCategory, WarmupStep[]> = {
  lower_body: [
    { id: 'lb-1', text: 'Bodyweight squats', durationSeconds: 30, emoji: '🏋️', animation: 'vertical' },
    { id: 'lb-2', text: 'Walking lunges', durationSeconds: 30, emoji: '🚶', animation: 'horizontal' },
    { id: 'lb-3', text: 'Leg swings — Right leg', durationSeconds: 20, emoji: '🦵', animation: 'horizontal' },
    { id: 'lb-4', text: 'Leg swings — Left leg', durationSeconds: 20, emoji: '🦵', animation: 'horizontal' },
    { id: 'lb-5', text: 'Glute bridges', durationSeconds: 30, emoji: '🍑', animation: 'vertical' },
    { id: 'lb-6', text: 'Bodyweight calf raises', durationSeconds: 20, emoji: '🦶', animation: 'quickVertical' },
    { id: 'lb-7', text: 'Standing hip circles — Right leg', durationSeconds: 20, emoji: '🦵', animation: 'rotate' },
    { id: 'lb-8', text: 'Standing hip circles — Left leg', durationSeconds: 20, emoji: '🦵', animation: 'rotate' },
    { id: 'lb-9', text: 'Bodyweight Romanian deadlifts', durationSeconds: 30, emoji: '🏋️', animation: 'vertical' },
    { id: 'lb-10', text: 'Lateral lunges, alternating sides', durationSeconds: 30, emoji: '🚶', animation: 'horizontal' },
    { id: 'lb-11', text: 'High knees, marching pace', durationSeconds: 20, emoji: '🏃', animation: 'quickVertical' },
    { id: 'lb-12', text: 'Ankle bounces', durationSeconds: 20, emoji: '🦶', animation: 'quickVertical' },
  ],
  upper_body: [
    { id: 'ub-1', text: 'Arm circles, forward then back', durationSeconds: 20, emoji: '💪', animation: 'rotate' },
    { id: 'ub-2', text: 'Band pull-aparts (or the same motion with no band)', durationSeconds: 30, emoji: '🙌', animation: 'horizontal' },
    { id: 'ub-3', text: 'Shoulder rolls', durationSeconds: 20, emoji: '🤷', animation: 'rotate' },
    { id: 'ub-4', text: 'Push-up to downward dog', durationSeconds: 30, emoji: '🧘', animation: 'vertical' },
    { id: 'ub-5', text: 'Light rows or scapular squeezes', durationSeconds: 30, emoji: '🚣', animation: 'horizontal' },
    { id: 'ub-6', text: 'Arm swings, across the chest', durationSeconds: 20, emoji: '💪', animation: 'horizontal' },
    { id: 'ub-7', text: 'Wall slides', durationSeconds: 30, emoji: '🙌', animation: 'vertical' },
    { id: 'ub-8', text: 'Wrist circles, both directions', durationSeconds: 20, emoji: '🤲', animation: 'rotate' },
    { id: 'ub-9', text: 'Shadow boxing, light and loose', durationSeconds: 30, emoji: '🥊', animation: 'horizontal' },
    { id: 'ub-10', text: 'Torso twists with arms extended', durationSeconds: 20, emoji: '🤸', animation: 'twist' },
  ],
  core: [
    { id: 'c-1', text: 'Cat-cow stretch', durationSeconds: 30, emoji: '🐱', animation: 'vertical' },
    { id: 'c-2', text: 'Dead bug, slow controlled reps', durationSeconds: 30, emoji: '🐞', animation: 'pulse' },
    { id: 'c-3', text: 'Bird dog, alternating sides', durationSeconds: 30, emoji: '🐦', animation: 'twist' },
    { id: 'c-4', text: 'Standing side bends', durationSeconds: 20, emoji: '🙆', animation: 'twist' },
    { id: 'c-5', text: 'Slow bicycle crunches', durationSeconds: 30, emoji: '🚴', animation: 'twist' },
    { id: 'c-6', text: 'Standing trunk rotations', durationSeconds: 20, emoji: '🙆', animation: 'twist' },
    { id: 'c-7', text: 'Modified mountain climbers, slow pace', durationSeconds: 30, emoji: '⛰️', animation: 'pulse' },
    { id: 'c-8', text: "World's greatest stretch, alternating sides", durationSeconds: 30, emoji: '🧘', animation: 'twist' },
  ],
  fullbody: [
    { id: 'fb-1', text: 'Jumping jacks', durationSeconds: 30, emoji: '🤸', animation: 'quickVertical' },
    { id: 'fb-2', text: 'Bodyweight squats', durationSeconds: 30, emoji: '🏋️', animation: 'vertical' },
    { id: 'fb-3', text: 'Arm circles', durationSeconds: 20, emoji: '💪', animation: 'rotate' },
    { id: 'fb-4', text: 'Walking lunges', durationSeconds: 30, emoji: '🚶', animation: 'horizontal' },
    { id: 'fb-5', text: 'High knees', durationSeconds: 20, emoji: '🏃', animation: 'quickVertical' },
    { id: 'fb-6', text: 'Butt kicks', durationSeconds: 20, emoji: '🏃', animation: 'quickVertical' },
    { id: 'fb-7', text: 'Inchworm walkouts', durationSeconds: 30, emoji: '🐛', animation: 'vertical' },
    { id: 'fb-8', text: 'Standing toe touches', durationSeconds: 20, emoji: '🙆', animation: 'vertical' },
    { id: 'fb-9', text: 'Light jog in place', durationSeconds: 30, emoji: '🏃', animation: 'quickVertical' },
    { id: 'fb-10', text: 'Squat to overhead reach', durationSeconds: 30, emoji: '🙌', animation: 'vertical' },
  ],
};

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
 * Rotates through a category's full move pool instead of always
 * returning the same fixed list — same approach as
 * getVariedExerciseSelection (buildWeeklySplit.ts): seeded by the
 * current date so it's stable for the whole day but different next
 * time, and explicitly avoids repeating any of the last few combos
 * actually used for this category. Falls back to the
 * least-recently-used arrangement rather than failing if the pool is
 * ever too small to fully avoid every recent combo.
 */
export function getVariedWarmupSelection(
  category: WarmupCategory,
  count: number,
  recentCombos: string[][],
  seed: number
): WarmupStep[] {
  const pool = WARMUP_MOVE_POOLS[category] || [];
  if (pool.length <= count) return pool;

  const idToStep = new Map(pool.map((s) => [s.id, s]));
  const shuffled = seededShuffle(pool.map((s) => s.id), seed);

  for (let offset = 0; offset < shuffled.length; offset++) {
    const rotated = [...shuffled.slice(offset), ...shuffled.slice(0, offset)];
    const candidateIds = rotated.slice(0, count);
    const isRepeat = recentCombos.some((combo) => sameCombo(combo, candidateIds));
    if (!isRepeat) return candidateIds.map((id) => idToStep.get(id)).filter((s): s is WarmupStep => !!s);
  }
  return shuffled.slice(0, count).map((id) => idToStep.get(id)).filter((s): s is WarmupStep => !!s);
}

/**
 * Picks the warm-up category that actually matches what the day
 * trains — a lower-body-dominant day gets the lower-body warm-up, not
 * a generic one. Mixed upper+lower days get the full-body warm-up
 * rather than guessing which half matters more.
 */
export function warmupCategoryForGroups(muscleGroups: string[]): WarmupCategory {
  const lowerBodyGroups = new Set(['quads', 'hamstrings', 'glutes', 'calves']);
  const upperBodyGroups = new Set(['chest', 'back', 'shoulders', 'arms']);

  let lowerCount = 0, upperCount = 0, coreCount = 0, fullbodyCount = 0;
  for (const group of muscleGroups) {
    if (lowerBodyGroups.has(group)) lowerCount++;
    else if (upperBodyGroups.has(group)) upperCount++;
    else if (group === 'core') coreCount++;
    else if (group === 'fullbody') fullbodyCount++;
  }

  if (fullbodyCount > 0 || (lowerCount > 0 && upperCount > 0)) return 'fullbody';
  if (lowerCount > 0 && lowerCount >= upperCount && lowerCount >= coreCount) return 'lower_body';
  if (upperCount > 0 && upperCount >= coreCount) return 'upper_body';
  if (coreCount > 0) return 'core';
  return 'fullbody';
}

const CATEGORY_TITLES: Record<WarmupCategory, string> = {
  lower_body: 'Lower Body Warm-Up',
  upper_body: 'Upper Body Warm-Up',
  core: 'Core Warm-Up',
  fullbody: 'Full Body Warm-Up',
};

/**
 * Picks a warm-up for the day's muscle groups AND rotates which
 * specific moves are used, instead of always returning the exact same
 * fixed list for a given category — training the same muscle groups
 * on two different days previously produced the identical warm-up, in
 * the identical order, every single time (see the conversation this
 * was built from). `seed` and `recentCombos` work exactly like their
 * counterparts in getVariedExerciseSelection (buildWeeklySplit.ts):
 * seed the current date so it's stable through today but different
 * next time, recentCombos the last few move-combinations actually
 * used for this category.
 */
export function getWarmupForGroups(
  muscleGroups: string[],
  count = 5,
  recentCombos: string[][] = [],
  seed = 1
): { title: string; steps: WarmupStep[] } {
  const category = warmupCategoryForGroups(muscleGroups);
  const pool = WARMUP_MOVE_POOLS[category] || [];
  const steps = getVariedWarmupSelection(category, Math.min(count, pool.length || count), recentCombos, seed);
  return { title: CATEGORY_TITLES[category], steps };
}
