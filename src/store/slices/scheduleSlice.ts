import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';

export interface ScheduleItem {
  id: string;
  label: string;
  refId?: string; // optional link back to a Task or Routine id
  refKind?: 'task' | 'routine' | 'freeform';
  date?: string; // YYYY-MM-DD — items saved before this existed are treated as today's
  time?: string; // "HH:MM", 24hr — left blank means "Anytime today," not locked to a specific time
  isDone: boolean;
}

export interface ScheduleState {
  scheduleItems: ScheduleItem[];
  runningBehindMinutes: number;
}

export interface ScheduleSlice extends ScheduleState {
  addScheduleItem: (item: Omit<ScheduleItem, 'isDone'>) => Promise<void>;
  removeScheduleItem: (id: string) => Promise<void>;
  toggleScheduleItemDone: (id: string) => Promise<void>;
  shiftRemainingSchedule: (minutes: number) => Promise<void>;
}

function addMinutesToTime(time: string, minutes: number): { time: string; dayOffset: number } {
  const [h, m] = (time || '00:00').split(':').map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const newH = Math.floor(wrapped / 60);
  const newM = wrapped % 60;
  // Bug fix: this used to only return the wrapped time string, never
  // how many days that wrap actually crossed — shifting a 23:45 item
  // by 30 minutes correctly produced "00:15", but the item's `date`
  // field was left untouched, so it stayed filed under today even
  // though 00:15 is actually tomorrow. bucketForTime then read hour 0
  // as "morning" and displayed it at the top of today's morning list,
  // as if due first thing today rather than in 30 minutes, late
  // tonight. dayOffset lets the caller correct the date to match.
  const dayOffset = Math.floor(total / 1440);
  return { time: `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`, dayOffset };
}

function shiftDateString(dateStr: string, dayOffset: number): string {
  if (!dayOffset) return dateStr;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const persist = createWriteGuard(async (state: ScheduleState) => {
  const repo = await getRepository();
  await repo.saveScheduleState(state);
});

function currentState(get: () => ScheduleState): ScheduleState {
  return {
    scheduleItems: get().scheduleItems || [],
    runningBehindMinutes: get().runningBehindMinutes || 0,
  };
}

export const createScheduleSlice: StateCreator<ScheduleSlice> = (set, get) => ({
  scheduleItems: [],
  runningBehindMinutes: 0,

  addScheduleItem: async (item) => {
    const next = [...(get().scheduleItems || []), { ...item, isDone: false }]
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '99:99').localeCompare(b.time || '99:99'));
    const nextState = { ...currentState(get), scheduleItems: next };
    set(nextState);
    await persist(nextState);
  },

  removeScheduleItem: async (id) => {
    const nextState = { ...currentState(get), scheduleItems: (get().scheduleItems || []).filter((i) => i.id !== id) };
    set(nextState);
    await persist(nextState);
  },

  toggleScheduleItemDone: async (id) => {
    const next = (get().scheduleItems || []).map((i) => (i.id === id ? { ...i, isDone: !i.isDone } : i));
    const nextState = { ...currentState(get), scheduleItems: next };
    set(nextState);
    await persist(nextState);
  },

  // "I'm running behind": shifts every not-yet-done, time-specific item
  // later by the given number of minutes. Anytime items have no clock
  // position to shift, so they're left alone — running late doesn't
  // mean anything for something that was never tied to a time.
  // Completed items are never touched either.
  shiftRemainingSchedule: async (minutes) => {
    const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    // Absent date means "today" (see ScheduleItem's own comment) — both
    // cases need to match here, or an item saved before `date` existed
    // would be silently excluded from "I'm running behind today."
    const isToday = (i: ScheduleItem) => !i.date || i.date === todayStr;
    const next = (get().scheduleItems || [])
      .map((i) => {
        if (i.isDone || !i.time || !isToday(i)) return i;
        const { time, dayOffset } = addMinutesToTime(i.time, minutes);
        // isToday(i) above already established i.date is either unset
        // (meaning today) or explicitly todayStr — shiftDateString
        // needs a real starting date to shift from either way.
        const nextDate = dayOffset ? shiftDateString(i.date || todayStr, dayOffset) : i.date;
        return { ...i, time, date: nextDate };
      })
      // Sort by date then time, matching addScheduleItem's own
      // ordering — sorting by time alone previously dropped the date
      // comparison entirely and could scramble multi-day ordering
      // (e.g. a shifted 23:30 today sorting after an unrelated 08:00
      // three days from now).
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '99:99').localeCompare(b.time || '99:99'));
    const nextState = { scheduleItems: next, runningBehindMinutes: (get().runningBehindMinutes || 0) + minutes };
    set(nextState);
    await persist(nextState);
  },
});
