import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { ProgramDefinition } from '@/content/programs';

export interface CustomProgramSlice {
  customPrograms: ProgramDefinition[];
  addCustomProgram: (program: ProgramDefinition) => Promise<void>;
  removeCustomProgram: (id: string) => Promise<void>;
}

const persist = createWriteGuard(async (programs: ProgramDefinition[]) => {
  const repo = await getRepository();
  await repo.saveCustomPrograms(programs);
});

/**
 * AI-generated programs, kept separate from the static PROGRAMS array
 * (content/programs.ts) rather than merged into it — that array is
 * bundled app code, not something a runtime action should be able to
 * mutate; a generated program is real user data instead, matching how
 * every other user-created thing in this app (custom meals, gyms) gets
 * its own slice rather than editing shipped content in place.
 * ProgramsScreen.tsx / WorkoutsHome.tsx look up an active program by
 * checking both PROGRAMS and customPrograms — see getProgramById in
 * content/programs.ts, the single place that merge happens.
 */
export const createCustomProgramSlice: StateCreator<CustomProgramSlice> = (set, get) => ({
  customPrograms: [],

  addCustomProgram: async (program) => {
    const next = [...(get().customPrograms || []), program];
    set({ customPrograms: next });
    await persist(next);
  },

  removeCustomProgram: async (id) => {
    const next = (get().customPrograms || []).filter((p) => p.id !== id);
    set({ customPrograms: next });
    await persist(next);
  },
});
