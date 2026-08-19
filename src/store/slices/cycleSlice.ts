import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { CycleLogEntry } from './types';

export interface CycleSlice {
  cycleTrackingEnabled: boolean;
  cycleLogs: CycleLogEntry[];
  setCycleTrackingEnabled: (enabled: boolean) => Promise<void>;
  logCycleForToday: (phase: CycleLogEntry['phase'], note?: string) => Promise<void>;
  logCycleForDate: (date: string, phase: CycleLogEntry['phase'], note?: string) => Promise<void>;
  importCycleLogs: (entries: CycleLogEntry[]) => Promise<void>;
}

function today(): string { return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(); }

function upsertLog(existing: CycleLogEntry[], date: string, phase: CycleLogEntry['phase'], note?: string): CycleLogEntry[] {
  const already = existing.some((l) => l.date === date);
  return already
    ? existing.map((l) => (l.date === date ? { date, phase, note } : l))
    : [...existing, { date, phase, note }];
}

// Two independent keys are persisted here (the toggle and the logs),
// so each needs its own write-ordering guard — a race between two
// fast log writes is a separate concern from a race involving the
// toggle, and chaining them onto one shared guard would make an
// unrelated toggle-write block on (or get dropped by) a log-write.
const persistToggle = createWriteGuard(async (enabled: boolean) => {
  const repo = await getRepository();
  await repo.saveCycleTrackingEnabled(enabled);
});
const persistLogs = createWriteGuard(async (logs: CycleLogEntry[]) => {
  const repo = await getRepository();
  await repo.saveCycleLogs(logs);
});

// Opt-in, off by default. Never assumed or forced on any user.
export const createCycleSlice: StateCreator<CycleSlice> = (set, get) => ({
  cycleTrackingEnabled: false,
  cycleLogs: [],

  // Previously this only called set() — nothing ever wrote it to disk, so
  // the toggle silently reverted to "off" on every reload no matter how
  // many times someone turned it on. Now mirrors the same set-then-persist
  // pattern every other action in this slice already uses.
  setCycleTrackingEnabled: async (cycleTrackingEnabled) => {
    set({ cycleTrackingEnabled });
    await persistToggle(cycleTrackingEnabled);
  },

  logCycleForToday: async (phase, note) => {
    const next = upsertLog(get().cycleLogs || [], today(), phase, note);
    set({ cycleLogs: next });
    await persistLogs(next);
  },

  // Separate from logCycleForToday specifically because that action
  // always writes to today's date regardless of what's passed to it —
  // fine for a daily manual check-in, but wrong for importing real
  // historical dates from Apple Health, which needs to write to the
  // actual date each record occurred on.
  logCycleForDate: async (date, phase, note) => {
    const next = upsertLog(get().cycleLogs || [], date, phase, note);
    set({ cycleLogs: next });
    await persistLogs(next);
  },

  // For bulk historical import (Apple Health). One merge, one write —
  // not one localStorage round-trip per date, which is what the
  // per-entry loop was doing before and could bog down or fail outright
  // on a large export with hundreds of period/ovulation records.
  importCycleLogs: async (entries) => {
    const existingByDate = new Map((get().cycleLogs || []).map((l) => [l.date, l]));
    for (const entry of entries) {
      if (entry?.date) existingByDate.set(entry.date, entry);
    }
    const next = Array.from(existingByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    set({ cycleLogs: next });
    await persistLogs(next);
  },
});
