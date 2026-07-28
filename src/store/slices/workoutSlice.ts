import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';

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
  };
}

// A "record" only ever moves up, and there is no display anywhere of a
// "regression" from a prior best — this system celebrates, never shames.
export const createWorkoutSlice: StateCreator<WorkoutSlice> = (set, get) => ({
  ...DEFAULT_STATE,

  logSet: async (exerciseId, weight, reps) => {
    const nextLogs = [...(get().setLogs || []), { exerciseId, weight, reps, date: new Date().toISOString() }];
    const existingRecord = (get().personalRecords || []).find((r) => r.exerciseId === exerciseId);

    let isNewRecord = false;
    let nextRecords = get().personalRecords || [];

    if (!existingRecord) {
      isNewRecord = weight > 0 || reps > 0;
      nextRecords = [...nextRecords, { exerciseId, bestWeight: weight, bestReps: reps, achievedAt: new Date().toISOString() }];
    } else if (weight > existingRecord.bestWeight || (weight === existingRecord.bestWeight && reps > existingRecord.bestReps)) {
      isNewRecord = true;
      nextRecords = nextRecords.map((r) =>
        r.exerciseId === exerciseId
          ? { exerciseId, bestWeight: Math.max(weight, r.bestWeight), bestReps: reps > existingRecord.bestReps ? reps : r.bestReps, achievedAt: new Date().toISOString() }
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
    const newGym = { id: `gym-${Date.now()}`, name: name.trim(), equipment };
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
});
