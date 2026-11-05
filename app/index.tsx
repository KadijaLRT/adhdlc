import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppStore, selectIsHydrated, selectProfile, type EnergyLevel } from '@/store/index';
import { restoreProfileFromCloud } from '@/core/supabase/client';
import { useThemeHex } from '@/theme/useThemeHex';

function toEnergyLevel(value: unknown): EnergyLevel {
  return value === 'low' || value === 'high' ? value : 'medium';
}

export default function Index() {
  const themeHex = useThemeHex();
  const isHydrated = useAppStore(selectIsHydrated);
  const profile = useAppStore(selectProfile);
  const setProfile = useAppStore((s) => s.setProfile);
  const [cloudCheckDone, setCloudCheckDone] = useState(false);

  // If local storage came back empty (e.g. iOS cleared it after a
  // stretch of inactivity) but this device has a signed-in Supabase
  // session from a prior backup, restore from there instead of
  // dropping straight into onboarding. Only ever runs once, and only
  // when there's genuinely nothing local to lose. Restores the full
  // profile (every onboarding answer), not just enough to skip
  // onboarding with everything else reset to defaults.
  useEffect(() => {
    if (!isHydrated || profile || cloudCheckDone) {
      if (isHydrated) setCloudCheckDone(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const restored = await restoreProfileFromCloud();
      if (!cancelled && restored) {
        await setProfile({
          ...restored,
          timezone: (restored.timezone as string) || 'UTC',
          energyBaseline: toEnergyLevel(restored.energyBaseline),
          stressThreshold: toEnergyLevel(restored.stressThreshold),
          biggestHurdle: (restored.biggestHurdle as string) || '',
          onboardingCompletedAt: new Date().toISOString(),
        } as any);
      }
      if (!cancelled) setCloudCheckDone(true);
    })();
    return () => { cancelled = true; };
  }, [isHydrated, profile, cloudCheckDone, setProfile]);

  if (!isHydrated || !cloudCheckDone) {
    return (
      <View className="flex-1 bg-stone-50 items-center justify-center dark:bg-slate-950">
        <ActivityIndicator color={themeHex.primary400} />
      </View>
    );
  }

  return profile ? <Redirect href="/(tabs)/home" /> : <Redirect href="/onboarding/welcome" />;
}
