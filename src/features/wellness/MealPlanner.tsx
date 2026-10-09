import { View, Text, ScrollView } from 'react-native';
import { useAppStore, selectEnergyLevel } from '@/store/index';
import { getMealSuggestions } from '@/content/mealSuggestions';
import { Subheading } from '@/shared/components/Heading';

export default function MealPlanner() {
  const energyLevel = useAppStore(selectEnergyLevel);
  const meals = getMealSuggestions(energyLevel);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="w-full max-w-md self-center gap-4">
        <View className="gap-3">
          <Subheading>Today&apos;s suggestions</Subheading>
          {(meals || []).map((meal) => (
            <View key={meal.id} className="bg-white rounded-2xl p-4 dark:bg-slate-900">
              <Text className="text-slate-900 font-medium mb-1 dark:text-slate-100">{meal.title}</Text>
              <Text className="text-slate-500 text-xs">{meal.prepMinutes} min · {(meal.ingredients || []).join(', ')}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
