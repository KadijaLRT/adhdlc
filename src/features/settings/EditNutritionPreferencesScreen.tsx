import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore, selectNutritionPreferences } from '@/store/index';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

function parseList(text: string): string[] {
  return (text || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Same three questions as onboarding's food.tsx, reused as a real edit
// screen instead of the old stripped-down allergies-only card.
export default function EditNutritionPreferencesScreen() {
  const router = useRouter();
  const nutritionPreferences = useAppStore(selectNutritionPreferences);
  const setNutritionPreferences = useAppStore((s) => s.setNutritionPreferences);

  const [foodsLoved, setFoodsLoved] = useState((nutritionPreferences?.foodsLoved || []).join(', '));
  const [foodsAvoided, setFoodsAvoided] = useState((nutritionPreferences?.foodsAvoided || []).join(', '));
  const [allergies, setAllergies] = useState((nutritionPreferences?.allergies || []).join(', '));
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await setNutritionPreferences({
      allergies: parseList(allergies),
      dietaryRestrictions: nutritionPreferences?.dietaryRestrictions || [],
      foodsLoved: parseList(foodsLoved),
      foodsAvoided: parseList(foodsAvoided),
    });
    setSaved(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <Text className="text-slate-900 dark:text-slate-100 text-2xl font-semibold mb-2">Food — what works for you?</Text>
          <Text className="text-slate-500 text-sm mb-6">The same questions from setup — personalizes your recipes and meal plans.</Text>

          <Text className="text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-2">✅ Foods you love</Text>
          <TextInput
            value={foodsLoved}
            onChangeText={(v) => { setFoodsLoved(v); setSaved(false); }}
            placeholder="e.g. spinach, plantains, mac & cheese, shellfish, mangoes..."
            placeholderTextColor="#64748b"
            multiline
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl p-4 min-h-[90px] mb-6 inset3d"
          />

          <Text className="text-red-500 dark:text-red-400 text-sm font-medium mb-2">❌ Foods you hate or avoid</Text>
          <TextInput
            value={foodsAvoided}
            onChangeText={(v) => { setFoodsAvoided(v); setSaved(false); }}
            placeholder="e.g. pork, bananas, pickles, raw onions..."
            placeholderTextColor="#64748b"
            multiline
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl p-4 min-h-[90px] mb-6 inset3d"
          />

          <Text className="text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">⚠️ Allergies or restrictions</Text>
          <TextInput
            value={allergies}
            onChangeText={(v) => { setAllergies(v); setSaved(false); }}
            placeholder="e.g. almonds (mild), shellfish, gluten-free, dairy-free"
            placeholderTextColor="#64748b"
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 mb-8 inset3d"
          />

          <Pressable onPress={handleSave} className="bg-indigo-600 rounded-full py-4 items-center active:bg-indigo-500 mb-3 btn3d btn3d-p">
            <Text className="text-white text-lg font-semibold">{saved ? 'Saved ✓' : 'Save changes'}</Text>
          </Pressable>
          <Pressable onPress={() => router?.back?.()} className="py-2">
            <Text className="text-slate-500 text-center text-sm">Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
