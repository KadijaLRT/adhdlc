import type { SetLogEntry } from '@/store/slices/workoutSlice';
import { toLocalDateString } from '@/shared/formatDate';
import { parseTimeBasedSeconds } from '@/content/exercises';

export interface SetSuggestion {
  weight: string;
  reps: string;
  /** Whether this suggestion bumped the weight (hit the top of the rep range last time) or just carried the previous weight/reps forward as a target to beat. Shown in the UI so the person understands why a number is prefilled, not just that one is. */
  reason: 'increase' | 'repeat' | 'none';
}

function parseRepsRange(reps: string, repsMin: number): { min: number; max: number } {
  const match = reps.match(/(\d+)\s*-\s*(\d+)/);
  if (match && match[1] && match[2]) return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
  return { min: repsMin, max: repsMin }; // a single fixed rep target (e.g. "12") — no range to progress within, min and max are the same number
}

/**
 * Suggests a starting weight and reps for an exercise's first set,
 * based on what actually happened last session — double progression,
 * not "always add weight" (which real guidance consistently warns
 * against: reps and weight are separate levers, and pushing weight up
 * every single session without first demonstrating the current weight
 * is easy is how form breaks down and plateaus/injuries happen).
 *
 * Time-based exercises (Plank, Wall Sit, etc.) are explicitly excluded
 * — they don't take a weight input at all (see
 * isBodyweightOnlyExercise elsewhere), so there's nothing here for
 * this function to suggest; the caller should skip calling this for
 * those entirely.
 */
export function suggestNextSet(
  exerciseId: string,
  repsTarget: string,
  repsMin: number,
  weightIncrement: number,
  setLogs: SetLogEntry[]
): SetSuggestion {
  if (parseTimeBasedSeconds(repsTarget) !== null) {
    return { weight: '', reps: '', reason: 'none' };
  }

  const logsForExercise = (setLogs || [])
    .filter((l) => l.exerciseId === exerciseId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (!logsForExercise.length) return { weight: '', reps: '', reason: 'none' };

  // Every set actually logged on the single most recent day this
  // exercise was trained — not just the single best set, since double
  // progression cares whether EVERY set hit the top of the range, not
  // just the best one.
  const mostRecentDate = logsForExercise[0]?.date;
  if (!mostRecentDate) return { weight: '', reps: '', reason: 'none' };
  const mostRecentDay = toLocalDateString(new Date(mostRecentDate));
  const lastSessionSets = logsForExercise.filter((l) => toLocalDateString(new Date(l.date)) === mostRecentDay);
  if (!lastSessionSets.length) return { weight: '', reps: '', reason: 'none' };

  const { min, max } = parseRepsRange(repsTarget, repsMin);
  const lastWeight = Math.max(...lastSessionSets.map((s) => s.weight));
  // A weight-only exercise with no real range (e.g. a fixed "12 reps"
  // target) still benefits from carrying the last weight forward —
  // just without the reps-first double-progression logic, since
  // there's no range to progress reps within.
  if (min === max) {
    return { weight: lastWeight > 0 ? String(lastWeight) : '', reps: String(min), reason: 'repeat' };
  }

  const allSetsHitTop = lastSessionSets.every((s) => s.reps >= max);
  if (allSetsHitTop && lastWeight > 0) {
    return { weight: String(lastWeight + weightIncrement), reps: String(min), reason: 'increase' };
  }

  // Didn't hit the top on every set last time — same weight, but the
  // actual reps achieved (the best set) becomes the visible target to
  // beat this time, per the double-progression "add reps first" rule.
  const bestRepsLastTime = Math.max(...lastSessionSets.map((s) => s.reps));
  return {
    weight: lastWeight > 0 ? String(lastWeight) : '',
    reps: String(Math.max(bestRepsLastTime, min)),
    reason: 'repeat',
  };
}

/**
 * Compares the most recent logged weight for an exercise against the
 * one before it (from a different day) and returns a short "↑ Xlbs"
 * style label, or null if there's nothing to compare yet. Only ever
 * shows increases — a weight decrease between sessions is common and
 * normal (fatigue, form focus, etc.) and isn't flagged as a regression,
 * matching the app's non-punitive approach to progress elsewhere.
 */
export function getWeightProgressLabel(exerciseId: string, setLogs: SetLogEntry[]): string | null {
  const logsForExercise = (setLogs || [])
    .filter((l) => l.exerciseId === exerciseId && l.weight > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (logsForExercise.length < 2) return null;

  // Group by day so multiple sets in one session don't count as separate data points.
  const byDay = new Map<string, number>();
  for (const log of logsForExercise) {
    const day = log.date ? toLocalDateString(new Date(log.date)) : log.date;
    byDay.set(day, Math.max(byDay.get(day) || 0, log.weight));
  }

  const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  if (days.length < 2) return null;

  const latest = days[days.length - 1];
  const previous = days[days.length - 2];
  if (!latest || !previous) return null;

  const diff = latest[1] - previous[1];
  if (diff <= 0) return null;

  return `↑ ${diff}lbs`;
}
