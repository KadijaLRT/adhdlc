import type { Task, EnergyLevel, TaskPriority } from '@/store/index';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  critical: 3,
  important: 2,
  nice: 1,
};

const ENERGY_RANK: Record<EnergyLevel, number> = { low: 0, medium: 1, high: 2 };

// A task tagged with an available PINCH motivator (play, interest,
// novelty, connection, urgency) is more likely to actually get started
// than an equally-important one with no lever to pull. Deliberately
// small relative to a full priority step, so this only breaks ties or
// nudges among similarly-ranked tasks — it never lets a "nice to have"
// with a fun tag jump ahead of a critical one with none.
const MOTIVATOR_BONUS = 0.4;

/**
 * Picks exactly one task to surface as "what should I do next," so the
 * person never has to make that decision themselves. Priority matters
 * most; a task requiring more energy than the person currently has is
 * deprioritized but never excluded outright, since sometimes the
 * high-effort thing is still the right one to tackle. Deterministic
 * given the same inputs — no randomness, so re-opening the app doesn't
 * shuffle the recommendation for no reason.
 */
export function suggestNextTask(tasks: Task[], currentEnergyLevel: EnergyLevel): Task | null {
  const incomplete = (tasks || []).filter((t) => !t?.isComplete);
  if (!incomplete.length) return null;

  const scored = incomplete.map((task) => {
    const priorityScore = PRIORITY_WEIGHT[task.priority || 'nice'];
    const energyMismatch = Math.abs(ENERGY_RANK[task.energyRequired || 'medium'] - ENERGY_RANK[currentEnergyLevel]);
    const energyPenalty = energyMismatch * 0.5;
    const motivatorBonus = (task.motivators?.length || 0) > 0 ? MOTIVATOR_BONUS : 0;
    return { task, score: priorityScore - energyPenalty + motivatorBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.task || null;
}
