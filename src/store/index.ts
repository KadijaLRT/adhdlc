import { create } from 'zustand';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createTaskSlice, type TaskSlice } from './slices/taskSlice';
import { createStreakSlice, type StreakSlice } from './slices/streakSlice';
import { createMilestoneSlice, type MilestoneSlice } from './slices/milestoneSlice';
import { createEnergySlice, type EnergySlice } from './slices/energySlice';
import { createStressSlice, type StressSlice } from './slices/stressSlice';
import { createCycleSlice, type CycleSlice } from './slices/cycleSlice';
import { createWellnessSlice, type WellnessSlice } from './slices/wellnessSlice';
import { createProfileSlice, type ProfileSlice } from './slices/profileSlice';
import { createHydrationSlice, type HydrationSlice } from './slices/hydrationSlice';
import { createNutritionFitnessSlice, type NutritionFitnessSlice } from './slices/nutritionFitnessSlice';
import { createWorkoutSlice, type WorkoutSlice } from './slices/workoutSlice';
import { createProgramSlice, type ProgramSlice } from './slices/programSlice';
import { createGrocerySlice, type GrocerySlice } from './slices/grocerySlice';
import { createRoutineSlice, type RoutineSlice } from './slices/routineSlice';
import { createRpgSlice, type RpgSlice } from './slices/rpgSlice';
import { createSettingsSlice, type SettingsSlice } from './slices/settingsSlice';
import { createReflectionSlice, type ReflectionSlice } from './slices/reflectionSlice';
import { createScheduleSlice, type ScheduleSlice } from './slices/scheduleSlice';
export type { ScheduleItem } from './slices/scheduleSlice';
import { createSchoolSlice, type SchoolSlice } from './slices/schoolSlice';
import { createBodyProgressSlice, type BodyProgressSlice } from './slices/bodyProgressSlice';
import { createMomentumSlice, type MomentumSlice } from './slices/momentumSlice';
import { createNutritionTrackingSlice, type NutritionTrackingSlice } from './slices/nutritionTrackingSlice';
import { createCountdownSlice, type CountdownSlice } from './slices/countdownSlice';

export * from './slices/types';
export type { NutritionPreferences, FitnessPreferences, Gender, WeightGoalDirection, BodyType, ActivityLevel } from './slices/nutritionFitnessSlice';
export type { TextSize, ColorSchemePreference, DateFormat, UnitSystem } from './slices/settingsSlice';
export type { MomentumEntry, MomentumActionType } from './slices/momentumSlice';
export type { MeasurementSite, WeightEntry, MeasurementEntry } from './slices/bodyProgressSlice';
export type { WeeklyMealPlan, PlanDay, PlanMealType, PlanMeal, DayPlan } from '@/features/nutrition/mealPlanGeneration';
export type { MealType, FoodLogEntry, DailyTargets, CustomMeal, CustomMealIngredient } from './slices/nutritionTrackingSlice';
export type { CountdownEvent } from './slices/countdownSlice';
export type { RecoveryLogEntry } from './slices/workoutSlice';

export type AppState = UiSlice & TaskSlice & StreakSlice & MilestoneSlice &
  EnergySlice & StressSlice & CycleSlice & WellnessSlice & ProfileSlice & HydrationSlice & NutritionFitnessSlice & WorkoutSlice & ProgramSlice & GrocerySlice & RoutineSlice & RpgSlice & SettingsSlice & ReflectionSlice & ScheduleSlice & SchoolSlice & BodyProgressSlice & MomentumSlice & NutritionTrackingSlice & CountdownSlice;

// Combined store. To add a new domain: create slices/xSlice.ts exporting
// createXSlice + XSlice, spread it in here, add its storage keys to
// core/storage/types.ts + sqliteRepository.ts + webRepository.ts, and
// (if it needs to survive a restart) add it to hydrationSlice.ts. No
// existing slice file ever needs to change.
export const useAppStore = create<AppState>()((...args) => ({
  ...createUiSlice(...args),
  ...createTaskSlice(...args),
  ...createStreakSlice(...args),
  ...createMilestoneSlice(...args),
  ...createEnergySlice(...args),
  ...createStressSlice(...args),
  ...createCycleSlice(...args),
  ...createWellnessSlice(...args),
  ...createProfileSlice(...args),
  ...createHydrationSlice(...args),
  ...createNutritionFitnessSlice(...args),
  ...createWorkoutSlice(...args),
  ...createProgramSlice(...args),
  ...createGrocerySlice(...args),
  ...createRoutineSlice(...args),
  ...createRpgSlice(...args),
  ...createSettingsSlice(...args),
  ...createReflectionSlice(...args),
  ...createScheduleSlice(...args),
  ...createSchoolSlice(...args),
  ...createBodyProgressSlice(...args),
  ...createMomentumSlice(...args),
  ...createNutritionTrackingSlice(...args),
  ...createCountdownSlice(...args),
}));

// Individual selectors — components should always select a single slice
// of state, never the whole store, to avoid unnecessary re-renders.
export const selectTheme = (s: AppState) => s.theme;
export const selectEnergyLevel = (s: AppState) => s.energyLevel;
export const selectIsOverwhelmed = (s: AppState) => s.isOverwhelmed;
export const selectBodyDoublingRoom = (s: AppState) => s.bodyDoublingRoom;
export const selectTasks = (s: AppState) => s.tasks || [];
export const selectStreaks = (s: AppState) => s.streaks || [];
export const selectMilestones = (s: AppState) => s.milestones || [];
export const selectEnergyLogs = (s: AppState) => s.energyLogs || [];
export const selectStressLogs = (s: AppState) => s.stressLogs || [];
export const selectCycleTrackingEnabled = (s: AppState) => s.cycleTrackingEnabled;
export const selectCycleLogs = (s: AppState) => s.cycleLogs || [];
export const selectWellnessPreferences = (s: AppState) => s.wellnessPreferences;
export const selectProfile = (s: AppState) => s.profile;
export const selectIsHydrated = (s: AppState) => s.isHydrated;
export const selectStorageWorking = (s: AppState) => s.storageWorking;
export const selectReflections = (s: AppState) => s.reflections || [];
export const selectScheduleItems = (s: AppState) => s.scheduleItems || [];
export const selectCourses = (s: AppState) => s.courses || [];
export const selectAssignments = (s: AppState) => s.assignments || [];
export const selectGradeLevel = (s: AppState) => s.gradeLevel;
export const selectProgramName = (s: AppState) => s.programName;
export const selectUniversityName = (s: AppState) => s.universityName;
export const selectTotalCreditsRequired = (s: AppState) => s.totalCreditsRequired;
export const selectWeightLog = (s: AppState) => s.weightLog || [];
export const selectMeasurementLog = (s: AppState) => s.measurementLog || [];
export const selectWeightGoalLbs = (s: AppState) => s.weightGoalLbs;
export const selectWeightGoalDate = (s: AppState) => s.weightGoalDate;
export const selectMomentumLog = (s: AppState) => s.momentumLog || [];
export const selectSavedRecipeIds = (s: AppState) => s.savedRecipeIds || [];
export const selectAiGeneratedRecipes = (s: AppState) => s.aiGeneratedRecipes || [];
export const selectRecipeInstructionsCache = (s: AppState) => s.recipeInstructionsCache || {};
export const selectCompletedExerciseLog = (s: AppState) => s.completedExerciseLog || [];
export const selectNutritionPreferences = (s: AppState) => s.nutritionPreferences;
export const selectNutritionCardDismissed = (s: AppState) => s.nutritionCardDismissed;
export const selectFitnessPreferences = (s: AppState) => s.fitnessPreferences;
export const selectFitnessCardDismissed = (s: AppState) => s.fitnessCardDismissed;
export const selectSetLogs = (s: AppState) => s.setLogs || [];
export const selectRecoveryLogs = (s: AppState) => s.recoveryLogs || [];
export const selectPersonalRecords = (s: AppState) => s.personalRecords || [];
export const selectAdhdFocusModeEnabled = (s: AppState) => s.adhdFocusModeEnabled ?? true;
export const selectGyms = (s: AppState) => s.gyms || [];
export const selectActiveGymId = (s: AppState) => s.activeGymId;
export const selectWeekdayAssignment = (s: AppState) => s.weekdayAssignment || [null, 'A', 'B', 'C', 'D', 'E', 'F'];
export const selectTextSize = (s: AppState) => s.textSize || 'medium';
export const selectReduceMotion = (s: AppState) => s.reduceMotion ?? false;
export const selectNotificationsEnabled = (s: AppState) => s.notificationsEnabled ?? false;
export const selectHighContrast = (s: AppState) => s.highContrast ?? false;
export const selectDyslexiaFont = (s: AppState) => s.dyslexiaFont ?? false;
export const selectColorScheme = (s: AppState) => s.colorScheme || 'light';
export const selectDateFormat = (s: AppState) => s.dateFormat || 'MM-DD-YYYY';
export const selectUnitSystem = (s: AppState) => s.unitSystem || 'imperial';
export const selectActiveProgramId = (s: AppState) => s.activeProgramId;
export const selectPantryItems = (s: AppState) => s.pantryItems || [];
export const selectCheckedIngredients = (s: AppState) => s.checkedIngredients || [];
export const selectMealPlan = (s: AppState) => s.mealPlan;
export const selectMealPlanChecked = (s: AppState) => s.mealPlanChecked || [];
export const selectFoodLog = (s: AppState) => s.foodLog || [];
export const selectDailyTargets = (s: AppState) => s.dailyTargets;
export const selectCustomMeals = (s: AppState) => s.customMeals || [];
export const selectCountdownEvents = (s: AppState) => s.countdownEvents || [];
export const selectRoutines = (s: AppState) => s.routines || [];
export const selectTotalXp = (s: AppState) => s.totalXp || 0;
export const selectCoins = (s: AppState) => s.coins || 0;
export const selectSkillXp = (s: AppState) => s.skillXp;
export const selectOwnedUnlockables = (s: AppState) => s.ownedUnlockables || [];
