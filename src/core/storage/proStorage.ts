import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProPersistedState } from './proStorageTypes';

export type { ProPersistedState } from './proStorageTypes';

// Native (iOS/Android) storage for Pro status. Kept apart from the
// main TaskRepository on purpose: the main store is what "Export my
// data" dumps, and a purchase token shouldn't end up in that export.
const KEY = 'adhd-life-coach:pro';

export async function loadProState(): Promise<ProPersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProPersistedState) : null;
  } catch (error) {
    console.error('proStorage: failed to read', error);
    return null;
  }
}

export async function saveProState(state: ProPersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    console.error('proStorage: failed to write', error);
  }
}
