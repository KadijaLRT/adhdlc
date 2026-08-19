import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';

export default function FoodScreen() {
  const router = useRouter();
  const foodsLoved = useOnboardingStore((s) => s.foodsLoved);
  const foodsAvoided = useOnboardingStore((s) => s.foodsAvoided);
  const allergies = useOnboardingStore((s) => s.allergies);
  const setField = useOnboardingStore((s) => s.setField);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/food');

  const goToNextModuleScreen = useOnboardingStore((s) => s.goToNextModuleScreen);
  const handleContinue = () => goToNextModuleScreen(router);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">Food — what works for you?</Text>
          <Text className="text-slate-400 text-sm mb-6">Personalizes your recipes and meal plans. Be as specific or vague as you want. You can always update this.</Text>

          <Text className="text-emerald-400 text-sm font-medium mb-2">✅ Foods you love</Text>
          <TextInput
            value={foodsLoved}
            onChangeText={(v) => setField('foodsLoved', v)}
            placeholder="e.g. spinach, plantains, mac & cheese, shellfish, mangoes..."
            placeholderTextColor="#64748b"
            multiline
            className="bg-slate-900 text-slate-100 rounded-xl p-4 min-h-[90px] mb-6"
          />

          <Text className="text-red-400 text-sm font-medium mb-2">❌ Foods you hate or avoid</Text>
          <TextInput
            value={foodsAvoided}
            onChangeText={(v) => setField('foodsAvoided', v)}
            placeholder="e.g. pork, bananas, pickles, raw onions..."
            placeholderTextColor="#64748b"
            multiline
            className="bg-slate-900 text-slate-100 rounded-xl p-4 min-h-[90px] mb-6"
          />

          <Text className="text-amber-400 text-sm font-medium mb-2">⚠️ Allergies or restrictions</Text>
          <TextInput
            value={allergies}
            onChangeText={(v) => setField('allergies', v)}
            placeholder="e.g. almonds (mild), shellfish, gluten-free, dairy-free"
            placeholderTextColor="#64748b"
            className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 mb-8"
          />

          <Pressable onPress={handleContinue} className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400">
            <Text className="text-white text-lg text-center font-semibold">Continue →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
