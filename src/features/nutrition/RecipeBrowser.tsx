import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, ActivityIndicator } from 'react-native';
import {
  useAppStore, selectSavedRecipeIds, selectNutritionPreferences, selectNutritionCardDismissed,
  selectWellnessPreferences, selectAiGeneratedRecipes, selectFitnessPreferences, type MealType,
} from '@/store/index';
import PersonalizeNutritionCard from './PersonalizeNutritionCard';
import { RECIPES, type Recipe } from '@/content/recipes';
import { parseGramString } from '@/content/foodDatabase';
import { getBloodTypeAffinity } from '@/content/bloodTypeAffinities';
import { generateRecipeWithAI } from './recipeGeneration';
import { useRouter } from 'expo-router';
import { Heading } from '@/shared/components/Heading';

const DIARY_MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { id: 'lunch', label: 'Lunch', icon: '🥪' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
  { id: 'snack', label: 'Snack', icon: '🍪' },
];

function todayLocal(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

const CUISINES = ['all', 'jamaican', 'american', 'southern', 'italian', 'mexican', 'caribbean', 'japanese'];
const MEAL_TYPES = ['all', 'breakfast', 'lunch', 'dinner'];

export default function RecipeBrowser() {
  const router = useRouter();
  const savedRecipeIds = useAppStore(selectSavedRecipeIds);
  const toggleSavedRecipe = useAppStore((s) => s.toggleSavedRecipe);
  const nutritionPreferences = useAppStore(selectNutritionPreferences);
  const nutritionCardDismissed = useAppStore(selectNutritionCardDismissed);
  const wellnessPreferences = useAppStore(selectWellnessPreferences);
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const aiGeneratedRecipes = useAppStore(selectAiGeneratedRecipes);
  const addAiGeneratedRecipe = useAppStore((s) => s.addAiGeneratedRecipe);

  const [cuisine, setCuisine] = useState('all');
  const [mealType, setMealType] = useState('all');
  const [search, setSearch] = useState('');
  const [lovedFilter, setLovedFilter] = useState(false);
  const [showAvoided, setShowAvoided] = useState(false);
  const [bloodTypeFilter, setBloodTypeFilter] = useState<'all' | 'beneficial' | 'avoid'>('all');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const allergies = nutritionPreferences?.allergies || [];
  const restrictions = (nutritionPreferences?.dietaryRestrictions || []).filter((r) => r !== 'none');
  const foodsLoved = (nutritionPreferences?.foodsLoved || []).map((f) => f.toLowerCase());
  const foodsAvoided = (nutritionPreferences?.foodsAvoided || []).map((f) => f.toLowerCase());
  const bloodType = wellnessPreferences?.bloodTypeEnabled ? wellnessPreferences?.bloodType : null;

  // Same soft-boost pattern as the dietary-restriction sort below: a
  // weight goal reorders results toward recipes that fit it better, it
  // never hides anything. No goal set at all just leaves order
  // untouched — this only ever activates once someone has actually told
  // the app what they're going for (in Fitness Preferences).
  const weightGoalDirections = fitnessPreferences?.weightGoalDirections || [];
  const weightGoal: 'lose' | 'gain' | null = weightGoalDirections.includes('lose')
    ? 'lose'
    : weightGoalDirections.includes('gain')
      ? 'gain'
      : null;

  const recipeMatchesGoal = (r: Recipe): boolean => {
    if (!weightGoal) return false;
    const protein = parseGramString(r.pro);
    const proteinPerCal = r.cal > 0 ? protein / r.cal : 0;
    if (weightGoal === 'lose') return r.cal <= 700 && proteinPerCal >= 0.05;
    return r.cal >= 780; // gain: favor higher-calorie meals
  };

  const goalBadge = (r: Recipe): string | null => {
    if (!recipeMatchesGoal(r)) return null;
    return weightGoal === 'lose' ? '🥗 Lighter, high-protein pick' : '💪 Higher-calorie pick';
  };

  const allRecipes = useMemo(() => [...(RECIPES || []), ...(aiGeneratedRecipes || [])], [aiGeneratedRecipes]);

  const recipeHasAvoided = (r: Recipe) => {
    const ingredients = (r.g || []).map((i) => i.toLowerCase());
    return foodsAvoided.some((a) => ingredients.some((i) => i.includes(a)));
  };

  // Performance fix: this whole chain (allergy/avoided filtering,
  // restriction+goal sorting, then cuisine/type/search/loved/blood-type
  // filtering) used to be plain consts recomputed from scratch on
  // every render — including every single keystroke in the search box,
  // since search is component state and any state change re-renders
  // this whole component. Each stage does full-array .filter()/.sort()
  // with nested .some() calls for ingredient matching, so retyping a
  // few characters quickly reran the entire pipeline that many times
  // in a row. Wrapping in useMemo means it only actually recomputes
  // when something in its dependency list changed, not on unrelated
  // re-renders, and the search-only refinement is split into its own
  // smaller memo so typing doesn't redo the more expensive
  // allergy/restriction/goal passes every keystroke either.
  const filteredByPreferences = useMemo(() => allRecipes.filter((r) => {
    const ingredients = (r.g || []).map((i) => i.toLowerCase());
    // Hard filter: never show a recipe containing a stated allergen.
    const hasAllergen = allergies.some((a) => ingredients.some((i) => i.includes(a)));
    if (hasAllergen) return false;
    // Foods to avoid are a softer preference than an allergy — hidden
    // by default, but visible on request via the toggle below, never
    // permanently hidden the way an allergen is.
    if (!showAvoided && recipeHasAvoided(r)) return false;
    return true;
  }), [allRecipes, allergies, foodsAvoided, showAvoided]);

  const sortedByRestrictions = useMemo(() => (
    restrictions.length || weightGoal
      ? [...filteredByPreferences].sort((a, b) => {
          // Soft boost only — dietary preference and weight goal reorder
          // results, neither ever hides anything the way an allergy does.
          // Restriction match is the primary key (it was here first and
          // reflects a stated food need); goal match only breaks ties
          // within that, so someone's restrictions are never overridden
          // by a lighter/higher-calorie pick.
          const aRestriction = restrictions.some((r) => (a.g || []).some((i) => i.toLowerCase().includes(r))) ? 0 : 1;
          const bRestriction = restrictions.some((r) => (b.g || []).some((i) => i.toLowerCase().includes(r))) ? 0 : 1;
          if (aRestriction !== bRestriction) return aRestriction - bRestriction;
          const aGoal = recipeMatchesGoal(a) ? 0 : 1;
          const bGoal = recipeMatchesGoal(b) ? 0 : 1;
          return aGoal - bGoal;
        })
      : filteredByPreferences
  ), [filteredByPreferences, restrictions, weightGoal]);

  const filtered = useMemo(() => sortedByRestrictions.filter((r) => {
    const matchesCuisine = cuisine === 'all' || r.c === cuisine;
    const matchesType = mealType === 'all' || r.t === mealType;
    const matchesSearch = !search.trim() || (r.n || '').toLowerCase().includes(search.toLowerCase());
    const ingredients = (r.g || []).map((i) => i.toLowerCase());
    const matchesLoved = !lovedFilter || foodsLoved.some((f) => ingredients.some((i) => i.includes(f)));
    const affinity = getBloodTypeAffinity(r, bloodType);
    const matchesBloodType = bloodTypeFilter === 'all' || affinity === bloodTypeFilter;
    return matchesCuisine && matchesType && matchesSearch && matchesLoved && matchesBloodType;
  }), [sortedByRestrictions, cuisine, mealType, search, lovedFilter, foodsLoved, bloodTypeFilter, bloodType]);

  const hiddenAvoidedCount = useMemo(() => allRecipes.filter(recipeHasAvoided).length, [allRecipes, foodsAvoided]);
  const showGenerateButton = search.trim().length > 2 && filtered.length === 0;

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    const recipe = await generateRecipeWithAI(search.trim());
    setGenerating(false);
    if (!recipe) {
      setGenError("Couldn't generate that one — try rephrasing, or try again in a moment.");
      return;
    }
    await addAiGeneratedRecipe(recipe);
  };

  return (
    <View className="flex-1">
      <View className="px-4 pt-4 w-full max-w-md self-center">
        <Heading className="mb-1">Recipes</Heading>
        <Text className="text-slate-500 text-sm mb-4">Simple, high-protein meals, browsable by cuisine and time of day.</Text>

        {!nutritionCardDismissed && <PersonalizeNutritionCard />}

        <TextInput
          value={search}
          onChangeText={(v) => { setSearch(v); setGenError(null); }}
          placeholder="Search or describe a recipe…"
          placeholderTextColor="#64748b"
          className="bg-white text-slate-900 rounded-xl px-4 py-3 mb-3 dark:text-slate-100 dark:bg-slate-900"
        />

        {showGenerateButton && (
          <Pressable
            onPress={handleGenerate}
            disabled={generating}
            className={generating ? 'bg-slate-300 dark:bg-slate-700 rounded-xl py-3 mb-3 items-center' : 'bg-emerald-500 rounded-xl py-3 mb-3 items-center active:bg-emerald-400'}
          >
            {generating ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-white font-semibold text-sm">Generating recipe…</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-sm">✨ Generate: "{search.trim()}"</Text>
            )}
          </Pressable>
        )}
        {genError && <Text className="text-red-500 text-xs mb-3">{genError}</Text>}

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MEAL_TYPES}
          keyExtractor={(item) => item}
          style={{ height: 40, flexGrow: 0, marginBottom: 8 }}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setMealType(item)}
              className={mealType === item ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-2 px-4' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-full py-2 px-4'}
            >
              <Text className={mealType === item ? 'text-indigo-700 dark:text-indigo-300 text-xs capitalize' : 'text-slate-700 dark:text-slate-300 text-xs capitalize'}>{item}</Text>
            </Pressable>
          )}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CUISINES}
          keyExtractor={(item) => item}
          style={{ height: 40, flexGrow: 0, marginBottom: 10 }}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCuisine(item)}
              className={cuisine === item ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 px-4' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-full py-2 px-4'}
            >
              <Text className={cuisine === item ? 'text-emerald-700 dark:text-emerald-400 text-xs capitalize' : 'text-slate-700 dark:text-slate-300 text-xs capitalize'}>{item}</Text>
            </Pressable>
          )}
        />

        {foodsLoved.length > 0 && (
          <Pressable
            onPress={() => setLovedFilter((f) => !f)}
            className={lovedFilter ? 'self-start bg-pink-400/10 border-2 border-pink-400 rounded-full py-1.5 px-3 mb-3' : 'self-start bg-white dark:bg-slate-900 border-2 border-transparent rounded-full py-1.5 px-3 mb-3'}
          >
            <Text className={lovedFilter ? 'text-pink-500 text-xs font-semibold' : 'text-slate-600 dark:text-slate-300 text-xs font-semibold'}>
              {lovedFilter ? '❤️ Foods I love (on)' : '❤️ Foods I love'}
            </Text>
          </Pressable>
        )}

        {bloodType && (
          <View className="flex-row gap-2 mb-3">
            {(['all', 'beneficial', 'avoid'] as const).map((option) => {
              const isActive = bloodTypeFilter === option;
              const label = option === 'all' ? `${bloodType} type: All` : option === 'beneficial' ? '✅ Best for me' : '❌ Avoid';
              return (
                <Pressable
                  key={option}
                  onPress={() => setBloodTypeFilter(option)}
                  className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-1.5 px-3' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-full py-1.5 px-3'}
                >
                  <Text className={isActive ? 'text-emerald-700 dark:text-emerald-400 text-xs font-medium' : 'text-slate-600 dark:text-slate-300 text-xs font-medium'}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {hiddenAvoidedCount > 0 && (
          <View className="bg-amber-400/10 border border-amber-400/40 rounded-xl px-3 py-2 mb-3 flex-row items-center justify-between">
            <Text className="text-amber-700 dark:text-amber-400 text-xs flex-1">
              {showAvoided ? 'Showing all recipes (incl. avoided foods)' : `${hiddenAvoidedCount} recipe${hiddenAvoidedCount === 1 ? '' : 's'} hidden (your avoid list)`}
            </Text>
            <Pressable onPress={() => setShowAvoided((s) => !s)}>
              <Text className="text-amber-700 dark:text-amber-400 text-xs font-semibold ml-2">{showAvoided ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
        )}

        {(savedRecipeIds || []).length > 0 && (
          <Pressable onPress={() => router?.push?.('/nutrition/groceries')} className="bg-amber-400/10 border-2 border-amber-400 rounded-xl py-3 mb-3 items-center">
            <Text className="text-amber-700 font-medium dark:text-amber-400">View grocery list ({savedRecipeIds.length} recipe{savedRecipeIds.length === 1 ? '' : 's'}) →</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40, width: '100%', maxWidth: 448, alignSelf: 'center' }}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            isSaved={(savedRecipeIds || []).includes(item.id)}
            onToggleSave={() => toggleSavedRecipe(item.id)}
            bloodTypeAffinity={bloodType ? getBloodTypeAffinity(item, bloodType) : 'neutral'}
            isAiGenerated={item.id.startsWith('ai-')}
            goalBadge={goalBadge(item)}
          />
        )}
        ListEmptyComponent={<Text className="text-slate-500 text-center mt-6">No recipes match those filters.</Text>}
      />
    </View>
  );
}

function RecipeCard({
  recipe, isSaved, onToggleSave, bloodTypeAffinity, isAiGenerated, goalBadge,
}: {
  recipe: Recipe; isSaved: boolean; onToggleSave: () => void; bloodTypeAffinity: 'beneficial' | 'avoid' | 'neutral'; isAiGenerated: boolean; goalBadge: string | null;
}) {
  const router = useRouter();
  const logFood = useAppStore((s) => s.logFood);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [justLogged, setJustLogged] = useState<MealType | null>(null);

  const handleLogToMeal = async (mealType: MealType) => {
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

  return (
    <View className="bg-white rounded-2xl p-4 dark:bg-slate-900">
      <View className="flex-row items-center justify-between mb-1">
        <Pressable onPress={() => router?.push?.(`/nutrition/recipe/${recipe.id}`)} className="flex-1 pr-2">
          <Text className="text-slate-900 font-medium dark:text-slate-100">
            {isAiGenerated && '✨ '}{recipe?.n || 'Untitled recipe'}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setShowMealPicker(!showMealPicker)}>
            <Text className="text-lg">➕</Text>
          </Pressable>
          <Pressable onPress={onToggleSave}>
            <Text className="text-lg">{isSaved ? '⭐️' : '☆'}</Text>
          </Pressable>
        </View>
      </View>
      <Text className="text-slate-500 text-xs mb-2 capitalize">{recipe?.c} · {recipe?.t} · {recipe?.prep} prep · {recipe?.cook} cook</Text>
      <Text className="text-slate-500 text-xs mb-2">{recipe?.cal || 0} cal · {recipe?.pro} protein · {recipe?.carb} carb · {recipe?.fat} fat</Text>
      {bloodTypeAffinity !== 'neutral' && (
        <Text className={bloodTypeAffinity === 'beneficial' ? 'text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-2' : 'text-red-500 text-xs font-medium mb-2'}>
          {bloodTypeAffinity === 'beneficial' ? '✅ Good match for your type' : '❌ Best avoided for your type'}
        </Text>
      )}
      {goalBadge && (
        <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-2">{goalBadge}</Text>
      )}

      {justLogged && (
        <View className="bg-emerald-400/10 border border-emerald-400 rounded-xl py-2 items-center mb-1">
          <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-medium">Added to today's {justLogged} ✓</Text>
        </View>
      )}
      {showMealPicker && (
        <View className="flex-row gap-1.5">
          {DIARY_MEAL_TYPES.map((meal) => (
            <Pressable key={meal.id} onPress={() => handleLogToMeal(meal.id)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-lg py-2 items-center">
              <Text className="text-xs">{meal.icon}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setShowMealPicker(false)} className="px-2 justify-center">
            <Text className="text-slate-400 text-xs">✕</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
