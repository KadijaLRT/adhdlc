import type { ProPersistedState } from './proStorageTypes';

export type { ProPersistedState } from './proStorageTypes';

// Web: direct synchronous localStorage, same reasoning as webRepository.ts
// (no async gap for a PWA close to land in).
const KEY = 'adhd-life-coach:pro';

export async function loadProState(): Promise<ProPersistedState | null> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProPersistedState) : null;
  } catch (error) {
    console.error('proStorage: failed to read', error);
    return null;
  }
}

export async function saveProState(state: ProPersistedState): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    console.error('proStorage: failed to write', error);
  }
}
