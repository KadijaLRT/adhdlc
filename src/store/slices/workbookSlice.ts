import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import { generateId } from '@/shared/generateId';

export interface ThoughtReframeEntry {
  id: string;
  date: string;
  thought: string;
  distortion: string | null;
  reframe: string;
}

export interface FrustrationEntry {
  id: string;
  date: string;
  level: number; // 1-10
  trigger: string;
}

export interface SabotageCheckEntry {
  id: string;
  date: string;
  patternIds: string[];
}

export interface WorkbookState {
  thoughtReframes: ThoughtReframeEntry[];
  frustrationEntries: FrustrationEntry[];
  sabotageChecks: SabotageCheckEntry[];
}

export interface WorkbookSlice extends WorkbookState {
  saveThoughtReframe: (thought: string, distortion: string | null, reframe: string) => Promise<void>;
  saveFrustrationEntry: (level: number, trigger: string) => Promise<void>;
  saveSabotageCheck: (patternIds: string[]) => Promise<void>;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const persist = createWriteGuard(async (state: WorkbookState) => {
  const repo = await getRepository();
  await repo.saveWorkbookState(state);
});

/**
 * Bug fix: WorkbookCard.tsx (thought reframe / frustration log /
 * self-sabotage check) previously wrote only to local component
 * state — nothing here was ever saved anywhere. Someone could fill out
 * a full reframe, or log a frustration entry (complete with a
 * "Logged." confirmation message implying it had been saved
 * somewhere), and the moment they navigated away or the app
 * backgrounded, all of it was gone. This is the first time any of the
 * three workbook exercises actually persist.
 */
export const createWorkbookSlice: StateCreator<WorkbookSlice> = (set, get) => ({
  thoughtReframes: [],
  frustrationEntries: [],
  sabotageChecks: [],

  saveThoughtReframe: async (thought, distortion, reframe) => {
    const entry: ThoughtReframeEntry = { id: generateId('reframe'), date: today(), thought, distortion, reframe };
    const next = [...(get().thoughtReframes || []), entry];
    set({ thoughtReframes: next });
    await persist({ thoughtReframes: next, frustrationEntries: get().frustrationEntries, sabotageChecks: get().sabotageChecks });
  },

  saveFrustrationEntry: async (level, trigger) => {
    const entry: FrustrationEntry = { id: generateId('frustration'), date: today(), level, trigger };
    const next = [...(get().frustrationEntries || []), entry];
    set({ frustrationEntries: next });
    await persist({ thoughtReframes: get().thoughtReframes, frustrationEntries: next, sabotageChecks: get().sabotageChecks });
  },

  saveSabotageCheck: async (patternIds) => {
    const entry: SabotageCheckEntry = { id: generateId('sabotage'), date: today(), patternIds };
    const next = [...(get().sabotageChecks || []), entry];
    set({ sabotageChecks: next });
    await persist({ thoughtReframes: get().thoughtReframes, frustrationEntries: get().frustrationEntries, sabotageChecks: next });
  },
});
