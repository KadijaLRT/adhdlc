import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useAppStore, selectFoodLog, selectDailyTargets, selectSavedRecipeIds, selectAiGeneratedRecipes, selectCustomMeals,
  selectWeightLog, selectFitnessPreferences,
  type MealType, type FoodLogEntry, type CustomMeal, type CustomMealIngredient,
} from '@/store/index';
import { searchFoodDatabase, parseGramString, FAST_FOOD_CHAINS, type FoodItem } from '@/content/foodDatabase';
import { searchOpenFoodFacts } from '@/core/nutrition/openFoodFactsApi';
import { RECIPES, type Recipe } from '@/content/recipes';
import { Heading } from '@/shared/components/Heading';
import { parseLocalDate, toLocalDateString } from '@/shared/formatDate';
import { estimateDailyTargets } from './estimateNutritionTargets';
import BarcodeScannerModal from './BarcodeScannerModal';
import CustomMealBuilder from './CustomMealBuilder';

const GOAL_LABEL: Record<'lose' | 'gain' | 'maintain', string> = {
  lose: 'for weight loss',
  gain: 'for weight gain',
  maintain: 'to maintain your weight',
};

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { id: 'lunch', label: 'Lunch', icon: '🥪' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
  { id: 'snack', label: 'Snacks', icon: '🍪' },
];

type AddTab = 'search' | 'recipes' | 'mymeals';

function todayLocal(): string {
  return toLocalDateString(new Date());
}

function formatDateLabel(dateStr: string): string {
  const today = todayLocal();
  if (dateStr === today) return 'Today';
  const date = parseLocalDate(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === toLocalDateString(yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function shiftDate(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

/** Fills toward 100% but never implies failure past it — matches this app's cumulative, non-punitive progress style elsewhere. */
function ProgressBar({ value, target, color }: { value: number; target: number | null; color: string }) {
  if (!target || target <= 0) return null;
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <View className="h-1.5 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden">
      <View className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </View>
  );
}

export default function NutritionDiaryScreen() {
  const router = useRouter();
  const foodLog = useAppStore(selectFoodLog);
  const dailyTargets = useAppStore(selectDailyTargets);
  const weightLog = useAppStore(selectWeightLog);
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const savedRecipeIds = useAppStore(selectSavedRecipeIds);
  const aiGeneratedRecipes = useAppStore(selectAiGeneratedRecipes);
  const customMeals = useAppStore(selectCustomMeals);
  const logFood = useAppStore((s) => s.logFood);
  const removeFoodLogEntry = useAppStore((s) => s.removeFoodLogEntry);
  const updateFoodLogEntry = useAppStore((s) => s.updateFoodLogEntry);
  const setDailyTargets = useAppStore((s) => s.setDailyTargets);
  const saveCustomMeal = useAppStore((s) => s.saveCustomMeal);
  const updateCustomMeal = useAppStore((s) => s.updateCustomMeal);
  const removeCustomMeal = useAppStore((s) => s.removeCustomMeal);

  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [addingToMeal, setAddingToMeal] = useState<MealType | null>(null);
  const [addTab, setAddTab] = useState<AddTab>('search');
  const [search, setSearch] = useState('');
  const [pickedFood, setPickedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState('1');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [pickedRecipe, setPickedRecipe] = useState<Recipe | null>(null);
  const [recipeServings, setRecipeServings] = useState('1');
  const [editingTargets, setEditingTargets] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [targetCalInput, setTargetCalInput] = useState(dailyTargets?.calories ? String(dailyTargets.calories) : '');
  const [targetProInput, setTargetProInput] = useState(dailyTargets?.protein ? String(dailyTargets.protein) : '');
  const [targetCarbInput, setTargetCarbInput] = useState(dailyTargets?.carbs ? String(dailyTargets.carbs) : '');
  const [targetFatInput, setTargetFatInput] = useState(dailyTargets?.fat ? String(dailyTargets.fat) : '');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCal, setEditCal] = useState('');
  const [editPro, setEditPro] = useState('');
  const [editCarb, setEditCarb] = useState('');
  const [editFat, setEditFat] = useState('');
  const [scannerCallback, setScannerCallback] = useState<((item: FoodItem) => void) | null>(null);
  const [liveResults, setLiveResults] = useState<FoodItem[]>([]);
  const [liveSearching, setLiveSearching] = useState(false);
  const [showMealBuilder, setShowMealBuilder] = useState(false);
  const [pickedMeal, setPickedMeal] = useState<CustomMeal | null>(null);
  const [mealServings, setMealServings] = useState('1');
  const [mealSearch, setMealSearch] = useState('');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealName, setEditMealName] = useState('');
  const [editMealCal, setEditMealCal] = useState('');
  const [editMealPro, setEditMealPro] = useState('');
  const [editMealCarb, setEditMealCarb] = useState('');
  const [editMealFat, setEditMealFat] = useState('');
  const [showQuickFood, setShowQuickFood] = useState(false);
  const [qfName, setQfName] = useState('');
  const [qfCal, setQfCal] = useState('');
  const [qfPro, setQfPro] = useState('');
  const [qfCarb, setQfCarb] = useState('');
  const [qfFat, setQfFat] = useState('');

  const entriesForDay = useMemo(() => (foodLog || []).filter((f) => f.date === selectedDate), [foodLog, selectedDate]);

  const totals = useMemo(() => {
    return entriesForDay.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [entriesForDay]);

  // The most recent logged weight is the input to the estimate — an
  // old entry from months ago would produce a stale/wrong suggestion,
  // but there's no freshness cutoff enforced here since even a dated
  // entry is a better starting point than nothing, and the person can
  // always adjust the numbers after accepting the suggestion.
  const latestWeightLbs = useMemo(() => {
    const sorted = [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.weightLbs ?? null;
  }, [weightLog]);

  const suggestedTargets = useMemo(
    () => estimateDailyTargets(latestWeightLbs, fitnessPreferences),
    [latestWeightLbs, fitnessPreferences]
  );

  const showSuggestionBanner = !dailyTargets?.calories && !!suggestedTargets && !suggestionDismissed && !editingTargets;
  const showLogWeightNudge = !dailyTargets?.calories && !suggestedTargets && !suggestionDismissed && !editingTargets;

  const handleUseSuggestedTargets = async () => {
    if (!suggestedTargets) return;
    await setDailyTargets({
      calories: suggestedTargets.calories,
      protein: suggestedTargets.protein,
      carbs: suggestedTargets.carbs,
      fat: suggestedTargets.fat,
    });
  };

  const searchResults = useMemo(() => searchFoodDatabase(search).slice(0, 12), [search]);

  // Local curated list shows instantly; live results from Open Food
  // Facts are appended once they arrive, debounced so it doesn't fire
  // a network request on every keystroke. Local results are deduped
  // out of the live list by name so nothing shows twice.
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setLiveResults([]);
      setLiveSearching(false);
      return;
    }
    setLiveSearching(true);
    const timeout = setTimeout(async () => {
      const results = await searchOpenFoodFacts(query);
      const localNames = new Set(searchResults.map((r) => r.name.toLowerCase()));
      setLiveResults(results.filter((r) => !localNames.has(r.name.toLowerCase())));
      setLiveSearching(false);
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const combinedSearchResults = useMemo(() => [...searchResults, ...liveResults], [searchResults, liveResults]);

  // Anything logged before as a custom meal/food is saved to
  // customMeals — surfacing name matches for it right in the main
  // Search tab is what makes a once-entered food actually reusable
  // next time, instead of only being findable by digging into My Meals.
  const savedFoodMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (customMeals || []).filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [customMeals, search]);

  const allRecipes = useMemo(() => [...(RECIPES || []), ...(aiGeneratedRecipes || [])], [aiGeneratedRecipes]);
  const recipeResults = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    const pool = q ? allRecipes.filter((r) => r.n.toLowerCase().includes(q)) : allRecipes.filter((r) => savedRecipeIds.includes(r.id));
    return pool.slice(0, 12);
  }, [allRecipes, recipeSearch, savedRecipeIds]);

  const mealListResults = useMemo(() => {
    const q = mealSearch.trim().toLowerCase();
    const pool = q ? (customMeals || []).filter((m) => m.name.toLowerCase().includes(q)) : (customMeals || []);
    return pool.slice(0, 20);
  }, [customMeals, mealSearch]);

  const resetAddFlow = () => {
    setAddingToMeal(null);
    setAddTab('search');
    setSearch('');
    setPickedFood(null);
    setServings('1');
    setRecipeSearch('');
    setPickedRecipe(null);
    setRecipeServings('1');
    setShowMealBuilder(false);
    setPickedMeal(null);
    setMealServings('1');
    setMealSearch('');
    setEditingMealId(null);
    setShowQuickFood(false);
    setQfName(''); setQfCal(''); setQfPro(''); setQfCarb(''); setQfFat('');
  };

  const handleLogPickedFood = async () => {
    if (!pickedFood || !addingToMeal) return;
    const multiplier = Number(servings) || 1;
    await logFood({
      date: selectedDate,
      mealType: addingToMeal,
      foodName: pickedFood.chain ? `${pickedFood.name} — ${pickedFood.chain}` : pickedFood.name,
      servings: multiplier,
      calories: Math.round(pickedFood.calories * multiplier),
      protein: Math.round(pickedFood.protein * multiplier),
      carbs: Math.round(pickedFood.carbs * multiplier),
      fat: Math.round(pickedFood.fat * multiplier),
    });
    resetAddFlow();
  };

  const handleLogPickedRecipe = async () => {
    if (!pickedRecipe || !addingToMeal) return;
    const multiplier = Number(recipeServings) || 1;
    await logFood({
      date: selectedDate,
      mealType: addingToMeal,
      foodName: pickedRecipe.n,
      servings: multiplier,
      calories: Math.round((pickedRecipe.cal || 0) * multiplier),
      protein: Math.round(parseGramString(pickedRecipe.pro) * multiplier),
      carbs: Math.round(parseGramString(pickedRecipe.carb) * multiplier),
      fat: Math.round(parseGramString(pickedRecipe.fat) * multiplier),
    });
    resetAddFlow();
  };

  const handleLogPickedMeal = async () => {
    if (!pickedMeal || !addingToMeal) return;
    const multiplier = Number(mealServings) || 1;
    await logFood({
      date: selectedDate,
      mealType: addingToMeal,
      foodName: pickedMeal.name,
      servings: multiplier,
      calories: Math.round(pickedMeal.calories * multiplier),
      protein: Math.round(pickedMeal.protein * multiplier),
      carbs: Math.round(pickedMeal.carbs * multiplier),
      fat: Math.round(pickedMeal.fat * multiplier),
    });
    resetAddFlow();
  };

  const handleSaveNewMeal = async (name: string, ingredients: CustomMealIngredient[]) => {
    if (!addingToMeal) return;
    const totals = ingredients.reduce(
      (acc, i) => ({ calories: acc.calories + i.calories, protein: acc.protein + i.protein, carbs: acc.carbs + i.carbs, fat: acc.fat + i.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    const saved = await saveCustomMeal({ name, ingredients, ...totals });
    await logFood({
      date: selectedDate,
      mealType: addingToMeal,
      foodName: saved.name,
      servings: 1,
      calories: saved.calories,
      protein: saved.protein,
      carbs: saved.carbs,
      fat: saved.fat,
    });
    resetAddFlow();
  };

  const handleSaveQuickFood = async () => {
    if (!qfName.trim()) return;
    const ingredient: CustomMealIngredient = {
      name: qfName.trim(),
      calories: Number(qfCal) || 0,
      protein: Number(qfPro) || 0,
      carbs: Number(qfCarb) || 0,
      fat: Number(qfFat) || 0,
    };
    // Reuses the same save-and-log path as "My Meals" — a single-food
    // quick add is just a one-ingredient meal under the hood, so it
    // gets the exact same reuse/search/edit behavior for free.
    await handleSaveNewMeal(qfName.trim(), [ingredient]);
  };

  const handleStartEditMeal = (meal: CustomMeal) => {
    setEditingMealId(meal.id);
    setEditMealName(meal.name);
    setEditMealCal(String(meal.calories));
    setEditMealPro(String(meal.protein));
    setEditMealCarb(String(meal.carbs));
    setEditMealFat(String(meal.fat));
  };

  const handleSaveEditMeal = async () => {
    if (!editingMealId || !editMealName.trim()) return;
    await updateCustomMeal(editingMealId, {
      name: editMealName.trim(),
      calories: Number(editMealCal) || 0,
      protein: Number(editMealPro) || 0,
      carbs: Number(editMealCarb) || 0,
      fat: Number(editMealFat) || 0,
    });
    setEditingMealId(null);
  };

  const handleSaveTargets = async () => {
    await setDailyTargets({
      calories: targetCalInput ? Number(targetCalInput) : null,
      protein: targetProInput ? Number(targetProInput) : null,
      carbs: targetCarbInput ? Number(targetCarbInput) : null,
      fat: targetFatInput ? Number(targetFatInput) : null,
    });
    setEditingTargets(false);
  };

  const handleStartEdit = (entry: FoodLogEntry) => {
    setEditingEntryId(entry.id);
    setEditName(entry.foodName);
    setEditCal(String(entry.calories));
    setEditPro(String(entry.protein));
    setEditCarb(String(entry.carbs));
    setEditFat(String(entry.fat));
  };

  const handleSaveEdit = async () => {
    if (!editingEntryId || !editName.trim()) return;
    await updateFoodLogEntry(editingEntryId, {
      foodName: editName.trim(),
      calories: Number(editCal) || 0,
      protein: Number(editPro) || 0,
      carbs: Number(editCarb) || 0,
      fat: Number(editFat) || 0,
    });
    setEditingEntryId(null);
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <View className="w-full max-w-md self-center">
          <Heading className="mb-1 mt-2">Nutrition Diary</Heading>
          <Text className="text-slate-500 text-sm mb-4">Log what you eat — no perfect days required, just what's true.</Text>

          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={() => setSelectedDate(shiftDate(selectedDate, -1))} className="p-2">
            <Text className="text-indigo-500 text-lg">‹</Text>
          </Pressable>
          <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{formatDateLabel(selectedDate)}</Text>
          <Pressable onPress={() => setSelectedDate(shiftDate(selectedDate, 1))} className="p-2">
            <Text className="text-indigo-500 text-lg">›</Text>
          </Pressable>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">Today's totals</Text>
            <Pressable onPress={() => setEditingTargets(!editingTargets)}>
              <Text className="text-indigo-500 text-xs">{dailyTargets?.calories ? 'Edit targets' : 'Set targets'}</Text>
            </Pressable>
          </View>

          {showSuggestionBanner && suggestedTargets && (
            <View className="bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3 mb-3">
              <Text className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-1">
                Suggested {GOAL_LABEL[suggestedTargets.basedOnGoal]}, based on your logged weight and activity level
              </Text>
              <Text className="text-slate-600 dark:text-slate-300 text-xs mb-3">
                {suggestedTargets.calories} cal · {suggestedTargets.protein}p / {suggestedTargets.carbs}c / {suggestedTargets.fat}f — a starting point, not a prescription. Adjust it anytime.
              </Text>
              <View className="flex-row gap-2">
                <Pressable onPress={handleUseSuggestedTargets} className="flex-1 bg-emerald-500 rounded-xl py-2 items-center active:bg-emerald-400">
                  <Text className="text-white text-xs font-semibold">Use these targets</Text>
                </Pressable>
                <Pressable onPress={() => setSuggestionDismissed(true)} className="py-2 px-3">
                  <Text className="text-slate-500 text-xs">Not now</Text>
                </Pressable>
              </View>
            </View>
          )}

          {showLogWeightNudge && (
            <View className="bg-indigo-400/10 border-2 border-indigo-400 rounded-xl p-3 mb-3">
              <Text className="text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-1">Want targets based on your goals?</Text>
              <Text className="text-slate-600 dark:text-slate-300 text-xs mb-3">
                Log your current weight in Body Progress and Aviva can suggest a calorie and macro target that matches your weight goal and activity level.
              </Text>
              <View className="flex-row gap-2">
                <Pressable onPress={() => router?.push?.('/body/progress')} className="flex-1 bg-indigo-600 rounded-xl py-2 items-center active:bg-indigo-500">
                  <Text className="text-white text-xs font-semibold">Log my weight</Text>
                </Pressable>
                <Pressable onPress={() => setSuggestionDismissed(true)} className="py-2 px-3">
                  <Text className="text-slate-500 text-xs">Not now</Text>
                </Pressable>
              </View>
            </View>
          )}

          {editingTargets ? (
            <View>
              <View className="flex-row gap-2 mb-2">
                <View className="flex-1"><TextInput value={targetCalInput} onChangeText={setTargetCalInput} placeholder="Calories" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                <View className="flex-1"><TextInput value={targetProInput} onChangeText={setTargetProInput} placeholder="Protein g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
              </View>
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1"><TextInput value={targetCarbInput} onChangeText={setTargetCarbInput} placeholder="Carbs g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                <View className="flex-1"><TextInput value={targetFatInput} onChangeText={setTargetFatInput} placeholder="Fat g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
              </View>
              <Text className="text-slate-500 text-[11px] mb-3">These are numbers you choose for yourself — set whatever you want to track toward, or leave blank to just log without targets.</Text>
              <Pressable onPress={handleSaveTargets} className="bg-indigo-600 rounded-xl py-2.5 items-center active:bg-indigo-500">
                <Text className="text-white text-sm font-semibold">Save targets</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2">
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">Calories</Text>
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">{totals.calories}{dailyTargets?.calories ? ` / ${dailyTargets.calories}` : ''}</Text>
                </View>
                <ProgressBar value={totals.calories} target={dailyTargets?.calories ?? null} color="bg-indigo-500" />
              </View>
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">Protein</Text>
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">{totals.protein}g{dailyTargets?.protein ? ` / ${dailyTargets.protein}g` : ''}</Text>
                </View>
                <ProgressBar value={totals.protein} target={dailyTargets?.protein ?? null} color="bg-emerald-500" />
              </View>
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">Carbs</Text>
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">{totals.carbs}g{dailyTargets?.carbs ? ` / ${dailyTargets.carbs}g` : ''}</Text>
                </View>
                <ProgressBar value={totals.carbs} target={dailyTargets?.carbs ?? null} color="bg-amber-500" />
              </View>
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">Fat</Text>
                  <Text className="text-slate-600 dark:text-slate-300 text-xs">{totals.fat}g{dailyTargets?.fat ? ` / ${dailyTargets.fat}g` : ''}</Text>
                </View>
                <ProgressBar value={totals.fat} target={dailyTargets?.fat ?? null} color="bg-red-400" />
              </View>
            </View>
          )}
        </View>

        {MEAL_TYPES.map((meal) => {
          const mealEntries = entriesForDay.filter((e) => e.mealType === meal.id);
          const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);
          return (
            <View key={meal.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{meal.icon} {meal.label}</Text>
                <Text className="text-slate-500 text-xs">{mealCalories > 0 ? `${mealCalories} cal` : ''}</Text>
              </View>

              {mealEntries.map((entry) => (
                editingEntryId === entry.id ? (
                  <View key={entry.id} className="py-2 border-t border-stone-100 dark:border-slate-800">
                    <TextInput value={editName} onChangeText={setEditName} placeholder="Food name" placeholderTextColor="#64748b" className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2" />
                    <View className="flex-row gap-2 mb-2">
                      <View className="flex-1"><TextInput value={editCal} onChangeText={setEditCal} placeholder="Calories" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                      <View className="flex-1"><TextInput value={editPro} onChangeText={setEditPro} placeholder="Protein g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                    </View>
                    <View className="flex-row gap-2 mb-2">
                      <View className="flex-1"><TextInput value={editCarb} onChangeText={setEditCarb} placeholder="Carbs g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                      <View className="flex-1"><TextInput value={editFat} onChangeText={setEditFat} placeholder="Fat g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable onPress={handleSaveEdit} disabled={!editName.trim()} className={editName.trim() ? 'flex-1 bg-indigo-600 rounded-xl py-2 items-center active:bg-indigo-500' : 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-2 items-center'}>
                        <Text className="text-white text-sm font-semibold">Save</Text>
                      </Pressable>
                      <Pressable onPress={() => setEditingEntryId(null)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2 items-center">
                        <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable key={entry.id} onPress={() => handleStartEdit(entry)} className="flex-row items-center justify-between py-1.5 border-t border-stone-100 dark:border-slate-800">
                    <View className="flex-1">
                      <Text className="text-slate-800 dark:text-slate-200 text-sm">{entry.foodName}{entry.servings !== 1 ? ` ×${entry.servings}` : ''}</Text>
                      <Text className="text-slate-500 text-xs">{entry.calories} cal · {entry.protein}p · {entry.carbs}c · {entry.fat}f</Text>
                    </View>
                    <Pressable onPress={() => removeFoodLogEntry(entry.id)} className="p-2">
                      <Text className="text-slate-400 text-xs">✕</Text>
                    </Pressable>
                  </Pressable>
                )
              ))}

              {addingToMeal === meal.id ? (
                <View className="mt-2 pt-2 border-t border-stone-100 dark:border-slate-800">
                  <View className="flex-row gap-2 mb-3">
                    {([
                      { id: 'search', label: 'Search' },
                      { id: 'recipes', label: 'Recipes' },
                      { id: 'mymeals', label: 'My Meals' },
                    ] as { id: AddTab; label: string }[]).map((tab) => (
                      <Pressable
                        key={tab.id}
                        onPress={() => setAddTab(tab.id)}
                        className={addTab === tab.id ? 'flex-1 bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-1.5 items-center' : 'flex-1 bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-1.5 items-center'}
                      >
                        <Text className={addTab === tab.id ? 'text-indigo-700 dark:text-indigo-300 text-xs font-medium' : 'text-slate-600 dark:text-slate-300 text-xs font-medium'}>{tab.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {addTab === 'search' && (
                    <>
                      <View className="flex-row gap-2 mb-2">
                        <TextInput
                          value={search}
                          onChangeText={(v) => { setSearch(v); setPickedFood(null); }}
                          placeholder="Search foods…"
                          placeholderTextColor="#64748b"
                          autoFocus
                          className="flex-1 bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2"
                        />
                        <Pressable
                          onPress={() => setScannerCallback(() => (item: FoodItem) => {
                            setPickedFood(item);
                            setAddTab('search');
                          })}
                          className="bg-indigo-600 rounded-xl px-3 justify-center active:bg-indigo-500"
                        >
                          <Text className="text-white text-sm">📷</Text>
                        </Pressable>
                      </View>
                      {!pickedFood && !search.trim() && (
                        <View className="mb-2">
                          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1.5">Quick add: fast food</Text>
                          <View className="flex-row flex-wrap gap-2">
                            {FAST_FOOD_CHAINS.map((chain) => (
                              <Pressable
                                key={chain}
                                onPress={() => setSearch(chain)}
                                className="bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-1.5 px-3"
                              >
                                <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">{chain}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}
                      {!pickedFood && savedFoodMatches.length > 0 && (
                        <View className="mb-2">
                          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1">⭐ Your saved foods</Text>
                          {savedFoodMatches.map((m) => (
                            <Pressable
                              key={m.id}
                              onPress={() => { setPickedMeal(m); setAddTab('mymeals'); }}
                              className="py-2 border-b border-stone-100 dark:border-slate-800"
                            >
                              <Text className="text-slate-800 dark:text-slate-200 text-sm">{m.name}</Text>
                              <Text className="text-slate-500 text-xs">{m.calories} cal · {m.protein}p / {m.carbs}c / {m.fat}f — logged before, tap to add again</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      {!pickedFood && (
                        <ScrollView className="max-h-48" nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {combinedSearchResults.map((f) => (
                            <Pressable key={f.id} onPress={() => setPickedFood(f)} className="py-2 border-b border-stone-100 dark:border-slate-800">
                              <Text className="text-slate-800 dark:text-slate-200 text-sm">{f.name}{f.chain ? ` — ${f.chain}` : ''}</Text>
                              <Text className="text-slate-500 text-xs">{f.servingLabel} · {f.calories} cal · {f.protein}p / {f.carbs}c / {f.fat}f</Text>
                            </Pressable>
                          ))}
                          {liveSearching && (
                            <View className="flex-row items-center gap-2 py-2">
                              <ActivityIndicator size="small" />
                              <Text className="text-slate-500 text-xs">Searching more foods…</Text>
                            </View>
                          )}
                          {combinedSearchResults.length === 0 && !liveSearching && savedFoodMatches.length === 0 && (
                            <Text className="text-slate-500 text-xs py-2">No matches — log it as a custom food below (it'll be searchable next time too), or scan a barcode.</Text>
                          )}
                        </ScrollView>
                      )}
                      {!pickedFood && !showQuickFood && (
                        <Pressable onPress={() => setShowQuickFood(true)} className="border-2 border-dashed border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center mt-1">
                          <Text className="text-slate-500 text-xs">+ Log a custom food</Text>
                        </Pressable>
                      )}
                      {!pickedFood && showQuickFood && (
                        <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mt-1">
                          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Custom food — saved for next time too</Text>
                          <TextInput
                            value={qfName}
                            onChangeText={setQfName}
                            placeholder="Food name"
                            placeholderTextColor="#64748b"
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2"
                          />
                          <View className="flex-row gap-2 mb-2">
                            <View className="flex-1"><TextInput value={qfCal} onChangeText={setQfCal} placeholder="Calories" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                            <View className="flex-1"><TextInput value={qfPro} onChangeText={setQfPro} placeholder="Protein g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                          </View>
                          <View className="flex-row gap-2 mb-3">
                            <View className="flex-1"><TextInput value={qfCarb} onChangeText={setQfCarb} placeholder="Carbs g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                            <View className="flex-1"><TextInput value={qfFat} onChangeText={setQfFat} placeholder="Fat g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                          </View>
                          <View className="flex-row gap-2">
                            <Pressable onPress={handleSaveQuickFood} disabled={!qfName.trim()} className={qfName.trim() ? 'flex-1 bg-emerald-500 rounded-xl py-2 items-center active:bg-emerald-400' : 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-2 items-center'}>
                              <Text className="text-white text-sm font-semibold">Add to {meal.label.toLowerCase()}</Text>
                            </Pressable>
                            <Pressable onPress={() => { setShowQuickFood(false); setQfName(''); setQfCal(''); setQfPro(''); setQfCarb(''); setQfFat(''); }} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2 items-center">
                              <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                      {pickedFood && (
                        <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mb-2">
                          <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium mb-2">{pickedFood.name}{pickedFood.chain ? ` — ${pickedFood.chain}` : ''}</Text>
                          <View className="flex-row items-center gap-2 mb-2">
                            <Text className="text-slate-500 text-xs">Servings ({pickedFood.servingLabel} each)</Text>
                            <TextInput
                              value={servings}
                              onChangeText={setServings}
                              keyboardType="decimal-pad"
                              className="w-16 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 text-center"
                            />
                          </View>
                          <Pressable onPress={handleLogPickedFood} className="bg-emerald-500 rounded-xl py-2 items-center active:bg-emerald-400">
                            <Text className="text-white text-sm font-semibold">Add to {meal.label.toLowerCase()}</Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}

                  {addTab === 'recipes' && (
                    <>
                      <TextInput
                        value={recipeSearch}
                        onChangeText={(v) => { setRecipeSearch(v); setPickedRecipe(null); }}
                        placeholder="Search recipes… (blank shows your saved ones)"
                        placeholderTextColor="#64748b"
                        className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2"
                      />
                      {!pickedRecipe && (
                        <ScrollView className="max-h-48" nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {recipeResults.map((r) => (
                            <Pressable key={r.id} onPress={() => setPickedRecipe(r)} className="py-2 border-b border-stone-100 dark:border-slate-800">
                              <Text className="text-slate-800 dark:text-slate-200 text-sm">{r.n}</Text>
                              <Text className="text-slate-500 text-xs capitalize">{r.c} · {r.t} · {r.cal} cal · {r.pro}p / {r.carb}c / {r.fat}f</Text>
                            </Pressable>
                          ))}
                          {recipeResults.length === 0 && (
                            <Text className="text-slate-500 text-xs py-2">
                              {recipeSearch.trim() ? 'No matches.' : "No saved recipes yet — search above, or save some from Recipes first."}
                            </Text>
                          )}
                        </ScrollView>
                      )}
                      {pickedRecipe && (
                        <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mb-2">
                          <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium mb-2">{pickedRecipe.n}</Text>
                          <View className="flex-row items-center gap-2 mb-2">
                            <Text className="text-slate-500 text-xs">Servings</Text>
                            <TextInput
                              value={recipeServings}
                              onChangeText={setRecipeServings}
                              keyboardType="decimal-pad"
                              className="w-16 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 text-center"
                            />
                          </View>
                          <Pressable onPress={handleLogPickedRecipe} className="bg-emerald-500 rounded-xl py-2 items-center active:bg-emerald-400">
                            <Text className="text-white text-sm font-semibold">Add to {meal.label.toLowerCase()}</Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}

                  {addTab === 'mymeals' && (
                    <>
                      {showMealBuilder ? (
                        <CustomMealBuilder
                          onSave={handleSaveNewMeal}
                          onCancel={() => setShowMealBuilder(false)}
                          onOpenScanner={(cb) => setScannerCallback(() => cb)}
                        />
                      ) : pickedMeal ? (
                        <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mb-2">
                          <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium mb-2">{pickedMeal.name}</Text>
                          <Text className="text-slate-500 text-xs mb-2">{pickedMeal.calories} cal · {pickedMeal.protein}p / {pickedMeal.carbs}c / {pickedMeal.fat}f per serving</Text>
                          <View className="flex-row items-center gap-2 mb-2">
                            <Text className="text-slate-500 text-xs">Servings</Text>
                            <TextInput
                              value={mealServings}
                              onChangeText={setMealServings}
                              keyboardType="decimal-pad"
                              className="w-16 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 text-center"
                            />
                          </View>
                          <Pressable onPress={handleLogPickedMeal} className="bg-emerald-500 rounded-xl py-2 items-center active:bg-emerald-400">
                            <Text className="text-white text-sm font-semibold">Add to {meal.label.toLowerCase()}</Text>
                          </Pressable>
                          <Pressable onPress={() => setPickedMeal(null)} className="py-2">
                            <Text className="text-slate-500 text-center text-xs">Back</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <>
                          {customMeals.length > 0 && (
                            <TextInput
                              value={mealSearch}
                              onChangeText={setMealSearch}
                              placeholder="Search your saved foods & meals…"
                              placeholderTextColor="#64748b"
                              className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2"
                            />
                          )}
                          <ScrollView className="max-h-56 mb-2" nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            {customMeals.length === 0 && (
                              <Text className="text-slate-500 text-xs py-2">No saved meals yet — build one below, or log a custom food from Search. Either way, it'll be here to reuse and edit next time.</Text>
                            )}
                            {customMeals.length > 0 && mealListResults.length === 0 && (
                              <Text className="text-slate-500 text-xs py-2">No matches.</Text>
                            )}
                            {mealListResults.map((m) => (
                              editingMealId === m.id ? (
                                <View key={m.id} className="py-2 border-b border-stone-100 dark:border-slate-800">
                                  <TextInput value={editMealName} onChangeText={setEditMealName} placeholder="Name" placeholderTextColor="#64748b" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2" />
                                  <View className="flex-row gap-2 mb-2">
                                    <View className="flex-1"><TextInput value={editMealCal} onChangeText={setEditMealCal} placeholder="Calories" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                                    <View className="flex-1"><TextInput value={editMealPro} onChangeText={setEditMealPro} placeholder="Protein g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                                  </View>
                                  <View className="flex-row gap-2 mb-2">
                                    <View className="flex-1"><TextInput value={editMealCarb} onChangeText={setEditMealCarb} placeholder="Carbs g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                                    <View className="flex-1"><TextInput value={editMealFat} onChangeText={setEditMealFat} placeholder="Fat g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
                                  </View>
                                  <View className="flex-row gap-2">
                                    <Pressable onPress={handleSaveEditMeal} disabled={!editMealName.trim()} className={editMealName.trim() ? 'flex-1 bg-indigo-600 rounded-xl py-2 items-center active:bg-indigo-500' : 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-2 items-center'}>
                                      <Text className="text-white text-sm font-semibold">Save</Text>
                                    </Pressable>
                                    <Pressable onPress={() => setEditingMealId(null)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2 items-center">
                                      <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
                                    </Pressable>
                                  </View>
                                </View>
                              ) : (
                                <View key={m.id} className="flex-row items-center justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                                  <Pressable onPress={() => setPickedMeal(m)} className="flex-1">
                                    <Text className="text-slate-800 dark:text-slate-200 text-sm">{m.name}</Text>
                                    <Text className="text-slate-500 text-xs">{m.ingredients.length} ingredient{m.ingredients.length === 1 ? '' : 's'} · {m.calories} cal · {m.protein}p / {m.carbs}c / {m.fat}f</Text>
                                  </Pressable>
                                  <Pressable onPress={() => handleStartEditMeal(m)} className="p-2">
                                    <Text className="text-indigo-500 text-xs">Edit</Text>
                                  </Pressable>
                                  <Pressable onPress={() => removeCustomMeal(m.id)} className="p-2">
                                    <Text className="text-slate-400 text-xs">✕</Text>
                                  </Pressable>
                                </View>
                              )
                            ))}
                          </ScrollView>
                          <Pressable onPress={() => setShowMealBuilder(true)} className="border-2 border-dashed border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center">
                            <Text className="text-slate-500 text-xs">+ Build a new meal</Text>
                          </Pressable>
                        </>
                      )}
                    </>
                  )}

                  <Pressable onPress={resetAddFlow} className="py-2">
                    <Text className="text-slate-500 text-center text-xs">Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setAddingToMeal(meal.id)} className="mt-2 border-2 border-dashed border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center">
                  <Text className="text-slate-500 text-xs">+ Add food</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        </View>
      </ScrollView>

      {scannerCallback && (
        <BarcodeScannerModal
          onFound={(item) => {
            scannerCallback(item);
            setScannerCallback(null);
          }}
          onClose={() => setScannerCallback(null)}
        />
      )}
    </View>
  );
}
