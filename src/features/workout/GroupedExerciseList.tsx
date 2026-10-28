import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { BODY_GROUP_IDS, bodyGroupLabel } from '@/content/bodyGroups';
import RestrictionFitNote from './RestrictionFitNote';
import { useEquipmentContext } from './useEquipmentContext';

export interface PickableExercise {
  id: string;
  name: string;
  muscle: string;
  icon: string;
  group: string;
}

/**
 * The full list of exercises that fit the active gym, organised by body group,
 * with chips to jump to one group. Never truncated: every matching exercise is
 * reachable by scrolling or by tapping its group.
 */
export default function GroupedExerciseList({
  items, onPick, emptyText, forceDark = false, maxHeight = 320,
}: {
  items: PickableExercise[] | null | undefined;
  onPick: (id: string) => void;
  emptyText: string;
  forceDark?: boolean;
  maxHeight?: number;
}) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const equipmentContext = useEquipmentContext();
  const safeItems = items || [];

  const groupsPresent = useMemo(() => {
    const present = new Set(safeItems.map((i) => i.group));
    return BODY_GROUP_IDS.filter((id) => present.has(id));
  }, [safeItems]);

  // If a search leaves the chosen group empty, fall back to showing every group rather than a blank list.
  const activeGroup = selectedGroup && groupsPresent.includes(selectedGroup) ? selectedGroup : null;

  const sections = useMemo(() => {
    const ids = activeGroup ? [activeGroup] : groupsPresent;
    return ids.map((id) => ({ id, rows: safeItems.filter((i) => i.group === id) }));
  }, [safeItems, groupsPresent, activeGroup]);

  const chipOn = 'bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-1 px-3';
  const chipOff = forceDark
    ? 'bg-slate-800 border-2 border-transparent rounded-full py-1 px-3'
    : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-1 px-3';
  const chipTextOn = forceDark ? 'text-indigo-300 text-xs' : 'text-indigo-700 dark:text-indigo-300 text-xs';
  const chipTextOff = forceDark ? 'text-slate-300 text-xs' : 'text-slate-700 dark:text-slate-300 text-xs';
  const headerClass = forceDark ? 'text-slate-400 text-xs font-semibold mt-3 mb-1' : 'text-slate-500 text-xs font-semibold mt-3 mb-1';
  const rowClass = forceDark
    ? 'py-2 border-b border-slate-800 flex-row items-center gap-2'
    : 'py-2 border-b border-stone-100 dark:border-slate-800 flex-row items-center gap-2';
  const nameClass = forceDark ? 'text-slate-100 text-sm' : 'text-slate-800 dark:text-slate-200 text-sm';

  if (safeItems.length === 0) {
    return <Text className="text-slate-500 text-xs py-2">{emptyText}</Text>;
  }

  return (
    <View>
      {groupsPresent.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, marginBottom: 4 }} contentContainerStyle={{ gap: 6 }}>
          <Pressable onPress={() => setSelectedGroup(null)} className={activeGroup === null ? chipOn : chipOff}>
            <Text className={activeGroup === null ? chipTextOn : chipTextOff}>All ({safeItems.length})</Text>
          </Pressable>
          {groupsPresent.map((id) => (
            <Pressable key={id} onPress={() => setSelectedGroup(id)} className={activeGroup === id ? chipOn : chipOff}>
              <Text className={activeGroup === id ? chipTextOn : chipTextOff}>{bodyGroupLabel(id)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <ScrollView style={{ maxHeight }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {sections.map((section) => (
          <View key={section.id}>
            <Text className={headerClass}>{bodyGroupLabel(section.id)} ({section.rows.length})</Text>
            {section.rows.map((ex) => (
              <Pressable key={ex.id} onPress={() => onPick(ex.id)} className={rowClass}>
                <Text className="text-base">{ex.icon}</Text>
                <View className="flex-1">
                  <Text className={nameClass}>{ex.name}</Text>
                  <Text className="text-slate-500 text-xs">{ex.muscle}</Text>
                  <RestrictionFitNote exerciseId={ex.id} ctx={equipmentContext} />
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
