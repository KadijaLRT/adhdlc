import { useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useProStore } from './proStore';
import { FREE_AI_PER_DAY } from './proConfig';

/**
 * Mounted once in app/_layout.tsx. Pops up whenever an AI request is
 * blocked by the free daily limit, from anywhere in the app, so every
 * AI feature gets the upgrade path without each screen handling it.
 * Also loads the stored Pro state on startup.
 */
export default function ProPaywallModal() {
  const router = useRouter();
  const visible = useProStore((s) => s.paywallVisible);
  const hidePaywall = useProStore((s) => s.hidePaywall);

  useEffect(() => {
    useProStore.getState().load();
  }, []);

  const goToPro = () => {
    hidePaywall();
    router?.push?.('/pro');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={hidePaywall}>
      <View className="flex-1 justify-center items-center bg-black/50 p-6">
        <View className="bg-stone-50 dark:bg-slate-950 rounded-3xl p-6 w-full max-w-md">
          <Text className="text-3xl text-center mb-2">✨</Text>
          <Text className="text-slate-900 dark:text-slate-100 text-xl font-semibold text-center mb-2">
            That's today's {FREE_AI_PER_DAY} free AI requests
          </Text>
          <Text className="text-slate-500 text-sm text-center mb-5">
            Everything else in the app keeps working. Pro gives you unlimited Aviva, or your free requests come back tomorrow.
          </Text>
          <Pressable onPress={goToPro} className="bg-indigo-600 rounded-full py-4 mb-2 active:bg-indigo-500 btn3d btn3d-p">
            <Text className="text-white text-center font-semibold">See Aviva Pro</Text>
          </Pressable>
          <Pressable onPress={hidePaywall} className="py-3">
            <Text className="text-slate-500 text-center text-sm">Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
