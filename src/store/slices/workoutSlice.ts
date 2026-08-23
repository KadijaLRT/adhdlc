import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import { generateId } from '@/shared/generateId';

export interface SetLogEntry {
  exerciseId: string;
  weight: number;
  reps: number;
  date: string;
}

export interface PersonalRecord {
  exerciseId: string;
  bestWeight: number;
  bestReps: number;
  achievedAt: string;
}

export interface Gym {
  id: string;
  name: string;
  equipment: string[];
}

export interface RecoveryLogEntry {
  date: string; // YYYY-MM-DD, one entry per day
  stretchRoutineId?: string;
  stretchDone?: boolean;
  hydrationCups?: number;
  sleepHours?: number;
  sorenessLevel?: number; // 1 (barely) – 5 (a lot) — self-reported, never diagnostic
}

export interface WorkoutSessionSetRow {
  weight: string;
  reps: string;
  done: boolean;
  side?: 'right' | 'left';
}

// A single in-progress workout session, autosaved continuously so nothing
// typed or checked off is lost if the app/PWA gets killed mid-workout
// (e.g. going to the phone Home Screen) before "Finish workout" is tapped.
// Only one session is ever in progress at a time, so this is a single slot,
// not a list — sessionKey identifies which day/program/exercise-set it
// belongs to, so a stale draft from a different day is never mistakenly
// restored into a new session.
export interface WorkoutSessionDraft {
  sessionKey: string;
  sessionStartedAt: string;
  programId?: string;
  dayTitle?: string;
  sessionExerciseIds: string[];
  rowsByExercise: Record<string, WorkoutSessionSetRow[]>;
  updatedAt: string;
}

export interface WorkoutState {
  setLogs: SetLogEntry[];
  personalRecords: PersonalRecord[];
  adhdFocusModeEnabled: boolean;
  gyms: Gym[];
  activeGymId: string | null;
  weekdayAssignment: (string | null)[]; // length 7, index=weekday (0=Sun), value=day letter or null for rest
  recoveryLogs: RecoveryLogEntry[];
  // Keyed by day title (e.g. "Quads B", the stable identity of a
  // lettered day's muscle-group content — see buildWeeklySplit.ts).
  // Each entry holds the last few exercise-id combos actually started
  // for that day, most recent last, so a fresh session can be rotated
  // away from repeating what was just done. Bounded to a handful of
  // entries per day (see recordUsedExerciseCombo) rather than growing
  // forever.
  recentDayExerciseHistory: Record<string, string[][]>;
  // Same idea as recentDayExerciseHistory above, but keyed by warm-up
  // category ('lower_body', 'upper_body', 'core', 'fullbody') instead
  // of day title — the last few move-id combos actually used for that
  // category's warm-up, so getWarmupForGroups can rotate away from
  // repeating what was just done.
  recentWarmupHistory: Record<string, string[][]>;
}

export interface WorkoutSlice extends WorkoutState {
  logSet: (exerciseId: string, weight: number, reps: number) => Promise<{ isNewRecord: boolean }>;
  setAdhdFocusMode: (enabled: boolean) => Promise<void>;
  addGym: (name: string, equipment: string[]) => Promise<void>;
  updateGymEquipment: (gymId: string, equipment: string[]) => Promise<void>;
  removeGym: (gymId: string) => Promise<void>;
  setActiveGym: (gymId: string | null) => Promise<void>;
  setWeekdayAssignment: (weekdayIndex: number, dayLetter: string | null) => Promise<void>;
  logRecoveryUpdate: (date: string, updates: Partial<Omit<RecoveryLogEntry, 'date'>>) => Promise<void>;
  recordUsedExerciseCombo: (dayTitle: string, exerciseIds: string[]) => Promise<void>;
  recordUsedWarmupCombo: (category: string, moveIds: string[]) => Promise<void>;
}

const DEFAULT_STATE: WorkoutState = {
  setLogs: [],
  personalRecords: [],
  adhdFocusModeEnabled: true, // defaults on — reducing cognitive load during
                              // a workout is the safer default for this audience
  gyms: [],
  activeGymId: null,
  weekdayAssignment: [null, 'A', 'B', 'C', 'D', 'E', 'F'], // default: Sun rest, Mon–Sat A–F
  recoveryLogs: [],
  recentDayExerciseHistory: {},
  recentWarmupHistory: {},
};

const persist = createWriteGuard(async (state: WorkoutState) => {
  const repo = await getRepository();
  await repo.saveWorkoutState(state);
});

function currentState(get: () => WorkoutState): WorkoutState {
  return {
    setLogs: get().setLogs || [],
    personalRecords: get().personalRecords || [],
    adhdFocusModeEnabled: get().adhdFocusModeEnabled ?? true,
    gyms: get().gyms || [],
    activeGymId: get().activeGymId ?? null,
    weekdayAssignment: get().weekdayAssignment || DEFAULT_STATE.weekdayAssignment,
    recoveryLogs: get().recoveryLogs || [],
    recentDayExerciseHistory: get().recentDayExerciseHistory || {},
    recentWarmupHistory: get().recentWarmupHistory || {},
  };
}

// A "record" only ever moves up, and there is no display anywhere of a
// "regression" from a prior best — this system celebrates, never shames.
export const createWorkoutSlice: StateCreator<WorkoutSlice> = (set, get) => ({
  ...DEFAULT_STATE,

  logSet: async (exerciseId, weight, reps) => {
    // Defensive floor at the actual boundary, not just relying on the
    // one current UI call site (WorkoutDaySession.tsx) to have already
    // clamped — the same reasoning as the write-guards elsewhere in
    // this store: validate where untrusted input actually enters, not
    // just at today's one caller.
    const safeWeight = Math.max(0, Number.isFinite(weight) ? weight : 0);
    const safeReps = Math.max(0, Number.isFinite(reps) ? reps : 0);
    const nextLogs = [...(get().setLogs || []), { exerciseId, weight: safeWeight, reps: safeReps, date: new Date().toISOString() }];
    const existingRecord = (get().personalRecords || []).find((r) => r.exerciseId === exerciseId);

    let isNewRecord = false;
    let nextRecords = get().personalRecords || [];

    if (!existingRecord) {
      isNewRecord = safeWeight > 0 || safeReps > 0;
      nextRecords = [...nextRecords, { exerciseId, bestWeight: safeWeight, bestReps: safeReps, achievedAt: new Date().toISOString() }];
    } else if (safeWeight > existingRecord.bestWeight || (safeWeight === existingRecord.bestWeight && safeReps > existingRecord.bestReps)) {
      isNewRecord = true;
      nextRecords = nextRecords.map((r) =>
        r.exerciseId === exerciseId
          ? { exerciseId, bestWeight: Math.max(safeWeight, r.bestWeight), bestReps: safeReps > existingRecord.bestReps ? safeReps : r.bestReps, achievedAt: new Date().toISOString() }
          : r
      );
    }

    const nextState = { ...currentState(get), setLogs: nextLogs, personalRecords: nextRecords };
    set(nextState);
    await persist(nextState);
    return { isNewRecord };
  },

  setAdhdFocusMode: async (adhdFocusModeEnabled) => {
    const nextState = { ...currentState(get), adhdFocusModeEnabled };
    set(nextState);
    await persist(nextState);
  },

  // Manual entry, not live location search — a real "tap to change,
  // pick from nearby gyms" experience needs device geolocation
  // permission and a places API wired at runtime, which this app
  // doesn't have configured. Flagging that honestly rather than faking
  // a location picker that doesn't actually search anything.
  addGym: async (name, equipment) => {
    const newGym = { id: generateId('gym'), name: name.trim(), equipment };
    const nextGyms = [...(get().gyms || []), newGym];
    const nextState = { ...currentState(get), gyms: nextGyms, activeGymId: newGym.id };
    set(nextState);
    await persist(nextState);
  },

  updateGymEquipment: async (gymId, equipment) => {
    const nextGyms = (get().gyms || []).map((g) => (g.id === gymId ? { ...g, equipment } : g));
    const nextState = { ...currentState(get), gyms: nextGyms };
    set(nextState);
    await persist(nextState);
  },

  removeGym: async (gymId) => {
    const nextGyms = (get().gyms || []).filter((g) => g.id !== gymId);
    const wasActive = get().activeGymId === gymId;
    const nextState = {
      ...currentState(get),
      gyms: nextGyms,
      activeGymId: wasActive ? (nextGyms[0]?.id ?? null) : get().activeGymId,
    };
    set(nextState);
    await persist(nextState);
  },

  // Selecting a gym is what actually changes which exercises show up —
  // this is what makes workouts tailored to that specific gym's
  // machines, not just a label.
  setActiveGym: async (activeGymId) => {
    const nextState = { ...currentState(get), activeGymId };
    set(nextState);
    await persist(nextState);
  },

  // Lets someone reassign which weekday is rest and which day-letter
  // lands on which weekday — e.g. moving the rest day off Sunday, or
  // swapping which day is Day A vs Day B.
  setWeekdayAssignment: async (weekdayIndex, dayLetter) => {
    const current = get().weekdayAssignment || DEFAULT_STATE.weekdayAssignment;
    const next = [...current];
    next[weekdayIndex] = dayLetter;
    const nextState = { ...currentState(get), weekdayAssignment: next };
    set(nextState);
    await persist(nextState);
  },

  // One entry per date, merged rather than overwritten — logging
  // hydration doesn't erase an already-logged soreness level for the
  // same day, and vice versa.
  logRecoveryUpdate: async (date, updates) => {
    const existing = get().recoveryLogs || [];
    const already = existing.some((r) => r.date === date);
    const next = already
      ? existing.map((r) => (r.date === date ? { ...r, ...updates } : r))
      : [...existing, { date, ...updates }];
    const nextState = { ...currentState(get), recoveryLogs: next };
    set(nextState);
    await persist(nextState);
  },

  // Records what was actually used for a day, so the next time that
  // day is started, getVariedExerciseSelection (buildWeeklySplit.ts)
  // can rotate away from repeating it. Bounded to the last 3 per day —
  // enough to stop the immediate "same as last time" repeat and most
  // near-term repeats, without growing forever or making rotation so
  // constrained it runs out of eligible combinations on a small pool.
  recordUsedExerciseCombo: async (dayTitle, exerciseIds) => {
    if (!dayTitle || !exerciseIds?.length) return;
    const existing = get().recentDayExerciseHistory || {};
    const historyForDay = existing[dayTitle] || [];
    const nextHistoryForDay = [...historyForDay, exerciseIds].slice(-3);
    const nextState = {
      ...currentState(get),
      recentDayExerciseHistory: { ...existing, [dayTitle]: nextHistoryForDay },
    };
    set(nextState);
    await persist(nextState);
  },

  recordUsedWarmupCombo: async (category, moveIds) => {
    if (!category || !moveIds?.length) return;
    const existing = get().recentWarmupHistory || {};
    const historyForCategory = existing[category] || [];
    const nextHistoryForCategory = [...historyForCategory, moveIds].slice(-3);
    const nextState = {
      ...currentState(get),
      recentWarmupHistory: { ...existing, [category]: nextHistoryForCategory },
    };
    set(nextState);
    await persist(nextState);
  },
});
