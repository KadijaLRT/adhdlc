import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { RoutineStreak } from './types';
import type { MilestoneSlice } from './milestoneSlice';
import type { RpgSlice } from './rpgSlice';

export interface StreakSlice {
  streaks: RoutineStreak[];
  recordRoutineCompletion: (routineId: string) => Promise<{ isRecovery: boolean }>;
  useStreakFreeze: (routineId: string) => Promise<void>;
}

const persist = createWriteGuard(async (streaks: RoutineStreak[]) => {
  const repo = await getRepository();
  await repo.saveStreaks(streaks || []);
});

function today(): string { return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(); }

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.round(Math.abs(a - b) / (1000 * 60 * 60 * 24));
}

// Forgiving system: a missed day never resets count to zero, it simply
// does not increment. Streaks degrade gracefully, never punitively.
// Coming back after a real gap is treated as its own moment worth
// celebrating, not just a routine completion like any other.
export const createStreakSlice: StateCreator<
  StreakSlice & MilestoneSlice & RpgSlice, [], [], StreakSlice
> = (set, get) => ({
  streaks: [],

  recordRoutineCompletion: async (routineId) => {
    // Bug fix: today() used to be called four separate times across
    // this function — if execution genuinely straddled a midnight
    // boundary between calls (a slow/backgrounded device, astronomically
    // rare but not impossible), the "already completed today" check,
    // the recovery calculation, and the actual stored date could each
    // see a different "today," producing an inconsistent result.
    // Snapshotting it once means the whole function operates on one
    // single, consistent notion of "today."
    const todayStr = today();
    const existing = (get().streaks || []).find((s) => s.routineId === routineId);
    // Bug fix: this used to unconditionally increment count and award
    // XP every time it was called — RoutinesScreen's auto-complete
    // path (checking the last remaining step) and RoutineRunner's
    // finish-the-last-step path could both call this for a routine
    // already completed today (e.g. unchecking and rechecking the
    // final step, or finishing via the runner after already
    // completing it through the checklist). Same category of bug the
    // task-completion code already guards against via rewardedAt —
    // this is the routine-streak equivalent: already-completed-today
    // is a no-op, not a second reward.
    const alreadyCompletedToday = existing?.lastCompletedDate === todayStr;
    if (alreadyCompletedToday) return { isRecovery: false };

    const isRecovery = !!(existing?.lastCompletedDate && daysBetween(existing.lastCompletedDate, todayStr) >= 2);

    const next = existing
      ? (get().streaks || []).map((s) => s.routineId === routineId
          ? { ...s, count: s.count + 1, lastCompletedDate: todayStr, isFrozen: false } : s)
      : [...(get().streaks || []), { routineId, count: 1, lastCompletedDate: todayStr, freezesAvailable: 2, isFrozen: false }];
    set({ streaks: next });
    await persist(next);
    await get().incrementMilestone('routine_completed');
    await get().awardProgress('confidence', isRecovery ? 12 : 8, 4);
    return { isRecovery };
  },

  useStreakFreeze: async (routineId) => {
    const next = (get().streaks || []).map((s) =>
      s.routineId === routineId && s.freezesAvailable > 0
        ? { ...s, isFrozen: true, freezesAvailable: s.freezesAvailable - 1 } : s
    );
    set({ streaks: next });
    await persist(next);
  },
});
