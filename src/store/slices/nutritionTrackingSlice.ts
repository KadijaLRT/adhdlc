import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import { generateId } from '@/shared/generateId';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  servings: number;
  calories: number; // total for this entry (already multiplied by servings)
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyTargets {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface CustomMealIngredient {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CustomMeal {
  id: string;
  name: string;
  ingredients: CustomMealIngredient[];
  // Combined totals across all ingredients — stored rather than
  // recomputed each time so editing one ingredient later can't
  // silently change the macros of every past diary entry that already
  // logged this meal.
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionTrackingState {
  foodLog: FoodLogEntry[];
  dailyTargets: DailyTargets;
  customMeals: CustomMeal[];
}

export interface NutritionTrackingSlice extends NutritionTrackingState {
  logFood: (entry: Omit<FoodLogEntry, 'id'>) => Promise<void>;
  removeFoodLogEntry: (id: string) => Promise<void>;
  updateFoodLogEntry: (id: string, updates: Partial<Omit<FoodLogEntry, 'id'>>) => Promise<void>;
  setDailyTargets: (targets: Partial<DailyTargets>) => Promise<void>;
  saveCustomMeal: (meal: Omit<CustomMeal, 'id'>) => Promise<CustomMeal>;
  updateCustomMeal: (id: string, updates: Partial<Omit<CustomMeal, 'id'>>) => Promise<void>;
  removeCustomMeal: (id: string) => Promise<void>;
}

const DEFAULT_STATE: NutritionTrackingState = {
  foodLog: [],
  dailyTargets: { calories: null, protein: null, carbs: null, fat: null },
  customMeals: [],
};

const persist = createWriteGuard(async (state: NutritionTrackingState) => {
  const repo = await getRepository();
  await repo.saveNutritionTrackingState(state);
});

function currentState(get: () => NutritionTrackingState): NutritionTrackingState {
  return {
    foodLog: get().foodLog || [],
    dailyTargets: get().dailyTargets || DEFAULT_STATE.dailyTargets,
    customMeals: get().customMeals || [],
  };
}

export const createNutritionTrackingSlice: StateCreator<NutritionTrackingSlice> = (set, get) => ({
  ...DEFAULT_STATE,

  logFood: async (entry) => {
    const next = [...(get().foodLog || []), { ...entry, id: generateId('food') }];
    const nextState = { ...currentState(get), foodLog: next };
    set(nextState);
    await persist(nextState);
  },

  removeFoodLogEntry: async (id) => {
    const next = (get().foodLog || []).filter((f) => f.id !== id);
    const nextState = { ...currentState(get), foodLog: next };
    set(nextState);
    await persist(nextState);
  },

  updateFoodLogEntry: async (id, updates) => {
    const next = (get().foodLog || []).map((f) => (f.id === id ? { ...f, ...updates } : f));
    const nextState = { ...currentState(get), foodLog: next };
    set(nextState);
    await persist(nextState);
  },

  // Targets are always something the person sets for themselves, never
  // a number Claude/the app calculates and pushes on them — this is
  // tracking infrastructure, not a diet prescription.
  setDailyTargets: async (targets) => {
    const nextState = { ...currentState(get), dailyTargets: { ...currentState(get).dailyTargets, ...targets } };
    set(nextState);
    await persist(nextState);
  },

  saveCustomMeal: async (meal) => {
    const newMeal: CustomMeal = { ...meal, id: generateId('meal') };
    const next = [...(get().customMeals || []), newMeal];
    const nextState = { ...currentState(get), customMeals: next };
    set(nextState);
    await persist(nextState);
    return newMeal;
  },

  updateCustomMeal: async (id, updates) => {
    const next = (get().customMeals || []).map((m) => (m.id === id ? { ...m, ...updates } : m));
    const nextState = { ...currentState(get), customMeals: next };
    set(nextState);
    await persist(nextState);
  },

  removeCustomMeal: async (id) => {
    const next = (get().customMeals || []).filter((m) => m.id !== id);
    const nextState = { ...currentState(get), customMeals: next };
    set(nextState);
    await persist(nextState);
  },
});
