/**
 * The one list of body groups every exercise is filed under. Focus areas,
 * Browse chips, 6-12-25, warm-ups, the AI coach and the body check-in all read
 * from here, so a group can never exist in one place and be missing in another.
 */

export type BodyRegion = 'upper' | 'lower' | 'core' | 'full' | 'cardio';

export interface BodyGroup {
  id: string;
  label: string;
  icon: string;
  region: BodyRegion;
}

export const BODY_GROUPS: BodyGroup[] = [
  { id: 'chest', label: 'Chest', icon: '💪', region: 'upper' },
  { id: 'shoulders', label: 'Shoulders', icon: '🏋️', region: 'upper' },
  { id: 'biceps', label: 'Biceps', icon: '💪', region: 'upper' },
  { id: 'triceps', label: 'Triceps', icon: '💪', region: 'upper' },
  { id: 'forearms', label: 'Forearms and grip', icon: '🤜', region: 'upper' },
  { id: 'lats', label: 'Lats', icon: '🔙', region: 'upper' },
  { id: 'upper_back', label: 'Upper back and traps', icon: '🛡️', region: 'upper' },
  { id: 'lower_back', label: 'Lower back', icon: '🦴', region: 'lower' },
  { id: 'neck', label: 'Neck', icon: '🦴', region: 'upper' },
  { id: 'core', label: 'Abs and core', icon: '🎯', region: 'core' },
  { id: 'glutes', label: 'Glutes', icon: '🍑', region: 'lower' },
  { id: 'quads', label: 'Quads', icon: '🦵', region: 'lower' },
  { id: 'hamstrings', label: 'Hamstrings', icon: '🦵', region: 'lower' },
  { id: 'calves', label: 'Calves and shins', icon: '🦶', region: 'lower' },
  { id: 'fullbody', label: 'Full body', icon: '🔥', region: 'full' },
  { id: 'cardio', label: 'Cardio', icon: '🏃', region: 'cardio' },
];

export const BODY_GROUP_IDS: string[] = BODY_GROUPS.map((g) => g.id);

const BY_ID: Record<string, BodyGroup> = Object.fromEntries(BODY_GROUPS.map((g) => [g.id, g] as const));

export function getBodyGroup(id: string | undefined | null): BodyGroup | undefined {
  return id ? BY_ID[id] : undefined;
}

export function bodyGroupLabel(id: string): string {
  return BY_ID[id]?.label || id.replace(/_/g, ' ');
}

/** Groups someone can pick as a focus area (cardio is not a muscle to prioritize). */
export const FOCUS_AREA_GROUPS: BodyGroup[] = BODY_GROUPS.filter((g) => g.region !== 'cardio');

/**
 * Older saved focus areas used two broad groups. They are expanded to the finer
 * groups when read, so nothing stored needs migrating and nobody loses a preference.
 */
const LEGACY_GROUP_EXPANSION: Record<string, readonly string[]> = {
  arms: ['biceps', 'triceps', 'forearms'],
  back: ['lats', 'upper_back', 'lower_back'],
};

export function expandLegacyGroups(groups: readonly string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const g of groups || []) {
    if (typeof g !== 'string') continue;
    for (const id of LEGACY_GROUP_EXPANSION[g] || [g]) if (!out.includes(id)) out.push(id);
  }
  return out;
}
