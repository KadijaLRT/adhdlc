import type { ScheduleItem } from '@/store/slices/scheduleSlice';
import type { Task } from '@/store/slices/types';
import { MOTIVATOR_OPTIONS } from '@/content/toolkitContent';
import { cancelAllLocalNotifications, scheduleLocalNotification, scheduleDailyLocalNotification } from './notificationService';

// ScheduleItem is already the one place medication reminders, task-linked
// reminders, and freeform reminders all live (see final.tsx's onboarding
// flow, which turns medication times into real ScheduleItems, and
// ScheduleItem.refKind === 'task' for task-linked entries) — so syncing
// notifications from this single list covers meds, tasks, schedule, and
// reminders all at once, without a second parallel data source.

function notificationIdForItem(item: ScheduleItem): string {
  return `schedule-${item.id}`;
}

function todayLocalDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * "Anytime today" items (no time) have no clock position to notify at,
 * so they're intentionally skipped — a notification for an anytime item
 * would just be an arbitrary, meaningless time.
 */
function buildTriggerDate(item: ScheduleItem): Date | null {
  if (!item.time) return null;
  const dateStr = item.date || todayLocalDateString();
  const dateParts = dateStr.split('-').map(Number);
  const timeParts = item.time.split(':').map(Number);
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  if (year === undefined || month === undefined || day === undefined || hour === undefined || minute === undefined) return null;
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * Task-linked reminders get PINCH-flavored copy when the task has a
 * motivator tag — a small, honest nudge rather than a generic ping,
 * using the same concrete "quick try" language as the stuck-flow PINCH
 * tool. Everything else (medication, freeform reminders) gets plain,
 * pressure-free reminder copy, consistent with this app's tone
 * guidelines (no guilt, no urgency language) in src/content/copy.ts.
 */
function buildNotificationCopy(item: ScheduleItem, tasks: Task[]): { title: string; body: string } {
  if (item.refKind === 'task' && item.refId) {
    const task = tasks.find((t) => t.id === item.refId);
    const motivatorId = task?.motivators?.[0];
    const motivator = motivatorId ? MOTIVATOR_OPTIONS.find((option) => option.id === motivatorId) : null;
    if (motivator) {
      return { title: `${motivator.emoji} ${item.label}`, body: motivator.quickTry };
    }
    return { title: item.label, body: "It's time — no pressure, just begin." };
  }
  return { title: item.label, body: "It's time." };
}

/**
 * Full cancel-and-rebuild rather than a diff against what was
 * previously scheduled: schedule items get edited, reordered, and
 * completed often, and correctly diffing that against a stale
 * previously-scheduled set is far more failure-prone than always
 * starting clean. There's no server cost to a full rebuild here (unlike
 * a real push backend), so simplicity wins.
 *
 * Called with `enabled: false` to cancel everything without
 * rescheduling — used when the person turns notifications off.
 */
export async function syncScheduledNotifications(
  scheduleItems: ScheduleItem[],
  tasks: Task[],
  enabled: boolean
): Promise<void> {
  await cancelAllLocalNotifications();
  if (!enabled) return;

  for (const item of scheduleItems || []) {
    if (item.isDone) continue;
    if (!item.time) continue; // "Anytime today" — no clock position to notify at
    const [hourStr, minuteStr] = item.time.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
    const { title, body } = buildNotificationCopy(item, tasks || []);

    if (!item.date) {
      // No specific date — created without one (medication reminders,
      // most notably) means "every day," not "just once."
      // eslint-disable-next-line no-await-in-loop
      await scheduleDailyLocalNotification({ id: notificationIdForItem(item), title, body, hour, minute });
      continue;
    }

    const triggerDate = buildTriggerDate(item);
    if (!triggerDate || triggerDate.getTime() <= Date.now()) continue;
    // eslint-disable-next-line no-await-in-loop -- intentionally sequential so a failure on one item doesn't race with the identical id being reused elsewhere
    await scheduleLocalNotification({ id: notificationIdForItem(item), title, body, triggerDate });
  }
}
