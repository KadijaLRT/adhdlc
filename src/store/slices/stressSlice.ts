import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { EnergyLevel, StressLogEntry } from './types';

export interface StressSlice {
  stressLogs: StressLogEntry[];
  logStressForToday: (level: EnergyLevel) => Promise<void>;
}

function today(): string { return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(); }

const persist = createWriteGuard(async (logs: StressLogEntry[]) => {
  const repo = await getRepository();
  await repo.saveStressLogs(logs);
});

export const createStressSlice: StateCreator<StressSlice> = (set, get) => ({
  stressLogs: [],

  logStressForToday: async (level) => {
    const t = today();
    const existing = get().stressLogs || [];
    const already = existing.some((l) => l.date === t);
    const next = already
      ? existing.map((l) => (l.date === t ? { date: t, stressLevel: level } : l))
      : [...existing, { date: t, stressLevel: level }];
    set({ stressLogs: next });
    await persist(next);
  },
});
