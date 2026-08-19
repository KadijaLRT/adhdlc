import { parseLocalDate } from '@/shared/formatDate';

/**
 * Cross-references the goal against the calendar: given a starting
 * weight, goal weight, and goal date, computes the weekly rate of
 * change actually required to get there on time. This is the concrete
 * link between "how rigorous do my workouts and eating need to be" and
 * an actual date, rather than an open-ended goal with no pace attached.
 */
export interface RequiredRateResult {
  weeksAvailable: number;
  requiredWeeklyLbs: number;
  isAggressive: boolean; // > 2 lbs/week is outside typical safe recommendations
  isPastDate: boolean;
}

export function calculateRequiredRate(
  startingWeightLbs: number,
  goalWeightLbs: number,
  goalDateIso: string
): RequiredRateResult | null {
  // new Date(goalDateIso) on a date-only "YYYY-MM-DD" string parses as
  // UTC midnight — comparing that against a real local "now" below can
  // be off by up to a day depending on timezone, exactly what
  // parseLocalDate exists elsewhere in this app to prevent.
  const goalDate = parseLocalDate(goalDateIso);
  if (isNaN(goalDate.getTime())) return null;

  const now = new Date();
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const weeksAvailable = (goalDate.getTime() - now.getTime()) / msPerWeek;

  if (weeksAvailable <= 0) {
    return { weeksAvailable: 0, requiredWeeklyLbs: 0, isAggressive: false, isPastDate: true };
  }

  const totalChange = Math.abs(goalWeightLbs - startingWeightLbs);
  const requiredWeeklyLbs = totalChange / weeksAvailable;

  return {
    weeksAvailable,
    requiredWeeklyLbs,
    isAggressive: requiredWeeklyLbs > 2,
    isPastDate: false,
  };
}

/**
 * Translates the required pace into a plain-language note about how
 * rigorous workouts/eating probably need to be — informational framing,
 * not a specific numeric diet prescription (that stays out of scope,
 * consistent with how this app avoids prescriptive nutrition advice).
 */
export function describeRigor(result: RequiredRateResult): string {
  if (result.isPastDate) return "That goal date has already passed — worth picking a new one whenever you're ready.";
  if (result.requiredWeeklyLbs < 0.25) return 'A relaxed pace. Consistency matters more than intensity here.';
  if (result.requiredWeeklyLbs <= 1) return 'A steady, typical pace — moderate consistency in workouts and eating should get you there.';
  if (result.requiredWeeklyLbs <= 2) return 'A brisk pace — this likely needs fairly consistent workouts and attention to eating most days.';
  return "That pace is faster than what's generally considered sustainable (2+ lbs/week). Consider a later date or a smaller goal — this isn't something to push hard for.";
}
