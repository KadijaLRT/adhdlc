import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { UserProfile } from './types';

export interface ProfileSlice {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const persist = createWriteGuard(async (profile: UserProfile | null) => {
  const repo = await getRepository();
  await repo.saveProfile(profile as UserProfile);
});

// The app never requires an account. This is always the real, immediate,
// fully-offline source of truth; cloud sync (core/supabase) is a
// best-effort, optional layer on top, never a dependency.
export const createProfileSlice: StateCreator<ProfileSlice> = (set) => ({
  profile: null,

  setProfile: async (profile) => {
    set({ profile });
    await persist(profile);
  },

  // Lets someone re-run onboarding intentionally (e.g. to update answers
  // from scratch) without needing to manually clear browser storage.
  // Only clears the profile itself — tasks, streaks, and everything else
  // built up in the app stay exactly as they were.
  clearProfile: async () => {
    set({ profile: null });
    await persist(null);
  },
});
