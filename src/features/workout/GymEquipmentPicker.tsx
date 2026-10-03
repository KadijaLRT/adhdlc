import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { EQUIPMENT_FORMAT_MARKER, EQUIPMENT_GROUPS, expandLegacyTokens, hasLegacyMachineToken } from '@/content/equipment';

/**
 * Collapsible equipment checklist. Groups stay closed until opened so the
 * screen is never a wall of options; each header shows how many are ticked.
 * Always works on the expanded form of the list, so the old coarse `machine`
 * token is replaced by specific machines the first time anything is changed.
 */
export default function GymEquipmentPicker({
  value, onChange,
}: {
  value: string[] | null | undefined;
  onChange: (next: string[]) => void;
}) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const needsReview = hasLegacyMachineToken(value);
  const owned = new Set(expandLegacyTokens(value));

  const toggle = (id: string) => {
    const current = expandLegacyTokens(value);
    const next = current.includes(id) ? current.filter((e) => e !== id) : [...current, id];
    onChange([...next, EQUIPMENT_FORMAT_MARKER]);
  };

  return (
    <View className="mb-3">
      {needsReview && (
        <View className="bg-amber-400/10 border border-amber-400 rounded-xl p-3 mb-3">
          <Text className="text-amber-700 text-xs dark:text-amber-400">
            This gym was saved with a general "machine" option, so common machines are assumed. Check the groups below and untick anything it doesn't have.
          </Text>
          <Pressable onPress={() => onChange([...expandLegacyTokens(value), EQUIPMENT_FORMAT_MARKER])} className="mt-2 self-start py-1">
            <Text className="text-indigo-600 text-xs font-medium dark:text-indigo-400">Keep these as they are</Text>
          </Pressable>
        </View>
      )}

      {EQUIPMENT_GROUPS.map((group) => {
        const count = group.items.filter((i) => owned.has(i.id)).length;
        const isOpen = openGroupId === group.id;
        return (
          <View key={group.id} className="mb-2">
            <Pressable
              onPress={() => setOpenGroupId(isOpen ? null : group.id)}
              className="flex-row items-center justify-between bg-stone-100 dark:bg-slate-800 rounded-xl px-3 py-3"
            >
              <Text className="text-slate-700 text-xs font-medium dark:text-slate-200">{group.label}</Text>
              <Text className="text-slate-500 text-xs">{count} of {group.items.length} {isOpen ? '▴' : '▾'}</Text>
            </Pressable>
            {isOpen && (
              <View className="flex-row flex-wrap gap-2 pt-2 px-1">
                {group.items.map((item) => {
                  const isActive = owned.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggle(item.id)}
                      className={isActive ? 'bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-500 rounded-full py-2 px-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-2 px-3'}
                    >
                      <Text className={isActive ? 'text-emerald-700 dark:text-emerald-400 text-xs' : 'text-slate-700 dark:text-slate-300 text-xs'}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      <Text className="text-slate-500 text-xs mt-1">Bodyweight exercises always show. Tick only what this gym really has.</Text>
    </View>
  );
}
