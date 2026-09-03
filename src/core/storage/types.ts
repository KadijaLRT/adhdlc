import type {
  Task, RoutineStreak, MilestoneProgress, EnergyLogEntry,
  CycleLogEntry, StressLogEntry, WellnessPreferences, UserProfile,
  Routine,
} from '@/store/index';
import type { RpgState } from '@/store/slices/rpgSlice';
import type { SettingsState } from '@/store/slices/settingsSlice';
import type { ReflectionState } from '@/store/slices/reflectionSlice';
import type { WorkbookState } from '@/store/slices/workbookSlice';
import type { ScheduleState } from '@/store/slices/scheduleSlice';
import type { SchoolState } from '@/store/slices/schoolSlice';
import type { BodyProgressState } from '@/store/slices/bodyProgressSlice';
import type { MomentumState } from '@/store/slices/momentumSlice';
import type { NutritionFitnessState } from '@/store/slices/nutritionFitnessSlice';
import type { WorkoutState, WorkoutSessionDraft } from '@/store/slices/workoutSlice';
import type { ProgramProgressState } from '@/store/slices/programSlice';
import type { ProgramDefinition } from '@/content/programs';
import type { GroceryState } from '@/store/slices/grocerySlice';
import type { NutritionTrackingState } from '@/store/slices/nutritionTrackingSlice';
import type { CountdownState } from '@/store/slices/countdownSlice';

// Single storage contract. Every domain slice reads/writes through this,
// never through SQLite or AsyncStorage directly, so adding a new domain
// never means touching sqliteRepository.ts or webRepository.ts logic,
// only adding one get/save pair to this interface and both impls.
//
// This interface previously fell out of sync with what slices actually
// called — hydrate()'s Promise.all called methods (getRoutines,
// getRpgState, getSettingsState, etc.) that weren't declared here and
// weren't implemented by either repository. Since Metro/Babel strip
// TypeScript types without type-checking them, that mismatch never
// failed a build, only at runtime: the missing-method call threw,
// Promise.all rejected as a whole, and hydrate()'s catch block set
// isHydrated:true with everything at default state — including
// profile:null. That is very likely the real cause of "the app keeps
// starting over," not a device-specific storage quirk. Verified via
// `npx tsc --noEmit`, not assumed.
export interface TaskRepository {
  getTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
  getStreaks(): Promise<RoutineStreak[]>;
  saveStreaks(streaks: RoutineStreak[]): Promise<void>;
  getMilestones(): Promise<MilestoneProgress[]>;
  saveMilestones(milestones: MilestoneProgress[]): Promise<void>;
  getEnergyLogs(): Promise<EnergyLogEntry[]>;
  saveEnergyLogs(logs: EnergyLogEntry[]): Promise<void>;
  getCycleLogs(): Promise<CycleLogEntry[]>;
  saveCycleLogs(logs: CycleLogEntry[]): Promise<void>;
  getCycleTrackingEnabled(): Promise<boolean>;
  saveCycleTrackingEnabled(enabled: boolean): Promise<void>;
  getStressLogs(): Promise<StressLogEntry[]>;
  saveStressLogs(logs: StressLogEntry[]): Promise<void>;
  getWellnessPreferences(): Promise<WellnessPreferences | null>;
  saveWellnessPreferences(prefs: WellnessPreferences): Promise<void>;
  getProfile(): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;
  getRoutines(): Promise<Routine[]>;
  saveRoutines(routines: Routine[]): Promise<void>;
  getRpgState(): Promise<RpgState | null>;
  saveRpgState(state: RpgState): Promise<void>;
  getSettingsState(): Promise<SettingsState | null>;
  saveSettingsState(state: SettingsState): Promise<void>;
  getReflectionState(): Promise<ReflectionState | null>;
  saveReflectionState(state: ReflectionState): Promise<void>;
  getWorkbookState(): Promise<WorkbookState | null>;
  saveWorkbookState(state: WorkbookState): Promise<void>;
  getScheduleState(): Promise<ScheduleState | null>;
  saveScheduleState(state: ScheduleState): Promise<void>;
  getSchoolState(): Promise<SchoolState | null>;
  saveSchoolState(state: SchoolState): Promise<void>;
  getBodyProgressState(): Promise<BodyProgressState | null>;
  saveBodyProgressState(state: BodyProgressState): Promise<void>;
  getMomentumState(): Promise<MomentumState | null>;
  saveMomentumState(state: MomentumState): Promise<void>;
  getNutritionFitnessState(): Promise<NutritionFitnessState | null>;
  saveNutritionFitnessState(state: NutritionFitnessState): Promise<void>;
  getWorkoutState(): Promise<WorkoutState | null>;
  saveWorkoutState(state: WorkoutState): Promise<void>;
  getWorkoutSessionDraft(): Promise<WorkoutSessionDraft | null>;
  saveWorkoutSessionDraft(draft: WorkoutSessionDraft | null): Promise<void>;
  getProgramState(): Promise<ProgramProgressState | null>;
  saveProgramState(state: ProgramProgressState): Promise<void>;
  getCustomPrograms(): Promise<ProgramDefinition[] | null>;
  saveCustomPrograms(programs: ProgramDefinition[]): Promise<void>;
  getGroceryState(): Promise<GroceryState | null>;
  saveGroceryState(state: GroceryState): Promise<void>;
  getNutritionTrackingState(): Promise<NutritionTrackingState | null>;
  saveNutritionTrackingState(state: NutritionTrackingState): Promise<void>;
  getCountdownState(): Promise<CountdownState | null>;
  saveCountdownState(state: CountdownState): Promise<void>;
}
