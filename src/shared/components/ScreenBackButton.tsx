import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Consistent back affordance for every non-Home screen. Uses
 * router.back() where there's real navigation history; for the four
 * tab screens (Today/Meals/Wellness/Profile), which aren't reached via
 * a push and so don't have a natural "back," this instead links home.
 */
export function ScreenBackButton({ toHome = false, dark = false }: { toHome?: boolean; dark?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handlePress = () => {
    if (toHome) {
      router?.push?.('/(tabs)/home');
    } else {
      router?.back?.();
    }
  };
  return (
    // A real numeric inset (react-native-safe-area-context's own
    // SafeAreaProvider measurement) rather than only the `pt-safe`
    // Tailwind class. That class depends on env(safe-area-inset-top)
    // resolving to something nonzero, which in turn depends on the
    // page actually running standalone with viewport-fit=cover — an
    // iOS "Add to Home Screen" install made *before* those meta tags
    // existed keeps its old (non-fullscreen-aware) behavior until the
    // icon is deleted and re-added, silently landing back at zero
    // padding with no visual warning. The `Math.max(insets.top, 12)`
    // floor means there's always at least a small gap under the
    // status bar even in that stale-install case, instead of content
    // rendering flush against (and behind) it.
    <View className="px-5 pb-1" style={{ paddingTop: Math.max(insets.top, 12) }}>
      <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel={toHome ? 'Go to Home' : 'Go back'} className="py-2 flex-row items-center gap-1">
        <Text className={dark ? 'text-slate-400 text-sm' : 'text-slate-500 text-sm'}>{toHome ? '🏠 Home' : '← Back'}</Text>
      </Pressable>
    </View>
  );
}
