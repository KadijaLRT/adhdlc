import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { DOPAMINE_MENU } from '@/content/toolkitContent';

/**
 * Browsable menu of quick, genuine dopamine-generating activities,
 * grouped by category — for when "just do the task" isn't available
 * yet and a real reset is what's needed instead.
 */
export default function DopamineMenuCard() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 surf3d">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">⚡ Dopamine Menu</Text>
      <Text className="text-slate-500 text-xs mb-3">Real ways to reset — pick a category.</Text>
      <View className="gap-2">
        {DOPAMINE_MENU.map((category) => {
          const isOpen = openCategory === category.cat;
          return (
            <View key={category.cat}>
              <Pressable
                onPress={() => setOpenCategory(isOpen ? null : category.cat)}
                className={isOpen ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-xl p-3 surf3d surf3d-in surf3d-tap'}
              >
                <Text className={isOpen ? 'text-emerald-700 dark:text-emerald-400 text-sm font-medium' : 'text-slate-700 dark:text-slate-300 text-sm font-medium'}>
                  {category.icon} {category.cat}
                </Text>
              </Pressable>
              {isOpen && (
                <View className="pl-3 pt-2 gap-1.5">
                  {category.items.map((item) => (
                    <Text key={item} className="text-slate-600 dark:text-slate-300 text-xs">• {item}</Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
