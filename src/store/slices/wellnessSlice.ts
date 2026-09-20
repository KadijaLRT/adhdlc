import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { WellnessPreferences } from './types';

export interface WellnessSlice {
  wellnessPreferences: WellnessPreferences;
  setWellnessPreferences: (prefs: Partial<WellnessPreferences>) => Promise<void>;
}

const persist = createWriteGuard(async (prefs: WellnessPreferences) => {
  const repo = await getRepository();
  await repo.saveWellnessPreferences(prefs);
});

// Off by default; never overrides core scheduling or nutrition logic.
export const createWellnessSlice: StateCreator<WellnessSlice> = (set, get) => ({
  wellnessPreferences: { bloodTypeEnabled: false, bloodType: null },

  setWellnessPreferences: async (prefs) => {
    const next = { ...(get().wellnessPreferences || {}), ...prefs } as WellnessPreferences;
    set({ wellnessPreferences: next });
    await persist(next);
  },
});
