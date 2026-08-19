import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { EnergyLevel, EnergyLogEntry } from './types';
import type { UiSlice } from './uiSlice';

export interface EnergySlice {
  energyLogs: EnergyLogEntry[];
  logEnergyForToday: (level: EnergyLevel, note?: string) => Promise<void>;
}

function today(): string { return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(); }

const persistLogs = createWriteGuard(async (logs: EnergyLogEntry[]) => {
  const repo = await getRepository();
  await repo.saveEnergyLogs(logs);
});

export const createEnergySlice: StateCreator<
  EnergySlice & UiSlice, [], [], EnergySlice
> = (set, get) => ({
  energyLogs: [],

  logEnergyForToday: async (level, note) => {
    const t = today();
    const existing = get().energyLogs || [];
    const already = existing.some((l) => l.date === t);
    const next = already
      ? existing.map((l) => (l.date === t ? { date: t, energyLevel: level, note } : l))
      : [...existing, { date: t, energyLevel: level, note }];

    set({ energyLogs: next, energyLevel: level });
    await persistLogs(next);

    // A low-energy check-in is a soft signal, not a diagnosis or a
    // forced state; the user can dismiss the simplified view anytime.
    if (level === 'low') get().setOverwhelmed(true);
  },
});
