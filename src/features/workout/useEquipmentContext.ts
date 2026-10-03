import { useMemo } from 'react';
import { useAppStore, selectFitnessPreferences, selectGyms, selectActiveGymId } from '@/store/index';
import { buildEquipmentContext, type EquipmentContext } from './exerciseAvailability';

/** Equipment rules for the active gym (or fitness preferences when there is no gym). Memoized so it is stable between renders. */
export function useEquipmentContext(): EquipmentContext {
  const gyms = useAppStore(selectGyms);
  const activeGymId = useAppStore(selectActiveGymId);
  const prefsEquipment = useAppStore(selectFitnessPreferences)?.equipment;
  return useMemo(
    () => buildEquipmentContext((gyms || []).find((g) => g.id === activeGymId) || null, prefsEquipment),
    [gyms, activeGymId, prefsEquipment]
  );
}
