import { expandLegacyGroups } from '../../content/bodyGroups';
import { expandLegacyTokens } from '../../content/equipment';
import { WORKOUT_EXERCISES, type Exercise } from '../../content/exercises';
import { ALL_CORRECTIVE_MODES, resolveRestrictions, type CorrectiveMode, type Restriction } from '../../content/restrictions';

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

/**
 * What the person's physical restrictions mean right now, resolved against the
 * equipment they have. Rides along on the EquipmentContext so every list that
 * already takes the context (plans, rotations, start-somewhere, swaps) gets it
 * without a new parameter.
 */
export interface RestrictionPlan {
  /** The restrictions in effect, in the order they were saved. */
  restrictions: readonly Restriction[];
  /** Ids the app must not pick on its own. Browsing and swapping still show them, with a warning. */
  avoid: ReadonlySet<string>;
  /** Targeted exercises doable with the current equipment, interleaved so each restriction is represented early. */
  corrective: readonly string[];
  modes: ReadonlySet<CorrectiveMode>;
}

export type EquipmentContext =
  | { restricted: false; plan?: RestrictionPlan }
  | { restricted: true; owned: ReadonlySet<string>; source: 'gym' | 'preferences'; plan?: RestrictionPlan };

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
  restrictionIds?: readonly string[] | null,
  correctiveModes?: readonly CorrectiveMode[] | null,
): EquipmentContext {
  const base = buildBaseContext(activeGym, prefsEquipment);
  const plan = buildRestrictionPlan(restrictionIds, correctiveModes, base);
  return plan ? { ...base, plan } : base;
}

function buildBaseContext(
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

/**
 * Resolves saved restriction ids into the avoid set and the targeted exercises
 * that fit the equipment. Unknown ids are dropped. Returns undefined when there
 * is nothing active, so a person with no restrictions sees no change at all.
 * Modes default to all three when never chosen; an explicit empty list means none.
 */
export function buildRestrictionPlan(
  restrictionIds: readonly string[] | null | undefined,
  correctiveModes: readonly CorrectiveMode[] | null | undefined,
  base: EquipmentContext,
): RestrictionPlan | undefined {
  const restrictions = resolveRestrictions(restrictionIds);
  if (restrictions.length === 0) return undefined;

  const avoid = new Set<string>();
  for (const r of restrictions) {
    for (const id of r.avoid.ids) avoid.add(id);
    if (r.avoid.kinds.length > 0) {
      for (const [id, ex] of Object.entries(WORKOUT_EXERCISES || {})) {
        if (r.avoid.kinds.includes(ex.kind)) avoid.add(id);
      }
    }
  }

  // Round-robin across restrictions so the first few picks cover each one.
  const perRestriction = restrictions.map((r) =>
    r.corrective.filter((id) => !!WORKOUT_EXERCISES?.[id] && isExerciseAvailable(id, base) && !avoid.has(id)),
  );
  const corrective: string[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...perRestriction.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of perRestriction) {
      const id = list[i];
      if (id && !seen.has(id)) {
        seen.add(id);
        corrective.push(id);
      }
    }
  }

  const validModes = new Set<CorrectiveMode>(ALL_CORRECTIVE_MODES);
  const modes = new Set<CorrectiveMode>(
    correctiveModes ? correctiveModes.filter((m) => validModes.has(m)) : ALL_CORRECTIVE_MODES,
  );
  return { restrictions, avoid, corrective, modes };
}

/** True when a restriction says the app should not pick this on its own. */
export function isAvoided(id: string, ctx: EquipmentContext): boolean {
  return !!ctx.plan?.avoid.has(id);
}

/** Restrictions that list this exercise as one to avoid. Used for warnings in browse and swap lists. */
export function restrictionsAvoiding(id: string, ctx: EquipmentContext): Restriction[] {
  const plan = ctx.plan;
  if (!plan?.avoid.has(id)) return [];
  const ex = WORKOUT_EXERCISES[id];
  return plan.restrictions.filter((r) => r.avoid.ids.includes(id) || (!!ex && r.avoid.kinds.includes(ex.kind)));
}

/** Restrictions that list this exercise as targeted strengthening. */
export function restrictionsHelpedBy(id: string, ctx: EquipmentContext): Restriction[] {
  return (ctx.plan?.restrictions || []).filter((r) => r.corrective.includes(id));
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

/** Auto-pickable, doable with the equipment, and not something a restriction says to avoid. */
export function isAutoSelectable(id: string, ex: Exercise, ctx: EquipmentContext): boolean {
  return isAutoPickable(ex) && isExerciseAvailable(id, ctx, ex) && !isAvoided(id, ctx);
}

/**
 * For anything the app chooses on the person's behalf (plans, rotations, Start
 * Somewhere, 6-12-25): doable with the equipment, auto-pickable, and not ruled
 * out by a restriction.
 */
export function filterAutoPickEntries<T extends [string, Exercise]>(
  entries: readonly T[] | null | undefined,
  ctx: EquipmentContext,
): T[] {
  return (entries || []).filter(([id, ex]) => isAutoSelectable(id, ex, ctx));
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
