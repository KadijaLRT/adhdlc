import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, selectReflections, selectDateFormat } from '@/store/index';
import { formatDate } from '@/shared/formatDate';
import { Heading } from '@/shared/components/Heading';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function ReflectionHistoryScreen() {
  const reflections = useAppStore(selectReflections);
  const dateFormat = useAppStore(selectDateFormat);

  const sorted = useMemo(
    () => [...(reflections || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [reflections]
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="w-full max-w-md self-center">
          <Heading className="mb-1 mt-2">Past check-ins</Heading>
          <Text className="text-slate-500 text-sm mb-6">Everything you've written in the evening check-in, in one place.</Text>

          {sorted.length === 0 ? (
            <Text className="text-slate-500 text-center mt-10">No check-ins yet — they'll show up here once you save one.</Text>
          ) : (
            <View className="gap-3">
              {sorted.map((entry) => (
                <View key={entry.date} className="bg-white dark:bg-slate-900 rounded-2xl p-4 surf3d">
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1">{formatDate(entry.date, dateFormat)}</Text>
                  <Text className="text-slate-800 dark:text-slate-200 text-sm leading-5">{entry.note}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
