import { useCallback } from 'react';
import { useAppStore, selectFitnessPreferences } from '@/store/index';
import { ALL_CORRECTIVE_MODES, RESTRICTION_IDS, type CorrectiveMode } from '@/content/restrictions';

const EMPTY: string[] = [];

/**
 * Reads and saves the person's restrictions. Saving always passes the fields
 * FitnessPreferences requires (equipment, primaryGoal) so a first save from a
 * person who never filled in fitness preferences still produces a valid record.
 */
export function useRestrictionPrefs() {
  const prefs = useAppStore(selectFitnessPreferences);
  const setFitnessPreferences = useAppStore((s) => s.setFitnessPreferences);

  const stored = prefs?.restrictions;
  // Drop ids from an older list so a removed restriction can never linger in the UI.
  const restrictions = (stored || EMPTY).filter((id) => RESTRICTION_IDS.includes(id));
  const correctiveModes: CorrectiveMode[] = prefs?.correctiveModes ?? [...ALL_CORRECTIVE_MODES];

  // Always reads the latest saved value at tap time, so two quick taps cannot overwrite each other with a stale list.
  const save = useCallback(
    async (change: (current: { restrictions: string[]; correctiveModes: CorrectiveMode[] }) => { restrictions?: string[]; correctiveModes?: CorrectiveMode[] }) => {
      const latest = useAppStore.getState().fitnessPreferences;
      const current = {
        restrictions: (latest?.restrictions || EMPTY).filter((id) => RESTRICTION_IDS.includes(id)),
        correctiveModes: latest?.correctiveModes ?? [...ALL_CORRECTIVE_MODES],
      };
      await setFitnessPreferences({
        equipment: latest?.equipment || ['bodyweight'],
        primaryGoal: latest?.primaryGoal ?? null,
        ...change(current),
      });
    },
    [setFitnessPreferences],
  );

  const toggleRestriction = useCallback(
    (id: string) =>
      save((cur) => ({ restrictions: cur.restrictions.includes(id) ? cur.restrictions.filter((r) => r !== id) : [...cur.restrictions, id] })),
    [save],
  );

  const toggleMode = useCallback(
    (mode: CorrectiveMode) =>
      save((cur) => ({ correctiveModes: cur.correctiveModes.includes(mode) ? cur.correctiveModes.filter((m) => m !== mode) : [...cur.correctiveModes, mode] })),
    [save],
  );

  return { restrictions, correctiveModes, toggleRestriction, toggleMode };
}
