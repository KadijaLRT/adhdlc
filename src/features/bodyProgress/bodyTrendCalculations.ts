import type { WeightEntry } from '@/store/slices/bodyProgressSlice';
import { toLocalDateString } from '@/shared/formatDate';

/**
 * Emphasizes trend over any single day's number, on purpose — per the
 * document's "reduce discouragement from daily fluctuations" principle.
 * Weight naturally bounces day to day from water/food/timing; the
 * 7-day average and 30-day change are far more meaningful than today's
 * raw figure alone, so those are what the UI leads with.
 */
export function getSevenDayAverage(weightLog: WeightEntry[]): number | null {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const cutoff = toLocalDateString(sevenDaysAgo);

  const recent = (weightLog || []).filter((e) => e.date >= cutoff);
  if (!recent.length) return null;
  return recent.reduce((sum, e) => sum + e.weightLbs, 0) / recent.length;
}

export function getThirtyDayChange(weightLog: WeightEntry[]): number | null {
  const sorted = [...(weightLog || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = toLocalDateString(thirtyDaysAgo);

  // No entry within the actual 30-day window means there's genuinely
  // no 30-day change to report — falling back to the oldest entry
  // ever logged (which this used to do) could present a multi-year
  // difference as a "30-day change," and that number fed straight
  // into projectGoalDate below, contaminating the projected date too.
  const oldEntry = sorted.find((e) => e.date >= cutoff);
  if (!oldEntry) return null;

  const latestEntry = sorted[sorted.length - 1];
  if (!latestEntry) return null;
  return latestEntry.weightLbs - oldEntry.weightLbs;
}

export function getLatestWeight(weightLog: WeightEntry[]): number | null {
  const sorted = [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0]?.weightLbs ?? null;
}

export function projectGoalDate(weightLog: WeightEntry[], goalLbs: number | null): string | null {
  if (!goalLbs) return null;
  const change30 = getThirtyDayChange(weightLog);
  const latest = getLatestWeight(weightLog);
  if (change30 === null || latest === null || change30 === 0) return null;

  const remaining = goalLbs - latest;
  // Only project if moving in the direction of the goal.
  if ((remaining > 0 && change30 <= 0) || (remaining < 0 && change30 >= 0)) return null;

  const dailyRate = change30 / 30;
  const daysNeeded = Math.abs(remaining / dailyRate);
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + Math.round(daysNeeded));
  return toLocalDateString(projectedDate);
}
