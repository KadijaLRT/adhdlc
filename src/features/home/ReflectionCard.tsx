import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectReflections, selectProfile } from '@/store/index';
import { getWindDownTip } from '@/content/windDownTips';

/**
 * The evening half of the "three interface modes" idea: not a full
 * separate app state, just a different primary card on Home once it's
 * evening. Morning/day keeps the existing plan-forward view; this
 * replaces it with a quick, optional day-review prompt.
 */
export default function ReflectionCard() {
  const router = useRouter();
  const reflections = useAppStore(selectReflections);
  const profile = useAppStore(selectProfile);
  const windDownTip = getWindDownTip(profile?.sleepStruggles);
  const saveReflectionForToday = useAppStore((s) => s.saveReflectionForToday);
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const todaysReflection = (reflections || []).find((r) => r.date === today);

  const [note, setNote] = useState(todaysReflection?.note || '');
  const [saved, setSaved] = useState(!!todaysReflection);

  const handleSave = async () => {
    await saveReflectionForToday(note);
    setSaved(true);
  };

  return (
    <View className="bg-white rounded-2xl p-5 dark:bg-slate-900">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-indigo-700 text-xs uppercase tracking-wider dark:text-indigo-300">Evening check-in</Text>
        {reflections.length > 0 && (
          <Pressable onPress={() => router?.push?.('/reflections/history')}>
            <Text className="text-indigo-500 text-xs">Past entries →</Text>
          </Pressable>
        )}
      </View>
      <Text className="text-slate-900 text-base font-medium mb-3 dark:text-slate-100">How was today?</Text>

      {windDownTip && (
        <View className="bg-indigo-600/10 rounded-xl p-3 mb-3">
          <Text className="text-indigo-700 dark:text-indigo-300 text-xs">🌙 {windDownTip}</Text>
        </View>
      )}

      <TextInput
        value={note}
        onChangeText={(text) => { setNote(text); setSaved(false); }}
        placeholder="One line is plenty..."
        placeholderTextColor="#64748b"
        multiline
        className="bg-stone-100 text-slate-900 rounded-xl p-3 min-h-[70px] mb-3 dark:text-slate-100 dark:bg-slate-800"
      />

      <Pressable
        onPress={handleSave}
        className={saved ? 'bg-emerald-500/20 rounded-full py-3 items-center' : 'bg-indigo-600 rounded-full py-3 items-center active:bg-indigo-500'}
      >
        <Text className={saved ? 'text-emerald-700 font-medium' : 'text-white font-semibold'}>
          {saved ? 'Saved ✓' : 'Save'}
        </Text>
      </Pressable>
    </View>
  );
}
