export interface BodyPart {
  id: string;
  label: string;
  icon: string;
}

// Covers every exercise.group value used in WORKOUT_EXERCISES (chest,
// back, shoulders, arms, core, glutes, quads, hamstrings, calves) as
// its own tappable part, plus joint-specific areas (knees, hips,
// wrists, ankles, neck) that are a different kind of "sore" than a
// muscle group — a cranky knee isn't the same complaint as sore
// quads, even though both can affect quad exercises. The old list only
// had 10 parts and had no way to flag chest, arms, core, glutes, or
// quads at all — they were only reachable indirectly by picking a
// nearby joint, which meant genuinely sore glutes or quads (extremely
// common after leg day) had nowhere to go.
export const BODY_PARTS: BodyPart[] = [
  { id: 'neck', label: 'Neck', icon: '🦴' },
  { id: 'shoulders', label: 'Shoulders', icon: '💪' },
  { id: 'upper_back', label: 'Upper Back', icon: '🛡️' },
  { id: 'chest', label: 'Chest', icon: '🫁' },
  { id: 'arms', label: 'Arms', icon: '💪' },
  { id: 'wrists', label: 'Wrists', icon: '🤜' },
  { id: 'core', label: 'Core / Abs', icon: '🎯' },
  { id: 'lower_back', label: 'Lower Back', icon: '🦴' },
  { id: 'hips', label: 'Hips', icon: '🦴' },
  { id: 'glutes', label: 'Glutes', icon: '🍑' },
  { id: 'quads', label: 'Quads', icon: '🦵' },
  { id: 'hamstrings', label: 'Hamstrings', icon: '🦵' },
  { id: 'knees', label: 'Knees', icon: '🦵' },
  { id: 'calves', label: 'Calves', icon: '🦶' },
  { id: 'ankles', label: 'Ankles', icon: '🦶' },
];

// Maps a body part to the exercise muscle groups it affects. Direct
// muscle-group parts (glutes, quads, chest, etc) map primarily to
// themselves plus the groups that commonly load them together in
// compound movements — e.g. flagged Quads also lightens Glutes work,
// since squat-pattern exercises load both regardless of which one is
// actually sore. Joint parts (knees, hips, wrists, ankles, neck) map
// to whichever muscle groups place load through that joint, not to a
// specific muscle.
export const INJURY_GROUP_MAP: Record<string, string[]> = {
  neck: ['shoulders', 'back'],
  shoulders: ['shoulders', 'chest', 'arms', 'back'],
  upper_back: ['back', 'shoulders'],
  chest: ['chest', 'shoulders', 'arms'],
  arms: ['arms', 'chest', 'back'],
  wrists: ['arms', 'chest', 'back'],
  core: ['core', 'fullbody'],
  lower_back: ['back', 'fullbody'],
  hips: ['glutes', 'quads', 'hamstrings'],
  glutes: ['glutes', 'hamstrings'],
  quads: ['quads', 'glutes'],
  hamstrings: ['hamstrings', 'glutes'],
  knees: ['quads', 'hamstrings', 'calves'],
  calves: ['calves'],
  ankles: ['calves', 'quads', 'hamstrings'],
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
