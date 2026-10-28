import { useMemo } from 'react';
import { useAppStore, selectFitnessPreferences, selectGyms, selectActiveGymId } from '@/store/index';
import { buildEquipmentContext, type EquipmentContext } from './exerciseAvailability';

/** Equipment rules for the active gym (or fitness preferences when there is no gym), plus any saved restrictions. Memoized so it is stable between renders. */
export function useEquipmentContext(): EquipmentContext {
  const gyms = useAppStore(selectGyms);
  const activeGymId = useAppStore(selectActiveGymId);
  const prefs = useAppStore(selectFitnessPreferences);
  const prefsEquipment = prefs?.equipment;
  const restrictions = prefs?.restrictions;
  const correctiveModes = prefs?.correctiveModes;
  return useMemo(
    () => buildEquipmentContext((gyms || []).find((g) => g.id === activeGymId) || null, prefsEquipment, restrictions, correctiveModes),
    [gyms, activeGymId, prefsEquipment, restrictions, correctiveModes]
  );
}
