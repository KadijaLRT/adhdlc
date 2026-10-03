import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { GYM_PRESET_CATEGORIES, searchGymPresets, type GymPreset } from '@/content/gymPresets';

/**
 * Pick a gym by name to fill its usual equipment, or choose "Other gym" for a
 * local gym. Everything is still editable in the equipment checklist after.
 */
export default function GymPresetPicker({
  selectedId, onPickPreset, onPickOther,
}: {
  selectedId: string | null;
  onPickPreset: (preset: GymPreset) => void;
  onPickOther: () => void;
}) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => searchGymPresets(query), [query]);

  return (
    <View className="mb-3">
      <Text className="text-slate-700 text-xs font-medium mb-2 dark:text-slate-300">Which gym is it?</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search gyms..."
        placeholderTextColor="#64748b"
        className="bg-stone-100 text-slate-900 rounded-xl px-3 py-2 mb-2 dark:text-slate-100 dark:bg-slate-800"
      />
      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {GYM_PRESET_CATEGORIES.map((cat) => {
          const rows = matches.filter((p) => p.category === cat.id);
          if (!rows.length) return null;
          return (
            <View key={cat.id} className="mb-2">
              <Text className="text-slate-500 text-xs font-semibold mb-1">{cat.label}</Text>
              <View className="flex-row flex-wrap gap-2">
                {rows.map((p) => {
                  const isActive = selectedId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => onPickPreset(p)}
                      className={isActive ? 'bg-purple-100 dark:bg-purple-500/20 border-2 border-purple-500 rounded-full py-2 px-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-2 px-3'}
                    >
                      <Text className={isActive ? 'text-purple-700 dark:text-purple-300 text-xs font-semibold' : 'text-slate-700 dark:text-slate-300 text-xs'}>{p.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
        <Pressable
          onPress={onPickOther}
          className={selectedId === 'other' ? 'bg-purple-100 dark:bg-purple-500/20 border-2 border-purple-500 rounded-xl py-3 px-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-xl py-3 px-3'}
        >
          <Text className="text-slate-700 text-xs dark:text-slate-300">Other or local gym (pick the equipment yourself)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
