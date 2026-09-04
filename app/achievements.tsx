import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AchievementsGrid from '@/features/gamification/AchievementsGrid';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

export default function AchievementsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950"><ScreenBackButton />
      {/*
        Bug fix: this screen had no max-w-md self-center constraint at
        all — every other scrollable screen in the app uses this
        pattern to keep mobile-designed layouts from stretching
        awkwardly full-width on a tablet or desktop browser. A grid of
        achievement badges is exactly the kind of content that looks
        genuinely broken spaced out across 1200px+, since it was never
        designed with that much horizontal room in mind.
      */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="w-full max-w-md self-center">
          <AchievementsGrid />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
