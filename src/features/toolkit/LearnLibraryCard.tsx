import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LEARN_TOPICS } from '@/content/toolkitContent';

export default function LearnLibraryCard() {
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 surf3d">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-1">📚 Learn</Text>
      <Text className="text-slate-500 text-xs mb-3">How ADHD shows up beyond focus — anxiety, relationships, money, food.</Text>
      <View className="gap-2">
        {LEARN_TOPICS.map((topic) => {
          const isOpen = openTopic === topic.id;
          return (
            <View key={topic.id}>
              <Pressable
                onPress={() => setOpenTopic(isOpen ? null : topic.id)}
                className={isOpen ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-xl p-3 surf3d surf3d-in surf3d-tap'}
              >
                <Text className={isOpen ? 'text-emerald-700 dark:text-emerald-400 text-sm font-medium' : 'text-slate-700 dark:text-slate-300 text-sm font-medium'}>
                  {topic.icon} {topic.label}
                </Text>
              </Pressable>
              {isOpen && (
                <View className="px-3 pt-2 pb-1">
                  <Text className="text-slate-600 dark:text-slate-300 text-xs leading-5 mb-2">{topic.description}</Text>
                  {topic.adhdLink && (
                    <Text className="text-indigo-600 dark:text-indigo-400 text-xs leading-5 mb-2">🔗 {topic.adhdLink}</Text>
                  )}
                  {topic.tips.map((tip) => (
                    <Text key={tip} className="text-slate-500 text-xs mb-1">→ {tip}</Text>
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
