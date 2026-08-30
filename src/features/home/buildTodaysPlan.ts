import type { Task, Routine, RoutineStreak, EnergyLevel } from '@/store/index';
import { suggestNextTask } from '@/features/tasks/suggestNextTask';

export interface PlanItem {
  id: string;
  label: string;
  kind: 'task' | 'routine' | 'focus';
}

/**
 * Deterministic aggregation across what already exists (tasks, routines)
 * into one ordered "today's plan" — no new AI call, no new data model.
 * Same reasoning as "Start Somewhere" in Workout: the value is in
 * assembling an existing decision, not adding a new one.
 */
export function buildTodaysPlan(
  tasks: Task[],
  routines: Routine[],
  streaks: RoutineStreak[],
  energyLevel: EnergyLevel
): PlanItem[] {
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const plan: PlanItem[] = [];

  const pendingRoutines = (routines || []).filter((r) => {
    const streak = (streaks || []).find((s) => s.routineId === r.id);
    return streak?.lastCompletedDate !== today;
  });

  for (const routine of pendingRoutines.slice(0, 2)) {
    plan.push({ id: routine.id, label: `${routine.emoji} ${routine.title}`, kind: 'routine' });
  }

  const nextTask = suggestNextTask(tasks, energyLevel);
  if (nextTask) {
    plan.push({ id: nextTask.id, label: nextTask.title, kind: 'task' });
  }

  // Bug fix: this used to be added whenever energy wasn't "low",
  // regardless of whether anything else was in the plan — so on a day
  // with no routines and no incomplete tasks, a focus session was the
  // *only* thing shown, with no context for what it even builds toward.
  // Now it only shows up alongside something real to actually apply it
  // to, and its own label says what it earns (Focus skill XP, visible
  // on the Progress screen — see FocusSession.tsx's awardProgress call)
  // so tapping it isn't a mystery.
  if (energyLevel !== 'low' && plan.length > 0) {
    plan.push({ id: 'focus-block', label: 'A focus session, whenever fits — builds your Focus skill', kind: 'focus' });
  }

  return plan;
}
