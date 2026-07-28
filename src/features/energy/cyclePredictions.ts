import type { CycleLogEntry, EnergyLogEntry, StressLogEntry, EnergyLevel } from '@/store/slices/types';
import { parseLocalDate, toLocalDateString } from '@/shared/formatDate';

/**
 * Groups consecutive menstrual-flagged dates into distinct periods and
 * returns each period's first date. A date starts a new period if the
 * day before it wasn't also logged as menstrual — this is what turns a
 * pile of daily flow records into "this many periods happened," rather
 * than counting every single flow-day as its own cycle.
 */
export function getPeriodStartDates(cycleLogs: CycleLogEntry[]): string[] {
  const menstrualDates = (cycleLogs || [])
    .filter((l) => l.phase === 'menstrual')
    .map((l) => l.date)
    .sort();

  const starts: string[] = [];
  for (let i = 0; i < menstrualDates.length; i++) {
    const current = menstrualDates[i];
    if (!current) continue;
    const prev = menstrualDates[i - 1];
    if (!prev) {
      starts.push(current);
      continue;
    }
    const gapDays = (new Date(current).getTime() - new Date(prev).getTime()) / 86400000;
    if (gapDays > 1) starts.push(current);
  }
  return starts;
}

/** Average gap between period start dates, in days. Null if fewer than 2 periods logged. */
export function getAverageCycleLength(periodStarts: string[]): number | null {
  if (periodStarts.length < 2) return null;
  let totalDays = 0;
  let gaps = 0;
  for (let i = 1; i < periodStarts.length; i++) {
    const current = periodStarts[i];
    const prev = periodStarts[i - 1];
    if (!current || !prev) continue;
    totalDays += (new Date(current).getTime() - new Date(prev).getTime()) / 86400000;
    gaps += 1;
  }
  return gaps > 0 ? Math.round(totalDays / gaps) : null;
}

/** Predicted next period start date, or null if there's not enough history to estimate from. */
export function getPredictedNextPeriod(periodStarts: string[], averageCycleLength: number | null): string | null {
  if (!periodStarts.length || !averageCycleLength) return null;
  const lastStart = periodStarts[periodStarts.length - 1];
  if (!lastStart) return null;
  const predicted = parseLocalDate(lastStart);
  predicted.setDate(predicted.getDate() + averageCycleLength);
  return toLocalDateString(predicted);
}

const LEVEL_SCORE: Record<EnergyLevel, number> = { low: 0, medium: 1, high: 2 };
const LEVEL_LABEL: EnergyLevel[] = ['low', 'medium', 'high'];

export interface PhaseCorrelation {
  phase: CycleLogEntry['phase'];
  daysLogged: number;
  averageEnergy: EnergyLevel | null;
  averageStress: EnergyLevel | null;
}

/**
 * Cross-references logged cycle phases against the same-date energy
 * and stress check-ins that already exist elsewhere in the app —
 * there's no dedicated mood field anywhere in this app, so these are
 * the closest real, already-collected signals to correlate against.
 * Only a day that has BOTH a cycle log and an energy/stress log for
 * that exact date contributes — no inference or interpolation across
 * gaps, since that would misrepresent a pattern that isn't really
 * there yet.
 *
 * A phase with zero overlapping days is still returned (with nulls),
 * rather than omitted, so the UI can show "not enough data yet" per
 * phase instead of a confusing gap in the list.
 */
export function getPhaseCorrelations(
  cycleLogs: CycleLogEntry[],
  energyLogs: EnergyLogEntry[],
  stressLogs: StressLogEntry[]
): PhaseCorrelation[] {
  const energyByDate = new Map((energyLogs || []).map((l) => [l.date, l.energyLevel]));
  const stressByDate = new Map((stressLogs || []).map((l) => [l.date, l.stressLevel]));
  const phases: CycleLogEntry['phase'][] = ['menstrual', 'follicular', 'ovulation', 'luteal', 'unspecified'];

  return phases.map((phase) => {
    const datesForPhase = (cycleLogs || []).filter((l) => l.phase === phase).map((l) => l.date);
    const energyScores = datesForPhase.map((d) => energyByDate.get(d)).filter((v): v is EnergyLevel => !!v).map((v) => LEVEL_SCORE[v]);
    const stressScores = datesForPhase.map((d) => stressByDate.get(d)).filter((v): v is EnergyLevel => !!v).map((v) => LEVEL_SCORE[v]);
    const avg = (scores: number[]): EnergyLevel | null =>
      scores.length ? (LEVEL_LABEL[Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)] ?? null) : null;
    return {
      phase,
      daysLogged: datesForPhase.length,
      averageEnergy: avg(energyScores),
      averageStress: avg(stressScores),
    };
  });
}
