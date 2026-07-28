import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useColorScheme } from 'nativewind';
import { useFonts, Lexend_400Regular, Lexend_600SemiBold } from '@expo-google-fonts/lexend';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore, selectDyslexiaFont, selectColorScheme, selectIsHydrated, selectStorageWorking } from '@/store/index';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import AvivaFloatingButton from '@/features/aviva/AvivaFloatingButton';
import NotificationsSync from '@/features/notifications/NotificationsSync';
import { completeNativeSessionFromUrl } from '@/core/supabase/client';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const dyslexiaFont = useAppStore(selectDyslexiaFont);
  const colorSchemePreference = useAppStore(selectColorScheme);
  const isHydrated = useAppStore(selectIsHydrated);
  const storageWorking = useAppStore(selectStorageWorking);
  const { setColorScheme } = useColorScheme();
  const [fontsLoaded] = useFonts({ Lexend_400Regular, Lexend_600SemiBold });

  // Onboarding intentionally stays dark regardless of the app-wide
  // setting — it's a fixed, deliberate design choice for that flow, not
  // something the light/dark toggle should touch.
  const isOnboarding = pathname?.startsWith('/onboarding');

  // The floating button is only offered on the Home tab now. Everywhere
  // else Aviva is already one tap away via Wellness → Chat with Aviva in
  // the bottom nav bar, so a persistent floating overlay on every other
  // screen was redundant — and Overwhelmed Mode (zero nav/menus by
  // design) and onboarding (she's introduced once setup is done, not
  // mid-setup) were already excluded for the same "don't float where she
  // doesn't belong" reason.
  const hideFloatingButton = pathname !== '/home';

  useEffect(() => {
    useAppStore.getState().hydrate();
  }, []);

  // Native counterpart to web's automatic detectSessionInUrl: catches
  // the magic-link redirect both when it cold-starts the app and when
  // the app is already open in the background. No-op on web (handled
  // by the SDK itself) and a no-op for any URL that isn't an auth
  // callback.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Linking.getInitialURL().then((url) => { if (url) completeNativeSessionFromUrl(url); });
    const subscription = Linking.addEventListener('url', ({ url }) => { completeNativeSessionFromUrl(url); });
    return () => subscription.remove();
  }, []);

  // Drives NativeWind's actual dark-mode class toggling from the
  // person's stored preference. 'system' defers to the OS/browser
  // setting via NativeWind's own system-scheme detection.
  useEffect(() => {
    if (isOnboarding) {
      setColorScheme('dark');
      return;
    }
    setColorScheme(colorSchemePreference);
  }, [colorSchemePreference, isOnboarding]);

  // Applies Lexend app-wide via React Native's Text.defaultProps, rather
  // than needing to individually update every <Text> across ~50 screens.
  // This is a genuinely global switch, not a partial one, as long as
  // components use the standard <Text> from react-native (which every
  // screen in this app does).
  useEffect(() => {
    if (!fontsLoaded) return;
    const anyText = Text as any;
    anyText.defaultProps = anyText.defaultProps || {};
    anyText.defaultProps.style = dyslexiaFont
      ? [anyText.defaultProps.style, { fontFamily: 'Lexend_400Regular' }]
      : undefined;
  }, [dyslexiaFont, fontsLoaded]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <View className="flex-1">
            {isHydrated && !storageWorking && (
              <View className="bg-amber-500 px-4 py-2 pt-safe">
                <Text className="text-slate-950 text-xs text-center font-medium">
                  ⚠️ Your data can't be saved on this device right now (storage is blocked). Check Settings → Safari → Private Browsing, or Advanced Tracking Protection settings.
                </Text>
              </View>
            )}
            <Stack screenOptions={{ headerShown: false }} />
            {!hideFloatingButton && <AvivaFloatingButton />}
            <NotificationsSync />
          </View>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
