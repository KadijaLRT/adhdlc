import type { StateCreator } from 'zustand';
import { getRepository, testStoragePersistence } from '@/core/storage';
import type { TaskSlice } from './taskSlice';
import type { StreakSlice } from './streakSlice';
import type { MilestoneSlice } from './milestoneSlice';
import type { EnergySlice } from './energySlice';
import type { StressSlice } from './stressSlice';
import type { CycleSlice } from './cycleSlice';
import type { WellnessSlice } from './wellnessSlice';
import type { ProfileSlice } from './profileSlice';
import type { RoutineSlice } from './routineSlice';
import type { RpgSlice } from './rpgSlice';
import type { SettingsSlice } from './settingsSlice';
import type { ReflectionSlice } from './reflectionSlice';
import type { WorkbookSlice } from './workbookSlice';
import type { ScheduleSlice } from './scheduleSlice';
import type { SchoolSlice } from './schoolSlice';
import type { BodyProgressSlice } from './bodyProgressSlice';
import type { MomentumSlice } from './momentumSlice';
import type { NutritionFitnessSlice } from './nutritionFitnessSlice';
import type { WorkoutSlice } from './workoutSlice';
import type { ProgramSlice } from './programSlice';
import type { CustomProgramSlice } from './customProgramSlice';
import type { GrocerySlice } from './grocerySlice';
import type { NutritionTrackingSlice } from './nutritionTrackingSlice';
import type { UiSlice } from './uiSlice';
import type { CountdownSlice } from './countdownSlice';

export interface HydrationSlice {
  isHydrated: boolean;
  storageWorking: boolean;
  hydrate: () => Promise<void>;
}

function today(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

type FullState = TaskSlice & StreakSlice & MilestoneSlice & EnergySlice &
  StressSlice & CycleSlice & WellnessSlice & ProfileSlice & HydrationSlice & RoutineSlice & RpgSlice & SettingsSlice & ReflectionSlice & WorkbookSlice & ScheduleSlice & SchoolSlice & BodyProgressSlice & MomentumSlice &
  NutritionFitnessSlice & WorkoutSlice & ProgramSlice & CustomProgramSlice & GrocerySlice & NutritionTrackingSlice & UiSlice & CountdownSlice;

// The only place that reads every domain's storage at once. Adding a new
// slice means adding one line here and one line in the destructure below,
// never touching any other slice file.
export const createHydrationSlice: StateCreator<FullState, [], [], HydrationSlice> = (set) => ({
  isHydrated: false,
  storageWorking: true,

  hydrate: async () => {
    const storageWorking = await testStoragePersistence();
    if (!storageWorking) {
      console.error('hydrationSlice: storage self-test failed — data will not persist between sessions on this device');
    }
    try {
      const repo = await getRepository();
      const [
        tasks, streaks, milestones, energyLogs, cycleLogs, cycleTrackingEnabledStored, stressLogs,
        wellnessPreferences, profile, routines, rpgState, settingsState, reflectionState, workbookState,
        nutritionFitnessState, workoutState, programState, customPrograms, groceryState, scheduleState, schoolState, bodyProgressState, momentumState, nutritionTrackingState, countdownState,
      ] = await Promise.all([
          repo.getTasks(), repo.getStreaks(), repo.getMilestones(),
          repo.getEnergyLogs(), repo.getCycleLogs(), repo.getCycleTrackingEnabled(), repo.getStressLogs(),
          repo.getWellnessPreferences(), repo.getProfile(), repo.getRoutines(), repo.getRpgState(), repo.getSettingsState(), repo.getReflectionState(), repo.getWorkbookState(),
          repo.getNutritionFitnessState(), repo.getWorkoutState(), repo.getProgramState(), repo.getCustomPrograms(), repo.getGroceryState(), repo.getScheduleState(), repo.getSchoolState(), repo.getBodyProgressState(), repo.getMomentumState(), repo.getNutritionTrackingState(), repo.getCountdownState(),
        ]);
      set((state) => ({
        ...state,
        tasks: tasks || [],
        streaks: streaks || [],
        milestones: milestones || [],
        energyLogs: energyLogs || [],
        // energyLevel itself is intentionally not persisted directly —
        // it's re-derived from today's entry in energyLogs, which is.
        // Without this, reloading the page after setting today's
        // energy silently reset it to the 'medium' default, even
        // though the underlying log entry (and anything derived from
        // it, like workout set reduction) should reflect the real
        // selection.
        energyLevel: (energyLogs || []).find((l) => l.date === today())?.energyLevel ?? state.energyLevel,
        cycleLogs: cycleLogs || [],
        cycleTrackingEnabled: cycleTrackingEnabledStored ?? state.cycleTrackingEnabled,
        stressLogs: stressLogs || [],
        wellnessPreferences: wellnessPreferences || state.wellnessPreferences,
        profile: profile || null,
        routines: routines || [],
        totalXp: rpgState?.totalXp ?? state.totalXp,
        coins: rpgState?.coins ?? state.coins,
        skillXp: rpgState?.skillXp ?? state.skillXp,
        ownedUnlockables: rpgState?.ownedUnlockables ?? state.ownedUnlockables,
        textSize: settingsState?.textSize ?? state.textSize,
        reduceMotion: settingsState?.reduceMotion ?? state.reduceMotion,
        highContrast: settingsState?.highContrast ?? state.highContrast,
        dyslexiaFont: settingsState?.dyslexiaFont ?? state.dyslexiaFont,
        colorScheme: settingsState?.colorScheme ?? state.colorScheme,
        dateFormat: settingsState?.dateFormat ?? state.dateFormat,
        unitSystem: settingsState?.unitSystem ?? state.unitSystem,
        notificationsEnabled: settingsState?.notificationsEnabled ?? state.notificationsEnabled,
        reflections: reflectionState?.reflections ?? state.reflections,
        thoughtReframes: workbookState?.thoughtReframes ?? state.thoughtReframes,
        frustrationEntries: workbookState?.frustrationEntries ?? state.frustrationEntries,
        sabotageChecks: workbookState?.sabotageChecks ?? state.sabotageChecks,
        scheduleItems: scheduleState?.scheduleItems ?? state.scheduleItems,
        runningBehindMinutes: scheduleState?.runningBehindMinutes ?? state.runningBehindMinutes,
        courses: schoolState?.courses ?? state.courses,
        assignments: schoolState?.assignments ?? state.assignments,
        gradeLevel: schoolState?.gradeLevel ?? state.gradeLevel,
        programName: schoolState?.programName ?? state.programName,
        universityName: schoolState?.universityName ?? state.universityName,
        totalCreditsRequired: schoolState?.totalCreditsRequired ?? state.totalCreditsRequired,
        weightLog: bodyProgressState?.weightLog ?? state.weightLog,
        measurementLog: bodyProgressState?.measurementLog ?? state.measurementLog,
        weightGoalLbs: bodyProgressState?.weightGoalLbs ?? state.weightGoalLbs,
        weightGoalDate: bodyProgressState?.weightGoalDate ?? state.weightGoalDate,
        momentumLog: momentumState?.momentumLog ?? state.momentumLog,

        savedRecipeIds: nutritionFitnessState?.savedRecipeIds ?? state.savedRecipeIds,
        completedExerciseLog: nutritionFitnessState?.completedExerciseLog ?? state.completedExerciseLog,
        nutritionPreferences: nutritionFitnessState?.nutritionPreferences ?? state.nutritionPreferences,
        nutritionCardDismissed: nutritionFitnessState?.nutritionCardDismissed ?? state.nutritionCardDismissed,
        fitnessPreferences: nutritionFitnessState?.fitnessPreferences ?? state.fitnessPreferences,
        fitnessCardDismissed: nutritionFitnessState?.fitnessCardDismissed ?? state.fitnessCardDismissed,
        aiGeneratedRecipes: nutritionFitnessState?.aiGeneratedRecipes ?? state.aiGeneratedRecipes,
        recipeInstructionsCache: nutritionFitnessState?.recipeInstructionsCache ?? state.recipeInstructionsCache,

        setLogs: workoutState?.setLogs ?? state.setLogs,
        personalRecords: workoutState?.personalRecords ?? state.personalRecords,
        adhdFocusModeEnabled: workoutState?.adhdFocusModeEnabled ?? state.adhdFocusModeEnabled,
        gyms: workoutState?.gyms ?? state.gyms,
        activeGymId: workoutState?.activeGymId ?? state.activeGymId,
        weekdayAssignment: workoutState?.weekdayAssignment ?? state.weekdayAssignment,
        recoveryLogs: workoutState?.recoveryLogs ?? state.recoveryLogs,
        recentDayExerciseHistory: workoutState?.recentDayExerciseHistory ?? state.recentDayExerciseHistory,
        recentWarmupHistory: workoutState?.recentWarmupHistory ?? state.recentWarmupHistory,

        activeProgramId: programState?.activeProgramId ?? state.activeProgramId,
        programStartedAt: programState?.programStartedAt ?? state.programStartedAt,
        sessionsCompletedInProgram: programState?.sessionsCompletedInProgram ?? state.sessionsCompletedInProgram,
        customPrograms: customPrograms || state.customPrograms,

        pantryItems: groceryState?.pantryItems ?? state.pantryItems,
        checkedIngredients: groceryState?.checkedIngredients ?? state.checkedIngredients,
        mealPlan: groceryState?.mealPlan ?? state.mealPlan,
        mealPlanChecked: groceryState?.mealPlanChecked ?? state.mealPlanChecked,

        foodLog: nutritionTrackingState?.foodLog ?? state.foodLog,
        dailyTargets: nutritionTrackingState?.dailyTargets ?? state.dailyTargets,
        customMeals: nutritionTrackingState?.customMeals ?? state.customMeals,

        countdownEvents: countdownState?.countdownEvents ?? state.countdownEvents,

        isHydrated: true,
        storageWorking,
      }));
    } catch (error) {
      console.error('hydrationSlice: hydrate failed', error);
      set({ isHydrated: true, storageWorking });
    }
  },
});
