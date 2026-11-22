import { WORKOUT_EXERCISES } from '@/content/exercises';

/**
 * Filters out missing/stale exercise IDs and removes duplicates while
 * preserving order, so DayCard previews, route params, and restored
 * WorkoutDaySession drafts always agree on valid exercises.
 */
export function sanitizeSessionExerciseIds(ids: readonly string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const id of ids || []) {
    if (!id || seen.has(id) || !WORKOUT_EXERCISES?.[id]) continue;
    seen.add(id);
    valid.push(id);
  }
  return valid;
}
