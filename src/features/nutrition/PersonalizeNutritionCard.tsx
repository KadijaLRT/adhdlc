import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/index';

// Routes to the same questions asked during onboarding's food.tsx step
// (foods loved, foods avoided, allergies) rather than a separate,
// stripped-down allergy-chip picker.
export default function PersonalizeNutritionCard() {
  const router = useRouter();
  const dismissNutritionCard = useAppStore((s) => s.dismissNutritionCard);

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 mx-4 mb-4">
      <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-1">Want recipes matched to you?</Text>
      <Text className="text-slate-500 text-xs mb-4">
        Same questions from setup — foods you love, avoid, and allergies. Change anytime.
      </Text>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => router?.push?.('/settings/edit-nutrition')}
          className="flex-1 bg-indigo-600 rounded-full py-3 items-center active:bg-indigo-500 btn3d btn3d-p"
        >
          <Text className="text-white text-sm font-semibold">Personalize my food</Text>
        </Pressable>
        <Pressable onPress={dismissNutritionCard} className="py-3 px-4">
          <Text className="text-slate-500 text-sm">Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}
