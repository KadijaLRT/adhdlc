import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';

export interface WeightEntry {
  date: string;
  weightLbs: number;
}

export type MeasurementSite = 'chest' | 'waist' | 'hips' | 'arms' | 'thighs' | 'neck';

export interface MeasurementEntry {
  date: string;
  site: MeasurementSite;
  inches: number;
}

export interface BodyProgressState {
  weightLog: WeightEntry[];
  measurementLog: MeasurementEntry[];
  weightGoalLbs: number | null;
  weightGoalDate: string | null; // ISO date
}

export interface BodyProgressSlice extends BodyProgressState {
  logWeight: (weightLbs: number) => Promise<void>;
  logMeasurement: (site: MeasurementSite, inches: number) => Promise<void>;
  setWeightGoal: (goalLbs: number | null, goalDate?: string | null) => Promise<void>;
  importWeightEntries: (entries: WeightEntry[]) => Promise<void>;
}

const persist = createWriteGuard(async (state: BodyProgressState) => {
  const repo = await getRepository();
  await repo.saveBodyProgressState(state);
});

function currentState(get: () => BodyProgressState): BodyProgressState {
  return {
    weightLog: get().weightLog || [],
    measurementLog: get().measurementLog || [],
    weightGoalLbs: get().weightGoalLbs ?? null,
    weightGoalDate: get().weightGoalDate ?? null,
  };
}

function today(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

export const createBodyProgressSlice: StateCreator<BodyProgressSlice> = (set, get) => ({
  weightLog: [],
  measurementLog: [],
  weightGoalLbs: null,
  weightGoalDate: null,

  logWeight: async (weightLbs) => {
    const t = today();
    const existing = get().weightLog || [];
    const already = existing.some((w) => w.date === t);
    const next = already
      ? existing.map((w) => (w.date === t ? { date: t, weightLbs } : w))
      : [...existing, { date: t, weightLbs }];
    const nextState = { ...currentState(get), weightLog: next };
    set(nextState);
    await persist(nextState);
  },

  logMeasurement: async (site, inches) => {
    const t = today();
    const existing = get().measurementLog || [];
    const already = existing.some((m) => m.date === t && m.site === site);
    const next = already
      ? existing.map((m) => (m.date === t && m.site === site ? { date: t, site, inches } : m))
      : [...existing, { date: t, site, inches }];
    const nextState = { ...currentState(get), measurementLog: next };
    set(nextState);
    await persist(nextState);
  },

  setWeightGoal: async (weightGoalLbs, goalDate) => {
    // Clearing the goal weight (null) also clears its date — otherwise
    // the old date silently survives in storage and reappears attached
    // to whatever goal weight gets set next, which is exactly the
    // "unrelated stale date reappears" bug this is fixing.
    const nextWeightGoalDate = weightGoalLbs === null ? null : (goalDate ?? currentState(get).weightGoalDate);
    const nextState = { ...currentState(get), weightGoalLbs, weightGoalDate: nextWeightGoalDate };
    set(nextState);
    await persist(nextState);
  },

  // For bulk historical import (Apple Health), not the daily manual
  // logger. Two things logWeight would get wrong for this: it always
  // writes to today's date regardless of the entry's real date (fine
  // for "log today," wrong for importing history — every imported
  // entry would collapse onto one "today" row), and calling it once
  // per entry means one full-state localStorage write per entry, which
  // gets slow and risks hitting storage limits on a large import.
  // This does one date-correct merge and one write for the whole batch.
  importWeightEntries: async (entries) => {
    const existingByDate = new Map((get().weightLog || []).map((w) => [w.date, w]));
    for (const entry of entries) {
      if (entry?.date && typeof entry.weightLbs === 'number') existingByDate.set(entry.date, entry);
    }
    const next = Array.from(existingByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const nextState = { ...currentState(get), weightLog: next };
    set(nextState);
    await persist(nextState);
  },
});
