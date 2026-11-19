import type { AssignmentSubStep } from '@/store/slices/schoolSlice';
import { parseLocalDate, toLocalDateString } from '@/shared/formatDate';

/**
 * Distributes sub-steps evenly across the days between today and the
 * due date, so "Write 10-page paper" becomes concrete daily chunks
 * instead of one intimidating due-date deadline. If there's only one
 * day (or the due date has passed), everything lands on today — never
 * spread into the past.
 */
export function spreadStepsAcrossDays(subSteps: AssignmentSubStep[], dueDate: string): AssignmentSubStep[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsedDue = dueDate ? parseLocalDate(dueDate) : new Date(today);
  const due = isNaN(parsedDue.getTime()) ? new Date(today) : parsedDue;
  due.setHours(0, 0, 0, 0);

  const totalDays = Math.max(1, Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const stepCount = (subSteps || []).length || 1;
  const daysPerStep = Math.max(1, Math.floor(totalDays / stepCount));

  return (subSteps || []).map((step, index) => {
    const dayOffset = Math.min(index * daysPerStep, totalDays - 1);
    const date = new Date(today);
    date.setDate(today.getDate() + Math.max(0, dayOffset));
    return { ...step, suggestedDate: toLocalDateString(date) };
  });
}

export function groupStepsByDate(subSteps: AssignmentSubStep[]): { date: string; steps: AssignmentSubStep[] }[] {
  const map = new Map<string, AssignmentSubStep[]>();
  for (const step of subSteps || []) {
    const key = step.suggestedDate || 'unscheduled';
    const list = map.get(key) || [];
    list.push(step);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, steps]) => ({ date, steps }));
}
