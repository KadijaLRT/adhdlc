import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { searchFoodDatabase, type FoodItem } from '@/content/foodDatabase';
import { searchUsdaFoods } from '@/core/nutrition/usdaApi';
import type { CustomMealIngredient } from '@/store/index';

interface Props {
  onSave: (name: string, ingredients: CustomMealIngredient[]) => void;
  onCancel: () => void;
  // The scanner modal needs to cover the full screen, which doesn't
  // work reliably from this deeply-nested card via absolute
  // positioning — so the parent screen owns the actual modal, and this
  // just asks it to open with a callback for whatever gets scanned.
  onOpenScanner: (onFound: (item: FoodItem) => void) => void;
}

/**
 * Builds a reusable meal out of multiple ingredients — distinct from
 * the single-item "Custom food" form. Ingredients can be pulled from
 * the local food database, USDA's verified database, scanned via
 * barcode, or typed in manually; totals are summed live as you add
 * them so the running macro count is always visible before saving.
 */
export default function CustomMealBuilder({ onSave, onCancel, onOpenScanner }: Props) {
  const [mealName, setMealName] = useState('');
  const [ingredients, setIngredients] = useState<CustomMealIngredient[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [usdaResults, setUsdaResults] = useState<FoodItem[]>([]);
  const [usdaSearching, setUsdaSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualPro, setManualPro] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');

  const localResults = useMemo(() => (ingredientSearch.trim() ? searchFoodDatabase(ingredientSearch).slice(0, 8) : []), [ingredientSearch]);

  // Local curated list shows instantly; USDA's verified database is
  // searched live, debounced so it's not firing a request on every
  // keystroke.
  useEffect(() => {
    const query = ingredientSearch.trim();
    if (query.length < 2) {
      setUsdaResults([]);
      setUsdaSearching(false);
      return;
    }
    setUsdaSearching(true);
    const timeout = setTimeout(async () => {
      const results = await searchUsdaFoods(query);
      const localNames = new Set(localResults.map((r) => r.name.toLowerCase()));
      setUsdaResults(results.filter((r) => !localNames.has(r.name.toLowerCase())));
      setUsdaSearching(false);
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientSearch]);

  const searchResults = useMemo(() => [...localResults, ...usdaResults], [localResults, usdaResults]);

  const totals = useMemo(
    () => ingredients.reduce(
      (acc, i) => ({ calories: acc.calories + i.calories, protein: acc.protein + i.protein, carbs: acc.carbs + i.carbs, fat: acc.fat + i.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ),
    [ingredients]
  );

  const addIngredientFromDatabase = (item: FoodItem) => {
    setIngredients((prev) => [...prev, { name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat }]);
    setIngredientSearch('');
  };

  const addManualIngredient = () => {
    if (!manualName.trim()) return;
    setIngredients((prev) => [...prev, {
      name: manualName.trim(),
      calories: Number(manualCal) || 0,
      protein: Number(manualPro) || 0,
      carbs: Number(manualCarb) || 0,
      fat: Number(manualFat) || 0,
    }]);
    setManualName(''); setManualCal(''); setManualPro(''); setManualCarb(''); setManualFat('');
    setManualMode(false);
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!mealName.trim() || ingredients.length === 0) return;
    onSave(mealName.trim(), ingredients);
  };

  return (
    <View className="bg-stone-50 dark:bg-slate-800 rounded-xl p-3">
      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Meal name</Text>
      <TextInput
        value={mealName}
        onChangeText={setMealName}
        placeholder="e.g. My protein bowl"
        placeholderTextColor="#64748b"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-3"
      />

      {ingredients.length > 0 && (
        <View className="mb-3">
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Ingredients</Text>
          {ingredients.map((ing, index) => (
            <View key={`${ing.name}-${index}`} className="flex-row items-center justify-between py-1.5 border-b border-stone-200 dark:border-slate-700">
              <View className="flex-1">
                <Text className="text-slate-800 dark:text-slate-200 text-sm">{ing.name}</Text>
                <Text className="text-slate-500 text-xs">{ing.calories} cal · {ing.protein}p / {ing.carbs}c / {ing.fat}f</Text>
              </View>
              <Pressable onPress={() => removeIngredient(index)} className="p-2">
                <Text className="text-slate-400 text-xs">✕</Text>
              </Pressable>
            </View>
          ))}
          <View className="flex-row justify-between pt-2">
            <Text className="text-slate-700 dark:text-slate-300 text-xs font-semibold">Total</Text>
            <Text className="text-slate-700 dark:text-slate-300 text-xs font-semibold">{totals.calories} cal · {totals.protein}p / {totals.carbs}c / {totals.fat}f</Text>
          </View>
        </View>
      )}

      {!manualMode ? (
        <>
          <View className="flex-row gap-2 mb-2">
            <TextInput
              value={ingredientSearch}
              onChangeText={setIngredientSearch}
              placeholder="Search an ingredient to add…"
              placeholderTextColor="#64748b"
              className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2"
            />
            <Pressable onPress={() => onOpenScanner(addIngredientFromDatabase)} className="bg-indigo-600 rounded-xl px-3 justify-center active:bg-indigo-500">
              <Text className="text-white text-sm">📷</Text>
            </Pressable>
          </View>
          {searchResults.length > 0 && (
            <View className="mb-2">
              {searchResults.map((f) => (
                <Pressable key={f.id} onPress={() => addIngredientFromDatabase(f)} className="py-2 border-b border-stone-200 dark:border-slate-700">
                  <Text className="text-slate-800 dark:text-slate-200 text-sm">{f.name}</Text>
                  <Text className="text-slate-500 text-xs">{f.servingLabel} · {f.calories} cal · {f.protein}p / {f.carbs}c / {f.fat}f</Text>
                </Pressable>
              ))}
              {usdaSearching && (
                <View className="flex-row items-center gap-2 py-2">
                  <ActivityIndicator size="small" />
                  <Text className="text-slate-500 text-xs">Searching USDA database…</Text>
                </View>
              )}
            </View>
          )}
          <Pressable onPress={() => setManualMode(true)} className="py-2">
            <Text className="text-indigo-500 text-xs">+ Add an ingredient manually</Text>
          </Pressable>
        </>
      ) : (
        <View>
          <TextInput value={manualName} onChangeText={setManualName} placeholder="Ingredient name" placeholderTextColor="#64748b" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2" />
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1"><TextInput value={manualCal} onChangeText={setManualCal} placeholder="Calories" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
            <View className="flex-1"><TextInput value={manualPro} onChangeText={setManualPro} placeholder="Protein g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
          </View>
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1"><TextInput value={manualCarb} onChangeText={setManualCarb} placeholder="Carbs g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
            <View className="flex-1"><TextInput value={manualFat} onChangeText={setManualFat} placeholder="Fat g" placeholderTextColor="#64748b" keyboardType="decimal-pad" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2" /></View>
          </View>
          <View className="flex-row gap-2">
            <Pressable onPress={addManualIngredient} disabled={!manualName.trim()} className={manualName.trim() ? 'flex-1 bg-indigo-600 rounded-xl py-2 items-center active:bg-indigo-500' : 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-2 items-center'}>
              <Text className="text-white text-sm font-semibold">Add ingredient</Text>
            </Pressable>
            <Pressable onPress={() => setManualMode(false)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2 items-center">
              <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Back to search</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View className="flex-row gap-2 mt-3">
        <Pressable
          onPress={handleSave}
          disabled={!mealName.trim() || ingredients.length === 0}
          className={mealName.trim() && ingredients.length > 0 ? 'flex-1 bg-emerald-500 rounded-xl py-2.5 items-center active:bg-emerald-400' : 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-2.5 items-center'}
        >
          <Text className="text-white text-sm font-semibold">Save meal & add to diary</Text>
        </Pressable>
        <Pressable onPress={onCancel} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center">
          <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
