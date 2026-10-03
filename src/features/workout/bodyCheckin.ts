export type BodyPartSection = 'upper' | 'core' | 'lower' | 'joints';

export interface BodyPart {
  id: string;
  label: string;
  icon: string;
  section: BodyPartSection;
}

export const BODY_PART_SECTIONS: { id: BodyPartSection; label: string }[] = [
  { id: 'upper', label: 'Upper body' },
  { id: 'core', label: 'Core and back' },
  { id: 'lower', label: 'Lower body' },
  { id: 'joints', label: 'Joints' },
];

// Every exercise group has its own tappable muscle part (so sore biceps do not
// have to be reported as "arms"), plus joint parts (neck, elbows, wrists, hips,
// knees, ankles) that are a different kind of "sore" than a muscle: a cranky
// knee is not the same complaint as sore quads, even though both change which
// quad exercises make sense today. Ids for the original parts are unchanged.
export const BODY_PARTS: BodyPart[] = [
  { id: 'chest', label: 'Chest', icon: '🫁', section: 'upper' },
  { id: 'shoulders', label: 'Shoulders', icon: '💪', section: 'upper' },
  { id: 'biceps', label: 'Biceps', icon: '💪', section: 'upper' },
  { id: 'triceps', label: 'Triceps', icon: '💪', section: 'upper' },
  { id: 'forearms', label: 'Forearms', icon: '🤜', section: 'upper' },
  { id: 'neck', label: 'Neck and traps', icon: '🦴', section: 'upper' },
  { id: 'lats', label: 'Lats', icon: '🔙', section: 'core' },
  { id: 'upper_back', label: 'Upper Back', icon: '🛡️', section: 'core' },
  { id: 'lower_back', label: 'Lower Back', icon: '🦴', section: 'core' },
  { id: 'core', label: 'Abs / Core', icon: '🎯', section: 'core' },
  { id: 'glutes', label: 'Glutes', icon: '🍑', section: 'lower' },
  { id: 'quads', label: 'Quads', icon: '🦵', section: 'lower' },
  { id: 'hamstrings', label: 'Hamstrings', icon: '🦵', section: 'lower' },
  { id: 'calves', label: 'Calves and shins', icon: '🦶', section: 'lower' },
  { id: 'elbows', label: 'Elbows', icon: '🦴', section: 'joints' },
  { id: 'wrists', label: 'Wrists', icon: '🤜', section: 'joints' },
  { id: 'hips', label: 'Hips', icon: '🦴', section: 'joints' },
  { id: 'knees', label: 'Knees', icon: '🦵', section: 'joints' },
  { id: 'ankles', label: 'Ankles', icon: '🦶', section: 'joints' },
];

// Maps a body part to the exercise groups it should change. Muscle parts map to
// themselves plus the groups that load them together (a sore quad also lightens
// glute work). Joint parts map to the groups that put load through that joint.
// Full-body lifts are included wherever the whole body is loaded through the area.
export const INJURY_GROUP_MAP: Record<string, string[]> = {
  chest: ['chest', 'shoulders', 'triceps'],
  shoulders: ['shoulders', 'chest', 'triceps', 'lats', 'upper_back'],
  biceps: ['biceps', 'lats', 'forearms'],
  triceps: ['triceps', 'chest', 'shoulders'],
  forearms: ['forearms', 'biceps', 'lats'],
  neck: ['neck', 'upper_back', 'shoulders'],
  lats: ['lats', 'biceps', 'upper_back'],
  upper_back: ['upper_back', 'lats', 'shoulders'],
  lower_back: ['lower_back', 'fullbody'],
  core: ['core', 'fullbody'],
  glutes: ['glutes', 'hamstrings'],
  quads: ['quads', 'glutes'],
  hamstrings: ['hamstrings', 'glutes', 'lower_back'],
  calves: ['calves'],
  elbows: ['biceps', 'triceps', 'forearms', 'chest', 'shoulders'],
  wrists: ['forearms', 'biceps', 'triceps', 'chest', 'shoulders'],
  hips: ['glutes', 'quads', 'hamstrings'],
  knees: ['quads', 'hamstrings', 'calves', 'glutes', 'cardio'],
  ankles: ['calves', 'quads', 'hamstrings', 'cardio'],
  // Older saved ids from before the finer groups existed.
  arms: ['biceps', 'triceps', 'forearms', 'chest', 'lats'],
};

export type PainSeverity = 1 | 2 | 3; // 1=mild, 2=noticeable, 3=a lot

export interface CheckinAdjustment {
  skipGroups: string[]; // severity 2-3 — exercises for these groups are left out entirely
  reduceGroups: string[]; // severity 1 — exercises for these groups keep going, with one fewer set
}

/**
 * Severity 2+ (noticeable/a lot) skips that muscle group's exercises
 * entirely for today. Severity 1 (mild) keeps them in, just with one
 * fewer set. A group only ever lands in one bucket — skip wins if any
 * flagged body part maps to it at severity 2+.
 */
export function computeCheckinAdjustment(severityByPart: Record<string, PainSeverity>): CheckinAdjustment {
  const skipGroups = new Set<string>();
  const reduceGroups = new Set<string>();

  for (const [partId, severity] of Object.entries(severityByPart || {})) {
    const groups = INJURY_GROUP_MAP[partId] || [];
    for (const group of groups) {
      if (severity >= 2) skipGroups.add(group);
      else reduceGroups.add(group);
    }
  }
  for (const group of skipGroups) reduceGroups.delete(group);

  return { skipGroups: Array.from(skipGroups), reduceGroups: Array.from(reduceGroups) };
}

/**
 * Removes exercises matching a skipped group from today's plan —
 * except it never lets the whole day come up empty. If every exercise
 * would be skipped (a lot of flagged areas on a small day), the
 * original unfiltered list is kept instead of leaving someone with
 * nothing to do.
 */
export function applySkipToExerciseIds(
  exerciseIds: string[],
  skipGroups: string[],
  exerciseGroupOf: (id: string) => string | undefined
): string[] {
  if (!skipGroups.length) return exerciseIds;
  const filtered = exerciseIds.filter((id) => !skipGroups.includes(exerciseGroupOf(id) || ''));
  return filtered.length > 0 ? filtered : exerciseIds;
}
