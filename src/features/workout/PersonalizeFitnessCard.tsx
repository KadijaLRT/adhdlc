import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/index';

// Routes to the same comprehensive questions asked during onboarding
// (equipment, goals, body type, activity level, focus areas)
// rather than duplicating a stripped-down version of them here.
export default function PersonalizeFitnessCard() {
  const router = useRouter();
  const dismissFitnessCard = useAppStore((s) => s.dismissFitnessCard);

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 mx-4 mb-4">
      <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-1">Want a workout list matched to you?</Text>
      <Text className="text-slate-500 text-xs mb-4">
        Same questions from setup — equipment, goals, body type, and more. Change anytime.
      </Text>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => router?.push?.('/settings/edit-fitness')}
          className="flex-1 bg-indigo-600 rounded-full py-3 items-center active:bg-indigo-500"
        >
          <Text className="text-white text-sm font-semibold">Personalize my fitness</Text>
        </Pressable>
        <Pressable onPress={dismissFitnessCard} className="py-3 px-4">
          <Text className="text-slate-500 text-sm">Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}
