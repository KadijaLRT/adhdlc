import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MOTIVATOR_OPTIONS } from '@/content/toolkitContent';

/**
 * PINCH, as a stuck-moment tool rather than a definition: five levers,
 * each with one concrete thing to try right now. Deliberately not tied
 * to any specific task — this can show up anywhere motivation is
 * needed, including places (like Overwhelmed Mode) that don't have a
 * task in context at all.
 */
export default function PinchToolCard() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">🧲 PINCH</Text>
      <Text className="text-slate-500 text-xs mb-3">What's missing isn't willpower — it's one of these. Pick one to try.</Text>
      <View className="gap-2">
        {MOTIVATOR_OPTIONS.map((option) => {
          const isOpen = openId === option.id;
          return (
            <View key={option.id}>
              <Pressable
                onPress={() => setOpenId(isOpen ? null : option.id)}
                className={isOpen ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-xl p-3'}
              >
                <Text className={isOpen ? 'text-emerald-700 dark:text-emerald-400 text-sm font-medium' : 'text-slate-700 dark:text-slate-300 text-sm font-medium'}>
                  {option.emoji} {option.label}
                </Text>
              </Pressable>
              {isOpen && (
                <View className="px-3 pt-2 pb-1">
                  <Text className="text-slate-600 dark:text-slate-300 text-xs leading-5">{option.quickTry}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
