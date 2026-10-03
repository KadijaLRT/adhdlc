import { expandLegacyGroups } from '../../content/bodyGroups';
import { expandLegacyTokens } from '../../content/equipment';
import { WORKOUT_EXERCISES, type Exercise } from '../../content/exercises';

/**
 * The single place that decides "can this exercise be done with this equipment".
 * Every list in the app (daily plan, swap, add, browse, 6-12-25, start-somewhere)
 * goes through here, and nothing falls back to showing everything.
 */

/** A requirement is OR-of-AND: any inner set that is fully owned makes the exercise doable. `[]` means no equipment needed. */
export type Requirement = readonly (readonly string[])[];

/** Requirement for one exercise, read straight from the catalog. Missing or malformed data means unavailable, never silently shown. */
export function getRequirement(_id: string, exercise: Pick<Exercise, 'requires'> | undefined): Requirement {
  const requires = exercise?.requires;
  return Array.isArray(requires) && requires.length > 0 ? requires : [];
}

export type EquipmentContext =
  | { restricted: false }
  | { restricted: true; owned: ReadonlySet<string>; source: 'gym' | 'preferences' };

/** Whether a program targets this exercise group. Old saved programs that name 'arms' or 'back' still match the finer groups. */
export function targetsGroup(targetGroups: readonly string[] | null | undefined, group: string): boolean {
  const targets = expandLegacyGroups(targetGroups);
  return (targetGroups || []).includes('all') || targets.includes(group);
}

export const UNRESTRICTED: EquipmentContext = { restricted: false };

/**
 * Active gym wins: its list is the truth, even when empty (then only no-equipment
 * exercises show). With no gym, the equipment chosen in fitness preferences is used.
 * With neither, nothing is known, so nothing is hidden.
 */
export function buildEquipmentContext(
  activeGym: { equipment?: readonly string[] | null } | null | undefined,
  prefsEquipment: readonly string[] | null | undefined,
): EquipmentContext {
  if (activeGym) {
    return { restricted: true, source: 'gym', owned: new Set(expandLegacyTokens(activeGym.equipment)) };
  }
  const prefs = expandLegacyTokens(prefsEquipment).filter((t) => t !== 'bodyweight');
  if (prefs.length > 0) {
    return { restricted: true, source: 'preferences', owned: new Set(prefs) };
  }
  return UNRESTRICTED;
}

export function isRequirementMet(requirement: Requirement, ctx: EquipmentContext): boolean {
  if (!ctx.restricted) return true;
  return requirement.some((set) => set.every((e) => ctx.owned.has(e)));
}

export function isExerciseAvailable(id: string, ctx: EquipmentContext, exercise?: Exercise): boolean {
  if (!ctx.restricted) return true;
  const ex = exercise || WORKOUT_EXERCISES[id];
  if (!ex) return false;
  return isRequirementMet(getRequirement(id, ex), ctx);
}

export function filterAvailableIds(ids: readonly string[] | null | undefined, ctx: EquipmentContext): string[] {
  return (ids || []).filter((id) => isExerciseAvailable(id, ctx));
}

const AUTO_PICK_KINDS: ReadonlySet<string> = new Set(['loaded_comp', 'loaded_iso', 'bw_comp', 'bw_iso', 'hold']);

/**
 * Whether the app may choose this exercise on the person's behalf. Advanced
 * lifts, warm-up/prehab work, plyometrics and cardio are left out of automatic
 * picks (cardio has its own card), but stay available when browsing, searching or swapping.
 */
export function isAutoPickable(ex: Pick<Exercise, 'advanced' | 'kind'>): boolean {
  return !ex.advanced && AUTO_PICK_KINDS.has(ex.kind);
}

const KIND_RANK: Record<string, number> = { loaded_comp: 0, bw_comp: 1, loaded_iso: 2, bw_iso: 3, hold: 4 };

/** Stable ranking so plans lead with the basics: compound lifts first, then isolation, then holds. */
export function rankForPlanning<T extends [string, Exercise]>(entries: readonly T[]): T[] {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (KIND_RANK[a.e[1].kind] ?? 9) - (KIND_RANK[b.e[1].kind] ?? 9) || a.i - b.i)
    .map(({ e }) => e);
}

/**
 * For anything the app chooses on the person's behalf (plans, rotations, Start
 * Somewhere, 6-12-25): doable with the equipment AND auto-pickable.
 */
export function filterAutoPickEntries<T extends [string, Exercise]>(
  entries: readonly T[] | null | undefined,
  ctx: EquipmentContext,
): T[] {
  return (entries || []).filter(([id, ex]) => isAutoPickable(ex) && isExerciseAvailable(id, ctx, ex));
}

export function filterAvailableEntries<T extends [string, Exercise]>(
  entries: readonly T[] | null | undefined,
  ctx: EquipmentContext,
): T[] {
  return (entries || []).filter(([id, ex]) => isExerciseAvailable(id, ctx, ex));
}

/** Plain-language line for the empty state, e.g. "Nothing for glutes fits Planet Fitness equipment." */
export function describeContext(ctx: EquipmentContext, gymName?: string | null): string {
  if (!ctx.restricted) return 'your equipment';
  if (ctx.source === 'gym' && gymName) return `${gymName}'s equipment`;
  return 'your equipment';
}
