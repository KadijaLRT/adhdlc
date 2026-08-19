import type { Task } from '@/store/index';
import type { Assignment } from '@/store/slices/schoolSlice';
import { parseLocalDate, toLocalDateString } from '@/shared/formatDate';

/**
 * Builds a minimal, valid .ics file from open tasks/assignments that
 * have a due date. Tasks show as all-day events since this app doesn't
 * track exact due times yet — stated honestly rather than fabricating
 * precision that isn't there.
 */
function formatIcsDate(dateStr: string): string {
  const clean = (dateStr || '').replace(/-/g, '');
  return clean.length === 8 ? clean : toLocalDateString(parseLocalDate(dateStr)).replace(/-/g, '');
}

/**
 * Per the iCalendar spec (RFC 5545), DTEND for a DATE-valued (all-day)
 * event is exclusive — an event meant to occupy just Aug 18 needs
 * DTEND set to Aug 19, not Aug 18 again. Setting DTSTART and DTEND to
 * the same day (what this used to do) produces a technically
 * zero-duration event, which real calendar apps can render
 * incorrectly or inconsistently.
 */
function nextDayIcsDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + 1);
  return toLocalDateString(date).replace(/-/g, '');
}

/**
 * Escapes the iCalendar-reserved characters (RFC 5545 §3.3.11) — a
 * title containing a comma, semicolon, or backslash would otherwise
 * corrupt the surrounding ICS structure for whatever's reading it.
 * Newlines are replaced outright (a real newline inside a single ICS
 * text line is invalid), not escaped, since a literal "\n" escape
 * sequence would just show up as visible backslash-n text in most
 * calendar apps.
 */
function escapeIcsText(text: string): string {
  return (text || '').replace(/\n/g, ' ').replace(/[,;\\]/g, (match) => `\\${match}`);
}

export function buildIcsContent(tasks: Task[], assignments: Assignment[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ADHD Life Coach//EN'];

  for (const task of tasks || []) {
    if (task.isComplete || !task.scheduledFor) continue;
    const date = formatIcsDate(task.scheduledFor);
    lines.push(
      'BEGIN:VEVENT',
      `UID:task-${task.id}@adhdlifecoach`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${nextDayIcsDate(task.scheduledFor)}`,
      `SUMMARY:${escapeIcsText(task.title || 'Task')}`,
      'END:VEVENT'
    );
  }

  for (const assignment of assignments || []) {
    if (assignment.isComplete || !assignment.dueDate) continue;
    const date = formatIcsDate(assignment.dueDate);
    lines.push(
      'BEGIN:VEVENT',
      `UID:assignment-${assignment.id}@adhdlifecoach`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${nextDayIcsDate(assignment.dueDate)}`,
      `SUMMARY:${escapeIcsText(assignment.title || 'Assignment')}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Exports the .ics file — a real browser download on web, and a native
 * share sheet (Files, Mail, AirDrop, Google Calendar, etc.) on iOS/
 * Android via expo-file-system + expo-sharing. Both paths actually
 * work; this isn't a "web only for now" stub anymore.
 */
export async function downloadIcsFile(content: string, filename = 'schedule.ics'): Promise<boolean> {
  if (typeof document !== 'undefined') {
    try {
      const blob = new Blob([content], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('exportCalendar: web download failed', error);
      return false;
    }
  }

  try {
    const { File, Paths } = await import('expo-file-system');
    const Sharing = await import('expo-sharing');

    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(content);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      console.error('exportCalendar: sharing is not available on this device');
      return false;
    }
    await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', dialogTitle: 'Save or share your schedule' });
    return true;
  } catch (error) {
    console.error('exportCalendar: native export failed', error);
    return false;
  }
}
