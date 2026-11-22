import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import {
  useAppStore, selectSavedRecipeIds, selectPantryItems, selectCheckedIngredients,
  selectAiGeneratedRecipes, selectNutritionPreferences, selectFitnessPreferences, selectMealPlan, selectMealPlanChecked,
} from '@/store/index';
import { RECIPES, type Recipe } from '@/content/recipes';
import { buildMergedGroceryList } from '@/content/groceryListBuilder';
import { generateWeeklyMealPlan, PLAN_DAYS, PLAN_MEAL_TYPES, type PlanDay, type PlanMealType } from './mealPlanGeneration';
import { Heading } from '@/shared/components/Heading';

const DAY_LABELS: Record<PlanDay, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};
const MEAL_ICONS: Record<PlanMealType, string> = { breakfast: '🍳', lunch: '🥪', dinner: '🍽️' };

/** Fraction of a recipe's ingredients present in the pantry list, 0–1. */
function matchScore(recipe: Recipe, pantry: string[]): number {
  const ingredients = recipe.g || [];
  if (!pantry.length || !ingredients.length) return 0;
  const pantryLower = pantry.map((p) => p.toLowerCase().trim());
  const matched = ingredients.filter((i) => pantryLower.some((p) => i.toLowerCase().includes(p))).length;
  return matched / ingredients.length;
}

export default function GroceryScreen() {
  const savedRecipeIds = useAppStore(selectSavedRecipeIds);
  const pantryItems = useAppStore(selectPantryItems);
  const checkedIngredients = useAppStore(selectCheckedIngredients);
  const aiGeneratedRecipes = useAppStore(selectAiGeneratedRecipes);
  const nutritionPreferences = useAppStore(selectNutritionPreferences);
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const mealPlan = useAppStore(selectMealPlan);
  const mealPlanChecked = useAppStore(selectMealPlanChecked);
  const addPantryItem = useAppStore((s) => s.addPantryItem);
  const removePantryItem = useAppStore((s) => s.removePantryItem);
  const toggleCheckedIngredient = useAppStore((s) => s.toggleCheckedIngredient);
  const clearCheckedIngredients = useAppStore((s) => s.clearCheckedIngredients);
  const setMealPlan = useAppStore((s) => s.setMealPlan);
  const toggleMealPlanChecked = useAppStore((s) => s.toggleMealPlanChecked);

  const [shoppingMode, setShoppingMode] = useState(false);
  const [newPantryItem, setNewPantryItem] = useState('');
  const [showPantry, setShowPantry] = useState(false);
  const [showCanMake, setShowCanMake] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const allRecipes = useMemo(() => [...(RECIPES || []), ...(aiGeneratedRecipes || [])], [aiGeneratedRecipes]);

  const savedRecipes = useMemo(
    () => allRecipes.filter((r) => (savedRecipeIds || []).includes(r.id)),
    [allRecipes, savedRecipeIds]
  );

  // Meal-plan meals feed the grocery list exactly like saved recipes —
  // this is what makes "generate a plan" also mean "populate my list,"
  // not two disconnected features.
  const planMealsAsRecipeLike = useMemo(() => {
    if (!mealPlan) return [];
    const out: { n: string; g: string[] }[] = [];
    for (const day of PLAN_DAYS) {
      const dayPlan = mealPlan.days[day];
      if (!dayPlan) continue;
      for (const mealType of PLAN_MEAL_TYPES) {
        const meal = dayPlan[mealType];
        if (meal) out.push({ n: meal.name, g: meal.ingredients });
      }
    }
    return out;
  }, [mealPlan]);

  const groceryList = useMemo(
    () => buildMergedGroceryList([...savedRecipes, ...planMealsAsRecipeLike], pantryItems),
    [savedRecipes, planMealsAsRecipeLike, pantryItems]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof groceryList>();
    for (const item of groceryList) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [groceryList]);

  const canMakeRecipes = useMemo(() => {
    if (!pantryItems.length) return [];
    return allRecipes
      .map((r) => ({ recipe: r, score: matchScore(r, pantryItems) }))
      .filter((r) => r.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [allRecipes, pantryItems]);

  const handleAddPantryItem = () => {
    if (!newPantryItem.trim()) return;
    addPantryItem(newPantryItem);
    setNewPantryItem('');
  };

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    const plan = await generateWeeklyMealPlan(nutritionPreferences, fitnessPreferences);
    setPlanLoading(false);
    if (!plan) {
      setPlanError("Couldn't generate a plan just now — try again in a moment.");
      return;
    }
    await setMealPlan(plan);
  };

  const hasAnything = savedRecipes.length > 0 || !!mealPlan;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <View className="w-full max-w-md self-center">
        <View className="flex-row items-center justify-between mb-1 mt-2">
          <Heading>Groceries</Heading>
          {hasAnything && (
            <Pressable onPress={() => setShoppingMode(!shoppingMode)}>
              <Text className="text-indigo-400 text-sm font-medium">
                {shoppingMode ? 'Exit shopping mode' : 'Shopping mode'}
              </Text>
            </Pressable>
          )}
        </View>
        <Text className="text-slate-500 text-sm mb-6">
          {hasAnything
            ? `${groceryList.length} item${groceryList.length === 1 ? '' : 's'} from ${savedRecipes.length} saved recipe${savedRecipes.length === 1 ? '' : 's'}${mealPlan ? ' + your meal plan' : ''}`
            : 'Save a few recipes or generate a meal plan and your grocery list builds itself here.'}
        </Text>

        {!shoppingMode && (
          <Pressable onPress={() => setShowPantry(!showPantry)} className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900 surf3d surf3d-tap">
            <Text className="text-slate-900 text-sm font-medium mb-1 dark:text-slate-100">
              🥫 Pantry ({(pantryItems || []).length} item{(pantryItems || []).length === 1 ? '' : 's'})
            </Text>
            <Text className="text-slate-500 text-xs">
              Things you already have. Left off your list automatically, and used to suggest recipes you can already make.
            </Text>
          </Pressable>
        )}

        {!shoppingMode && showPantry && (
          <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900 surf3d">
            <View className="flex-row gap-2 mb-3">
              <TextInput
                value={newPantryItem}
                onChangeText={setNewPantryItem}
                placeholder="e.g. olive oil"
                placeholderTextColor="#64748b"
                onSubmitEditing={handleAddPantryItem}
                className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800 inset3d"
              />
              <Pressable onPress={handleAddPantryItem} className="bg-indigo-600 rounded-xl px-4 justify-center btn3d btn3d-p">
                <Text className="text-white text-sm font-semibold">Add</Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {(pantryItems || []).map((item) => (
                <Pressable key={item} onPress={() => removePantryItem(item)} className="bg-stone-100 rounded-full py-1.5 px-3 dark:bg-slate-800">
                  <Text className="text-slate-700 text-xs capitalize dark:text-slate-300">{item} ✕</Text>
                </Pressable>
              ))}
              {(pantryItems || []).length === 0 && (
                <Text className="text-slate-600 text-xs dark:text-slate-300">No pantry items yet.</Text>
              )}
            </View>
          </View>
        )}

        {!shoppingMode && pantryItems.length > 0 && (
          <Pressable onPress={() => setShowCanMake(!showCanMake)} className="bg-emerald-400/10 border-2 border-emerald-400 rounded-2xl p-4 mb-4">
            <Text className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">
              🥘 {canMakeRecipes.length} recipe{canMakeRecipes.length === 1 ? '' : 's'} you can mostly make right now {showCanMake ? '▲' : '▼'}
            </Text>
          </Pressable>
        )}

        {!shoppingMode && showCanMake && (
          <View className="gap-2 mb-4">
            {canMakeRecipes.length === 0 && (
              <Text className="text-slate-500 text-xs">Add a few more pantry items to see matches.</Text>
            )}
            {canMakeRecipes.map(({ recipe, score }) => (
              <View key={recipe.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 flex-row items-center justify-between surf3d">
                <View className="flex-1 pr-2">
                  <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium">{recipe.n}</Text>
                  <Text className="text-slate-500 text-xs capitalize">{recipe.c} · {recipe.t}</Text>
                </View>
                <Text className={score >= 0.7 ? 'text-emerald-600 dark:text-emerald-400 text-xs font-semibold' : 'text-amber-600 dark:text-amber-400 text-xs font-semibold'}>
                  {score >= 0.7 ? '✓ Can Make' : '~ Most Items'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!shoppingMode && (
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 surf3d">
            <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">✨ Weekly Meal Plan</Text>
            <Text className="text-slate-500 text-xs mb-3">
              A full 7-day breakfast/lunch/dinner plan tailored to your allergies and preferences. Tap ✓ to mark a meal made — its ingredients are already in your grocery list above.
            </Text>
            <Pressable
              onPress={handleGeneratePlan}
              disabled={planLoading}
              className={planLoading ? 'bg-slate-300 dark:bg-slate-700 rounded-xl py-3 items-center' : 'bg-emerald-500 rounded-xl py-3 items-center active:bg-emerald-400 btn3d btn3d-s'}
            >
              {planLoading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#fff" size="small" />
                  <Text className="text-white font-semibold text-sm">Generating your plan…</Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-sm">{mealPlan ? '🔄 Regenerate Plan' : '✨ Generate My Plan'}</Text>
              )}
            </Pressable>
            {planError && <Text className="text-red-500 text-xs mt-2">{planError}</Text>}

            {mealPlan && (
              <View className="mt-4">
                {mealPlan.tips.length > 0 && (
                  <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3 mb-3 surf3d surf3d-in">
                    <Text className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">💡 Nutrition Tips</Text>
                    {mealPlan.tips.map((tip, i) => (
                      <Text key={i} className="text-slate-600 dark:text-slate-300 text-xs mb-1">→ {tip}</Text>
                    ))}
                  </View>
                )}
                {PLAN_DAYS.map((day) => {
                  const dayPlan = mealPlan.days[day];
                  if (!dayPlan) return null;
                  return (
                    <View key={day} className="mb-3">
                      <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">{DAY_LABELS[day]}</Text>
                      {PLAN_MEAL_TYPES.map((mealType) => {
                        const meal = dayPlan[mealType];
                        if (!meal) return null;
                        const key = `${day}_${mealType}`;
                        const done = mealPlanChecked.includes(key);
                        return (
                          <Pressable
                            key={mealType}
                            onPress={() => toggleMealPlanChecked(day, mealType)}
                            className="flex-row items-center gap-3 py-2 border-b border-stone-100 dark:border-slate-800"
                          >
                            <View className={done ? 'w-6 h-6 rounded-full bg-emerald-500 items-center justify-center' : 'w-6 h-6 rounded-full border-2 border-stone-300 dark:border-slate-700 items-center justify-center'}>
                              {done && <Text className="text-white text-xs font-bold">✓</Text>}
                            </View>
                            <View className="flex-1">
                              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">{MEAL_ICONS[mealType]} {mealType}</Text>
                              <Text className={done ? 'text-slate-400 text-sm line-through' : 'text-slate-800 dark:text-slate-200 text-sm'}>{meal.name}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {shoppingMode ? (
          <View className="gap-1">
            {[...groceryList]
              .sort((a, b) => {
                const aChecked = checkedIngredients.includes(a.ingredient) ? 1 : 0;
                const bChecked = checkedIngredients.includes(b.ingredient) ? 1 : 0;
                return aChecked - bChecked;
              })
              .map((item) => {
                const isChecked = checkedIngredients.includes(item.ingredient);
                return (
                  <Pressable
                    key={item.ingredient}
                    onPress={() => toggleCheckedIngredient(item.ingredient)}
                    className="bg-white rounded-xl p-4 flex-row items-center gap-3 dark:bg-slate-900 surf3d surf3d-tap"
                  >
                    <View className={isChecked ? 'w-6 h-6 rounded-md bg-emerald-500 items-center justify-center' : 'w-6 h-6 rounded-md border-2 border-stone-300'}>
                      {isChecked && <Text className="text-white text-xs">✓</Text>}
                    </View>
                    <Text className={isChecked ? 'text-slate-500 line-through text-lg capitalize' : 'text-slate-900 dark:text-slate-100 text-lg capitalize'}>
                      {item.ingredient}
                    </Text>
                  </Pressable>
                );
              })}
            {groceryList.length > 0 && (
              <Pressable onPress={clearCheckedIngredients} className="py-3 mt-2">
                <Text className="text-slate-600 text-center text-sm dark:text-slate-300">Uncheck everything</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="gap-4">
            {grouped.map(([category, items]) => (
              <View key={category}>
                <Text className="text-slate-500 text-xs font-medium mb-2">{category} ({items.length})</Text>
                <View className="gap-2">
                  {items.map((item) => (
                    <View key={item.ingredient} className="bg-white rounded-xl p-3 dark:bg-slate-900 surf3d">
                      <Text className="text-slate-900 text-sm capitalize mb-1 dark:text-slate-100">{item.ingredient}</Text>
                      <Text className="text-slate-500 text-xs">Used for: {item.usedFor.join(', ')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
