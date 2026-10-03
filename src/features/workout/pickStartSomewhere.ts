import { WORKOUT_EXERCISES } from '@/content/exercises';
import { UNRESTRICTED, filterAutoPickEntries, type EquipmentContext } from './exerciseAvailability';

/**
 * "Start Somewhere": removes the decision of what to do entirely.
 * Only picks exercises doable with the active gym's (or preferences')
 * equipment. Returns null when nothing fits, and the caller says so.
 */
export function pickStartSomewhereExercise(equipment: EquipmentContext = UNRESTRICTED): { id: string } | null {
  const pool = filterAutoPickEntries(Object.entries(WORKOUT_EXERCISES || {}), equipment);
  if (!pool.length) return null;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return picked ? { id: picked[0] } : null;
}
