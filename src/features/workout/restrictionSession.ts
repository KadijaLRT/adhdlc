import { WORKOUT_EXERCISES } from '@/content/exercises';
import type { Restriction } from '@/content/restrictions';
import { isExerciseAvailable, type EquipmentContext } from './exerciseAvailability';

/**
 * Turns a person's restrictions into the exercises of one session. One function
 * is shared by every way a session can start (Start Day and Body Check-in), so
 * they can never disagree.
 *
 *  - Anything a restriction says to avoid is dropped from the main list.
 *  - "Mixed" mode: one targeted move takes the last (least important) spot.
 *  - "Warm-up" mode: a short targeted block goes first.
 *
 * Both only use targeted moves that fit the equipment (the plan already holds
 * only those). With no restrictions the list comes back unchanged.
 */

type Energy = 'low' | 'medium' | 'high' | undefined;

export interface SessionRestrictionOptions {
  energyLevel?: Energy;
  /** Stable per day (for example 20261027) so a re-render does not reshuffle the warm-up. */
  seed: number;
}

const WARMUP_COUNT = 3;
const WARMUP_COUNT_LOW_ENERGY = 2;
const ROUTINE_COUNT = 6;
const ROUTINE_COUNT_LOW_ENERGY = 4;

function rotate<T>(items: readonly T[], by: number): T[] {
  if (items.length === 0) return [];
  const start = ((by % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

export function applyRestrictionsToSession(
  ids: readonly string[] | null | undefined,
  ctx: EquipmentContext,
  opts: SessionRestrictionOptions,
): string[] {
  const input = (ids || []).filter((id) => !!WORKOUT_EXERCISES?.[id]);
  const plan = ctx.plan;
  if (!plan) return input;

  let main = input.filter((id) => !plan.avoid.has(id));

  if (plan.modes.has('mixed') && plan.corrective.length > 0 && main.length > 0) {
    const groups = new Set(main.map((id) => WORKOUT_EXERCISES[id]?.group));
    const free = plan.corrective.filter((id) => !main.includes(id));
    // Prefer a move for a muscle group the day already trains, then anything.
    const sameGroup = free.filter((id) => groups.has(WORKOUT_EXERCISES[id]?.group));
    const pool = sameGroup.length > 0 ? sameGroup : free;
    const pick = rotate(pool, opts.seed)[0];
    if (pick) {
      main = main.length >= 3 ? [...main.slice(0, -1), pick] : [...main, pick];
    }
  }

  let warmup: string[] = [];
  if (plan.modes.has('warmup') && plan.corrective.length > 0) {
    const count = opts.energyLevel === 'low' ? WARMUP_COUNT_LOW_ENERGY : WARMUP_COUNT;
    const free = plan.corrective.filter((id) => !main.includes(id));
    warmup = rotate(free, opts.seed).slice(0, count);
  }

  return [...warmup, ...main];
}

/** The short standalone routine. Predictable on purpose: same order every time, trimmed on a low-energy day. */
export function buildRehabRoutineIds(ctx: EquipmentContext, energyLevel?: Energy): string[] {
  const plan = ctx.plan;
  if (!plan) return [];
  const count = energyLevel === 'low' ? ROUTINE_COUNT_LOW_ENERGY : ROUTINE_COUNT;
  return plan.corrective.slice(0, count);
}

export interface RestrictionPreview {
  /** Targeted moves that fit the current equipment, in priority order. */
  helps: { id: string; name: string }[];
  /** Targeted moves that need equipment the active gym does not have. */
  unavailableCount: number;
  /** How many exercises are kept out of automatic picks for this restriction alone. */
  avoidCount: number;
}

/** What turning this restriction on would do, for the settings screen. Ignores the plan so it works before it is saved. */
export function previewRestriction(restriction: Restriction, ctx: EquipmentContext): RestrictionPreview {
  const known = restriction.corrective.filter((id) => !!WORKOUT_EXERCISES?.[id]);
  const fits = known.filter((id) => isExerciseAvailable(id, ctx));
  const avoidIds = new Set<string>(restriction.avoid.ids.filter((id) => !!WORKOUT_EXERCISES?.[id]));
  if (restriction.avoid.kinds.length > 0) {
    for (const [id, ex] of Object.entries(WORKOUT_EXERCISES || {})) {
      if (restriction.avoid.kinds.includes(ex.kind)) avoidIds.add(id);
    }
  }
  return {
    helps: fits.map((id) => ({ id, name: WORKOUT_EXERCISES[id]?.name || id })),
    unavailableCount: known.length - fits.length,
    avoidCount: avoidIds.size,
  };
}

/** "Runner's knee and Weak hips" style label for banners. */
export function restrictionLabels(ctx: EquipmentContext): string {
  const labels = (ctx.plan?.restrictions || []).map((r) => r.label);
  if (labels.length <= 1) return labels[0] || '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
