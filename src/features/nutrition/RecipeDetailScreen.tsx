import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAppStore, selectSavedRecipeIds, selectAiGeneratedRecipes, selectRecipeInstructionsCache,
  type MealType,
} from '@/store/index';
import { RECIPES } from '@/content/recipes';
import { parseGramString } from '@/content/foodDatabase';
import { generateRecipeDirections } from './recipeGeneration';
import { Heading } from '@/shared/components/Heading';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { id: 'lunch', label: 'Lunch', icon: '🥪' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
  { id: 'snack', label: 'Snack', icon: '🍪' },
];

function todayLocal(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

export default function RecipeDetailScreen({ recipeId }: { recipeId: string }) {
  const savedRecipeIds = useAppStore(selectSavedRecipeIds);
  const aiGeneratedRecipes = useAppStore(selectAiGeneratedRecipes);
  const instructionsCache = useAppStore(selectRecipeInstructionsCache);
  const toggleSavedRecipe = useAppStore((s) => s.toggleSavedRecipe);
  const setRecipeInstructions = useAppStore((s) => s.setRecipeInstructions);
  const logFood = useAppStore((s) => s.logFood);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [justLogged, setJustLogged] = useState<MealType | null>(null);

  const recipe = useMemo(
    () => [...(RECIPES || []), ...(aiGeneratedRecipes || [])].find((r) => r.id === recipeId),
    [aiGeneratedRecipes, recipeId]
  );

  const isSaved = savedRecipeIds.includes(recipeId);
  const directions = recipe ? (recipe.instructions || instructionsCache[recipeId]) : undefined;

  const handleGenerateDirections = async () => {
    if (!recipe) return;
    setGenerating(true);
    setGenError(null);
    const steps = await generateRecipeDirections(recipe.n, recipe.ing);
    setGenerating(false);
    if (!steps) {
      setGenError("Couldn't generate directions just now — try again in a moment.");
      return;
    }
    await setRecipeInstructions(recipeId, steps);
  };

  const handleLogToMeal = async (mealType: MealType) => {
    if (!recipe) return;
    await logFood({
      date: todayLocal(),
      mealType,
      foodName: recipe.n,
      servings: 1,
      calories: recipe.cal || 0,
      protein: parseGramString(recipe.pro),
      carbs: parseGramString(recipe.carb),
      fat: parseGramString(recipe.fat),
    });
    setShowMealPicker(false);
    setJustLogged(mealType);
    setTimeout(() => setJustLogged(null), 2500);
  };

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">This recipe isn&apos;t here anymore.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="w-full max-w-md self-center">
          <View className="flex-row items-start justify-between mb-2">
            <Heading className="flex-1 pr-3">{recipe.n}</Heading>
            <Pressable onPress={() => toggleSavedRecipe(recipeId)} className="p-1">
              <Text className="text-2xl">{isSaved ? '⭐️' : '☆'}</Text>
            </Pressable>
          </View>
          <Text className="text-slate-500 text-sm mb-1 capitalize">{recipe.c} · {recipe.t} · {recipe.prep} prep · {recipe.cook} cook</Text>
          <Text className="text-slate-500 text-sm mb-3">{recipe.cal} cal · {recipe.pro} protein · {recipe.carb} carb · {recipe.fat} fat</Text>

          {justLogged ? (
            <View className="bg-emerald-400/10 border border-emerald-400 rounded-xl py-3 items-center mb-6">
              <Text className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">Added to today&apos;s {justLogged} ✓</Text>
            </View>
          ) : showMealPicker ? (
            <View className="flex-row gap-2 mb-6">
              {MEAL_TYPES.map((meal) => (
                <Pressable key={meal.id} onPress={() => handleLogToMeal(meal.id)} className="flex-1 bg-white dark:bg-slate-900 rounded-xl py-3 items-center">
                  <Text className="text-base">{meal.icon}</Text>
                  <Text className="text-slate-500 text-[10px] mt-0.5">{meal.label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowMealPicker(false)} className="px-2 justify-center">
                <Text className="text-slate-400 text-xs">✕</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowMealPicker(true)} className="bg-indigo-600 rounded-xl py-3 items-center mb-6 active:bg-indigo-500">
              <Text className="text-white text-sm font-semibold">+ Add to today&apos;s diary</Text>
            </Pressable>
          )}

          <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-2">Ingredients</Text>
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6">
            {(recipe.ing || []).map((item, i) => (
              <Text key={i} className="text-slate-700 dark:text-slate-300 text-sm mb-1.5">• {item}</Text>
            ))}
          </View>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-2">Directions</Text>
          {directions && directions.length > 0 ? (
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6">
              <Text className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wide mb-3">
                ✨ AI-generated from this recipe&apos;s ingredients — not a tested, verified recipe
              </Text>
              {directions.map((step, i) => (
                <View key={i} className="flex-row gap-2 mb-3">
                  <Text className="text-slate-400 text-sm font-semibold">{i + 1}.</Text>
                  <Text className="text-slate-700 dark:text-slate-300 text-sm flex-1">{step}</Text>
                </View>
              ))}
              <Pressable onPress={handleGenerateDirections} disabled={generating} className="py-2">
                <Text className="text-indigo-500 text-xs">{generating ? 'Regenerating…' : 'Regenerate directions'}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6">
              <Text className="text-slate-500 text-xs mb-3">
                This recipe doesn&apos;t have directions yet. Generate a realistic set of steps from its ingredients — clearly AI-written, not a tested recipe.
              </Text>
              <Pressable
                onPress={handleGenerateDirections}
                disabled={generating}
                className={generating ? 'bg-slate-300 dark:bg-slate-700 rounded-xl py-3 items-center' : 'bg-emerald-500 rounded-xl py-3 items-center active:bg-emerald-400'}
              >
                {generating ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#fff" size="small" />
                    <Text className="text-white text-sm font-semibold">Generating directions…</Text>
                  </View>
                ) : (
                  <Text className="text-white text-sm font-semibold">✨ Generate directions</Text>
                )}
              </Pressable>
              {genError && <Text className="text-red-500 text-xs mt-2">{genError}</Text>}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
