import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { Recipe } from '@/content/recipes';

export interface NutritionPreferences {
  allergies: string[];
  dietaryRestrictions: string[];
  foodsLoved?: string[];
  foodsAvoided?: string[];
}

export type Gender = 'female' | 'male' | 'non_binary' | null;
export type WeightGoalDirection = 'gain' | 'maintain' | 'lose';
export type BodyType = 'naturally_lean' | 'athletic_build' | 'naturally_curvy' | 'stocky_build';
export type ActivityLevel = 'mostly_sitting' | 'somewhat_active' | 'active' | 'very_active';
// How long a single workout session should realistically take: shrinks
// or grows how many exercises land in each day of the split, on top of
// whatever the chosen program is calibrated to. Distinct from today's
// energy level (which trims the session at start time, not the
// underlying plan) — this is a standing preference, not a daily one.
export type SessionTimeBudget = 'short' | 'standard' | 'long';

export interface FitnessPreferences {
  equipment: string[];
  primaryGoal: 'strength' | 'endurance' | 'mobility' | 'general' | null;
  sessionTimeBudget?: SessionTimeBudget;
  gender?: Gender;
  weightGoalDirections?: WeightGoalDirection[];
  bodyType?: BodyType;
  activityLevel?: ActivityLevel;
  exerciseGoals?: string[];
  focusAreas?: string[];
}

export interface NutritionFitnessState {
  savedRecipeIds: string[];
  completedExerciseLog: { exerciseId: string; date: string }[];
  nutritionPreferences: NutritionPreferences | null;
  nutritionCardDismissed: boolean;
  fitnessPreferences: FitnessPreferences | null;
  fitnessCardDismissed: boolean;
  aiGeneratedRecipes: Recipe[];
  recipeInstructionsCache: Record<string, string[]>;
}

export interface NutritionFitnessSlice extends NutritionFitnessState {
  toggleSavedRecipe: (recipeId: string) => Promise<void>;
  logExerciseCompletion: (exerciseId: string) => Promise<void>;
  setNutritionPreferences: (prefs: NutritionPreferences) => Promise<void>;
  dismissNutritionCard: () => Promise<void>;
  setFitnessPreferences: (prefs: FitnessPreferences) => Promise<void>;
  dismissFitnessCard: () => Promise<void>;
  addAiGeneratedRecipe: (recipe: Recipe) => Promise<void>;
  setRecipeInstructions: (recipeId: string, instructions: string[]) => Promise<void>;
}

const DEFAULT_STATE: NutritionFitnessState = {
  savedRecipeIds: [],
  completedExerciseLog: [],
  nutritionPreferences: null,
  nutritionCardDismissed: false,
  fitnessPreferences: null,
  fitnessCardDismissed: false,
  aiGeneratedRecipes: [],
  recipeInstructionsCache: {},
};

const persist = createWriteGuard(async (state: NutritionFitnessState) => {
  const repo = await getRepository();
  await repo.saveNutritionFitnessState(state);
});

function currentState(get: () => NutritionFitnessState): NutritionFitnessState {
  return {
    savedRecipeIds: get().savedRecipeIds || [],
    completedExerciseLog: get().completedExerciseLog || [],
    nutritionPreferences: get().nutritionPreferences || null,
    nutritionCardDismissed: get().nutritionCardDismissed || false,
    fitnessPreferences: get().fitnessPreferences || null,
    fitnessCardDismissed: get().fitnessCardDismissed || false,
    aiGeneratedRecipes: get().aiGeneratedRecipes || [],
    recipeInstructionsCache: get().recipeInstructionsCache || {},
  };
}

// The personalization card only ever appears once per screen (tracked by
// its own dismissed flag) — answering it or skipping it are both
// permanent, low-friction, one-time decisions, never re-prompted.
export const createNutritionFitnessSlice: StateCreator<NutritionFitnessSlice> = (set, get) => ({
  ...DEFAULT_STATE,

  toggleSavedRecipe: async (recipeId) => {
    const current = get().savedRecipeIds || [];
    const next = current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId];
    const nextState = { ...currentState(get), savedRecipeIds: next };
    set(nextState);
    await persist(nextState);
  },

  logExerciseCompletion: async (exerciseId) => {
    const nextLog = [...(get().completedExerciseLog || []), { exerciseId, date: new Date().toISOString() }];
    const nextState = { ...currentState(get), completedExerciseLog: nextLog };
    set(nextState);
    await persist(nextState);
  },

  setNutritionPreferences: async (prefs) => {
    // Same defensive merge as setFitnessPreferences below — protects
    // against a future field silently getting wiped by a caller that
    // doesn't know to re-pass it.
    const nextState = { ...currentState(get), nutritionPreferences: { ...currentState(get).nutritionPreferences, ...prefs }, nutritionCardDismissed: true };
    set(nextState);
    await persist(nextState);
  },

  dismissNutritionCard: async () => {
    const nextState = { ...currentState(get), nutritionCardDismissed: true };
    set(nextState);
    await persist(nextState);
  },

  setFitnessPreferences: async (prefs) => {
    // Bug fix: this used to fully replace fitnessPreferences with
    // exactly whatever the caller passed. Every current caller
    // (EditFitnessPreferencesScreen.tsx, onboarding) happens to pass
    // every field FitnessPreferences currently has, so there's no
    // active data loss today — but the moment a new field gets added
    // to that interface later, any caller that doesn't know to also
    // pass it (easy to miss, since nothing enforces it) would silently
    // wipe that field back to undefined on save. Merging with the
    // existing value removes that whole failure mode.
    const nextState = { ...currentState(get), fitnessPreferences: { ...currentState(get).fitnessPreferences, ...prefs }, fitnessCardDismissed: true };
    set(nextState);
    await persist(nextState);
  },

  dismissFitnessCard: async () => {
    const nextState = { ...currentState(get), fitnessCardDismissed: true };
    set(nextState);
    await persist(nextState);
  },

  // Kept indefinitely once generated — regenerating the same recipe on
  // every app open would be wasteful and inconsistent. Deduped by name
  // so re-searching the same thing twice doesn't create two entries.
  addAiGeneratedRecipe: async (recipe) => {
    const current = get().aiGeneratedRecipes || [];
    if (current.some((r) => r.n.toLowerCase() === recipe.n.toLowerCase())) return;
    const nextState = { ...currentState(get), aiGeneratedRecipes: [...current, recipe] };
    set(nextState);
    await persist(nextState);
  },

  // Generated once per recipe and kept indefinitely — directions don't
  // change, so there's no reason to regenerate them on every visit.
  setRecipeInstructions: async (recipeId, instructions) => {
    const nextState = { ...currentState(get), recipeInstructionsCache: { ...currentState(get).recipeInstructionsCache, [recipeId]: instructions } };
    set(nextState);
    await persist(nextState);
  },
});
