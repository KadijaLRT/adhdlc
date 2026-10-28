import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';
import { CORRECTIVE_MODES, RESTRICTIONS_DISCLAIMER, resolveRestrictions } from '@/content/restrictions';
import { buildCareRoutine, getRestrictionCare } from '@/content/restrictionCare';
import RestrictionPicker from './RestrictionPicker';
import { useRestrictionPrefs } from './useRestrictionPrefs';
import { useEquipmentContext } from './useEquipmentContext';
import { previewRestriction } from './restrictionSession';

// Where someone tells the app about injuries and weak spots. Choosing one
// does two things, both explained here: gentle targeted strengthening is added
// to workouts, and moves that often bother that area stop being picked for them.
export default function RestrictionsScreen() {
  const router = useRouter();
  const { restrictions, correctiveModes, toggleRestriction, toggleMode } = useRestrictionPrefs();
  const equipmentContext = useEquipmentContext();
  const [openId, setOpenId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const active = resolveRestrictions(restrictions);

  const handleToggle = async (id: string) => {
    setSaveError(null);
    try {
      await toggleRestriction(id);
    } catch {
      setSaveError("Couldn't save that just now. Try again in a moment.");
    }
  };

  const handleMode = async (mode: (typeof CORRECTIVE_MODES)[number]['id']) => {
    setSaveError(null);
    try {
      await toggleMode(mode);
    } catch {
      setSaveError("Couldn't save that just now. Try again in a moment.");
    }
  };

  const openCare = (kind: 'warmup' | 'stretch') => {
    const routine = buildCareRoutine(kind, active.map((r) => r.id));
    if (!routine) return;
    router?.push?.({ pathname: '/fitness/stretch-run', params: { routineId: routine.id } });
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <Text className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-1">Injuries and weak spots</Text>
          <Text className="text-slate-500 text-sm mb-4">
            Pick anything your body is working around. Workouts add gentle strengthening for it and stop choosing moves that often bother it.
          </Text>

          <View className="bg-amber-400/10 border border-amber-400/40 rounded-xl p-3 mb-5">
            <Text className="text-amber-700 dark:text-amber-400 text-xs leading-5">{RESTRICTIONS_DISCLAIMER}</Text>
          </View>

          <RestrictionPicker selected={restrictions} onToggle={handleToggle} />

          {saveError && <Text className="text-red-500 text-xs mb-3">{saveError}</Text>}

          {active.length === 0 ? (
            <Text className="text-slate-500 text-xs mt-2">Nothing selected. Workouts are unchanged.</Text>
          ) : (
            <View className="mt-2">
              <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-2">What changes for you</Text>
              {active.map((r) => {
                const preview = previewRestriction(r, equipmentContext);
                const open = openId === r.id;
                return (
                  <View key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3">
                    <Pressable onPress={() => setOpenId(open ? null : r.id)} className="flex-row items-center justify-between">
                      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold flex-1 pr-2">{r.label}</Text>
                      <Text className="text-slate-500 text-xs">{open ? 'Hide' : 'Details'}</Text>
                    </Pressable>
                    <Text className="text-slate-500 text-xs mt-1">{r.summary}</Text>
                    {open && (
                      <View className="mt-3">
                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-2">{r.why}</Text>
                        <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">Strengthening your workouts will use</Text>
                        {preview.helps.length === 0 ? (
                          <Text className="text-slate-500 text-xs mb-2">Nothing here fits your current gym equipment yet. Add equipment under Programs and it will show up.</Text>
                        ) : (
                          <Text className="text-slate-700 dark:text-slate-300 text-xs mb-2">{preview.helps.map((h) => h.name).join(', ')}</Text>
                        )}
                        {preview.unavailableCount > 0 && preview.helps.length > 0 && (
                          <Text className="text-slate-500 text-xs mb-2">{preview.unavailableCount} more need equipment your gym does not have.</Text>
                        )}
                        {preview.avoidCount > 0 ? (
                          <Text className="text-slate-500 text-xs mb-2">
                            {preview.avoidCount} exercises are left out of automatic picks. You can still find them when browsing or swapping, marked with a warning.
                          </Text>
                        ) : (
                          <Text className="text-slate-500 text-xs mb-2">No exercises are left out. This one adds strengthening only.</Text>
                        )}
                        <CareLists restrictionId={r.id} />
                        {!!r.caution && <Text className="text-amber-700 dark:text-amber-400 text-xs mt-2">{r.caution}</Text>}
                      </View>
                    )}
                  </View>
                );
              })}

              <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mt-3 mb-1">How to add the strengthening</Text>
              <Text className="text-slate-500 text-xs mb-3">Turn on any mix. Turn them all off to only steer away from aggravating moves.</Text>
              {CORRECTIVE_MODES.map((m) => (
                <View key={m.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 mb-2 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-slate-900 dark:text-slate-100 text-sm">{m.label}</Text>
                    <Text className="text-slate-500 text-xs">{m.hint}</Text>
                  </View>
                  <Switch
                    value={correctiveModes.includes(m.id)}
                    onValueChange={() => handleMode(m.id)}
                    trackColor={{ false: '#334155', true: '#4f46e5' }}
                    thumbColor="#e2e8f0"
                  />
                </View>
              ))}

              {active.length > 0 && (
                <View className="flex-row gap-2 mt-3">
                  <Pressable onPress={() => openCare('warmup')} className="flex-1 border-2 border-indigo-400/60 rounded-full py-3 items-center">
                    <Text className="text-indigo-600 dark:text-indigo-300 text-xs font-medium">🔥 Warm-up</Text>
                  </Pressable>
                  <Pressable onPress={() => openCare('stretch')} className="flex-1 border-2 border-indigo-400/60 rounded-full py-3 items-center">
                    <Text className="text-indigo-600 dark:text-indigo-300 text-xs font-medium">🧘 Stretches</Text>
                  </Pressable>
                </View>
              )}

              {correctiveModes.includes('routine') && (
                <Pressable
                  onPress={() => router?.push?.('/fitness/rehab')}
                  className="bg-indigo-600 rounded-full py-4 items-center active:bg-indigo-500 mt-3"
                >
                  <Text className="text-white font-semibold">Try the targeted routine</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// The warm-up and stretch names for one restriction, as short lists. Side pairs
// are shown once ("Calf stretch against a wall") instead of twice.
function CareLists({ restrictionId }: { restrictionId: string }) {
  const care = getRestrictionCare(restrictionId);
  const names = (steps: { text: string }[]) => {
    const seen: string[] = [];
    for (const s of steps || []) {
      const name = (s.text || '').replace(/, (right|left) side$/, '');
      if (!seen.includes(name)) seen.push(name);
    }
    return seen;
  };
  const warm = names(care.warmup);
  const stretch = names(care.stretches);
  if (warm.length === 0 && stretch.length === 0) return null;
  return (
    <View>
      {warm.length > 0 && (
        <View className="mb-2">
          <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">Warm-up moves</Text>
          <Text className="text-slate-700 dark:text-slate-300 text-xs">{warm.join('. ')}.</Text>
        </View>
      )}
      {stretch.length > 0 && (
        <View className="mb-1">
          <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">Stretches</Text>
          <Text className="text-slate-700 dark:text-slate-300 text-xs">{stretch.join('. ')}.</Text>
        </View>
      )}
    </View>
  );
}
