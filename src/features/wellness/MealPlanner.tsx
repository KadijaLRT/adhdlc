import { View, Text, Switch, Pressable, ScrollView } from 'react-native';
import { useAppStore, selectEnergyLevel, selectWellnessPreferences } from '@/store/index';
import { getMealSuggestions } from '@/content/mealSuggestions';
import { BLOOD_TYPE_DISCLAIMER, type BloodType } from '@/content/bloodTypeAffinities';
import { Subheading } from '@/shared/components/Heading';

const BLOOD_TYPES: BloodType[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function MealPlanner() {
  const energyLevel = useAppStore(selectEnergyLevel);
  const wellnessPreferences = useAppStore(selectWellnessPreferences);
  const setWellnessPreferences = useAppStore((s) => s.setWellnessPreferences);
  const meals = getMealSuggestions(energyLevel, wellnessPreferences?.bloodTypeEnabled ? wellnessPreferences?.bloodType : null);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="w-full max-w-md self-center gap-4">
        <View className="bg-white rounded-2xl p-5 dark:bg-slate-900">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-slate-900 text-base font-semibold dark:text-slate-100">Blood Type Lens</Text>
            <Switch value={wellnessPreferences?.bloodTypeEnabled || false}
              onValueChange={(v) => setWellnessPreferences({ bloodTypeEnabled: v })}
              trackColor={{ false: '#334155', true: '#4f46e5' }} thumbColor="#e2e8f0" />
          </View>
          <Text className="text-slate-500 text-xs mb-3">{BLOOD_TYPE_DISCLAIMER}</Text>
          {wellnessPreferences?.bloodTypeEnabled && (
            <View className="flex-row flex-wrap gap-2">
              {(BLOOD_TYPES || []).map((type) => {
                const isActive = wellnessPreferences?.bloodType === type;
                return (
                  <Pressable key={type} onPress={() => setWellnessPreferences({ bloodType: type })}
                    className={isActive ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-2 px-4' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-2 px-4'}>
                    <Text className={isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
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
