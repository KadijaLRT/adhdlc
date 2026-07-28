import type { TaskRepository } from './types';

// Direct, synchronous localStorage access — not AsyncStorage. This
// matters: AsyncStorage's web implementation is still Promise-based
// even though it's backed by localStorage, meaning every write has a
// scheduling delay (a microtask hop) before the actual browser storage
// write happens. If the PWA is forcibly closed (swiped away in the app
// switcher, not just backgrounded) during that gap, the write can be
// lost entirely. A direct, synchronous localStorage.setItem() call
// completes immediately in the current call stack with no async gap
// for a close event to land in, which is verifiably how this exact
// problem was avoided in an earlier version of this app.
const NS = 'adhd-life-coach';

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(`${NS}:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch (error) {
    console.error(`webRepository: failed to read "${key}"`, error);
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(`${NS}:${key}`, JSON.stringify(value ?? null));
  } catch (error) {
    console.error(`webRepository: failed to write "${key}"`, error);
  }
}

export const webRepository: TaskRepository = {
  getTasks: async () => readJson('tasks', []),
  saveTasks: async (v) => writeJson('tasks', v || []),
  getStreaks: async () => readJson('streaks', []),
  saveStreaks: async (v) => writeJson('streaks', v || []),
  getMilestones: async () => readJson('milestones', []),
  saveMilestones: async (v) => writeJson('milestones', v || []),
  getEnergyLogs: async () => readJson('energyLogs', []),
  saveEnergyLogs: async (v) => writeJson('energyLogs', v || []),
  getCycleLogs: async () => readJson('cycleLogs', []),
  saveCycleLogs: async (v) => writeJson('cycleLogs', v || []),
  // The on/off toggle itself, separate from the logs it gates. Previously
  // this had no storage key at all — only cycleLogs was persisted — so the
  // switch always reverted to its default (off) on reload, and re-enabling
  // it right in the middle of an Apple Health import discarded the
  // in-progress screen along with it.
  getCycleTrackingEnabled: async () => readJson('cycleTrackingEnabled', false),
  saveCycleTrackingEnabled: async (v) => writeJson('cycleTrackingEnabled', !!v),
  getStressLogs: async () => readJson('stressLogs', []),
  saveStressLogs: async (v) => writeJson('stressLogs', v || []),
  getWellnessPreferences: async () => readJson('wellnessPreferences', null),
  saveWellnessPreferences: async (v) => writeJson('wellnessPreferences', v),
  getProfile: async () => readJson('profile', null),
  saveProfile: async (v) => writeJson('profile', v),
  getRoutines: async () => readJson('routines', []),
  saveRoutines: async (v) => writeJson('routines', v || []),
  getRpgState: async () => readJson('rpgState', null),
  saveRpgState: async (v) => writeJson('rpgState', v),
  getSettingsState: async () => readJson('settingsState', null),
  saveSettingsState: async (v) => writeJson('settingsState', v),
  getReflectionState: async () => readJson('reflectionState', null),
  saveReflectionState: async (v) => writeJson('reflectionState', v),
  getScheduleState: async () => readJson('scheduleState', null),
  saveScheduleState: async (v) => writeJson('scheduleState', v),
  getSchoolState: async () => readJson('schoolState', null),
  saveSchoolState: async (v) => writeJson('schoolState', v),
  getBodyProgressState: async () => readJson('bodyProgressState', null),
  saveBodyProgressState: async (v) => writeJson('bodyProgressState', v),
  getMomentumState: async () => readJson('momentumState', null),
  saveMomentumState: async (v) => writeJson('momentumState', v),
  getNutritionFitnessState: async () => readJson('nutritionFitnessState', null),
  saveNutritionFitnessState: async (v) => writeJson('nutritionFitnessState', v),
  getWorkoutState: async () => readJson('workoutState', null),
  saveWorkoutState: async (v) => writeJson('workoutState', v),
  // Separate key from workoutState itself: this is transient in-progress
  // session data (unchecked weight/reps, which exercises were swapped in
  // for today), autosaved on every change and cleared once the session is
  // finished — not a permanent record like setLogs/personalRecords.
  getWorkoutSessionDraft: async () => readJson('workoutSessionDraft', null),
  saveWorkoutSessionDraft: async (v) => writeJson('workoutSessionDraft', v),
  getProgramState: async () => readJson('programState', null),
  saveProgramState: async (v) => writeJson('programState', v),
  getGroceryState: async () => readJson('groceryState', null),
  saveGroceryState: async (v) => writeJson('groceryState', v),
  getNutritionTrackingState: async () => readJson('nutritionTrackingState', null),
  saveNutritionTrackingState: async (v) => writeJson('nutritionTrackingState', v),
  getCountdownState: async () => readJson('countdownState', null),
  saveCountdownState: async (v) => writeJson('countdownState', v),
};
