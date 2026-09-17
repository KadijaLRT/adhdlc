import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useColorScheme } from 'nativewind';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

// Seven tabs, matching the document's IA: Home (command center), Today
// (execution hub for tasks/focus/routines), Meals (recipes/groceries),
// Workout (programs/recovery), Wellness (mood/coach), Progress (all
// tracked data/stats), Profile (identity/settings). Everything else
// launches from one of these hubs rather than competing for its own
// permanent tab.
export default function TabsLayout() {
  // React Navigation's own tab bar (not a NativeWind-styled component
  // like everything else in this app) — tabBarStyle takes a plain
  // style object, so it needs its own explicit light/dark colors
  // rather than a className. Previously hardcoded to the light
  // palette only, so the tab bar stayed light even with dark mode on
  // everywhere else.
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#818cf8',
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarStyle: {
          backgroundColor: isDark ? '#020617' : '#fafaf9',
          borderTopColor: isDark ? '#1e293b' : '#e7e5e4',
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: () => <TabIcon emoji="✅" /> }} />
      <Tabs.Screen name="meals" options={{ title: 'Meals', tabBarIcon: () => <TabIcon emoji="🍽️" /> }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout', tabBarIcon: () => <TabIcon emoji="💪" /> }} />
      <Tabs.Screen name="wellness" options={{ title: 'Wellness', tabBarIcon: () => <TabIcon emoji="❤️" /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: () => <TabIcon emoji="📈" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: () => <TabIcon emoji="👤" /> }} />
    </Tabs>
  );
}
