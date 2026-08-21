import * as SQLite from 'expo-sqlite';
import type { TaskRepository } from './types';

const DB_NAME = 'adhd_life_coach.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS key_value_store (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  dbInstance = db;
  return db;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM key_value_store WHERE key = ?', [key]
  );
  if (!row?.value) return fallback;
  try {
    return JSON.parse(row.value) ?? fallback;
  } catch (error) {
    console.error(`sqliteRepository: failed to parse "${key}"`, error);
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO key_value_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value ?? null)]
  );
}

// One key per domain. Adding a new domain slice means adding one pair of
// lines here, never editing an existing one.
export const sqliteRepository: TaskRepository = {
  getTasks: () => readJson('tasks', []),
  saveTasks: (v) => writeJson('tasks', v || []),
  getStreaks: () => readJson('streaks', []),
  saveStreaks: (v) => writeJson('streaks', v || []),
  getMilestones: () => readJson('milestones', []),
  saveMilestones: (v) => writeJson('milestones', v || []),
  getEnergyLogs: () => readJson('energyLogs', []),
  saveEnergyLogs: (v) => writeJson('energyLogs', v || []),
  getCycleLogs: () => readJson('cycleLogs', []),
  saveCycleLogs: (v) => writeJson('cycleLogs', v || []),
  getCycleTrackingEnabled: () => readJson('cycleTrackingEnabled', false),
  saveCycleTrackingEnabled: (v) => writeJson('cycleTrackingEnabled', !!v),
  getStressLogs: () => readJson('stressLogs', []),
  saveStressLogs: (v) => writeJson('stressLogs', v || []),
  getWellnessPreferences: () => readJson('wellnessPreferences', null),
  saveWellnessPreferences: (v) => writeJson('wellnessPreferences', v),
  getProfile: () => readJson('profile', null),
  saveProfile: (v) => writeJson('profile', v),
  getRoutines: () => readJson('routines', []),
  saveRoutines: (v) => writeJson('routines', v || []),
  getRpgState: () => readJson('rpgState', null),
  saveRpgState: (v) => writeJson('rpgState', v),
  getSettingsState: () => readJson('settingsState', null),
  saveSettingsState: (v) => writeJson('settingsState', v),
  getReflectionState: () => readJson('reflectionState', null),
  saveReflectionState: (v) => writeJson('reflectionState', v),
  getScheduleState: () => readJson('scheduleState', null),
  saveScheduleState: (v) => writeJson('scheduleState', v),
  getSchoolState: () => readJson('schoolState', null),
  saveSchoolState: (v) => writeJson('schoolState', v),
  getBodyProgressState: () => readJson('bodyProgressState', null),
  saveBodyProgressState: (v) => writeJson('bodyProgressState', v),
  getMomentumState: () => readJson('momentumState', null),
  saveMomentumState: (v) => writeJson('momentumState', v),
  getNutritionFitnessState: () => readJson('nutritionFitnessState', null),
  saveNutritionFitnessState: (v) => writeJson('nutritionFitnessState', v),
  getWorkoutState: () => readJson('workoutState', null),
  saveWorkoutState: (v) => writeJson('workoutState', v),
  getWorkoutSessionDraft: () => readJson('workoutSessionDraft', null),
  saveWorkoutSessionDraft: (v) => writeJson('workoutSessionDraft', v),
  getProgramState: () => readJson('programState', null),
  saveProgramState: (v) => writeJson('programState', v),
  getCustomPrograms: () => readJson('customPrograms', null),
  saveCustomPrograms: (v) => writeJson('customPrograms', v),
  getGroceryState: () => readJson('groceryState', null),
  saveGroceryState: (v) => writeJson('groceryState', v),
  getNutritionTrackingState: () => readJson('nutritionTrackingState', null),
  saveNutritionTrackingState: (v) => writeJson('nutritionTrackingState', v),
  getCountdownState: () => readJson('countdownState', null),
  saveCountdownState: (v) => writeJson('countdownState', v),
};
