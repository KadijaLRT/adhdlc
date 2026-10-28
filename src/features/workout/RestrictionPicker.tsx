import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { RESTRICTIONS, RESTRICTION_SECTIONS } from '@/content/restrictions';

/**
 * Tap-to-toggle list of physical restrictions, grouped by body area. Used by
 * settings, onboarding and Body Check-in so they all offer the same list.
 * `forceDark` is for the onboarding screens, which are always dark.
 */
export default function RestrictionPicker({
  selected, onToggle, forceDark = false,
}: {
  selected: readonly string[] | null | undefined;
  onToggle: (id: string) => void;
  forceDark?: boolean;
}) {
  const chosen = new Set(selected || []);
  // A section opens by default only if it holds a selection, so a long list stays calm. Tapping a header opens or closes it.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const chipOn = 'bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-2 px-4';
  const chipOff = forceDark
    ? 'bg-slate-900 border-2 border-transparent rounded-full py-2 px-4'
    : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-full py-2 px-4';
  const textOn = forceDark ? 'text-indigo-300 text-sm' : 'text-indigo-700 dark:text-indigo-300 text-sm';
  const textOff = forceDark ? 'text-slate-300 text-sm' : 'text-slate-700 dark:text-slate-300 text-sm';
  const headerClass = forceDark ? 'text-slate-400 text-xs font-semibold mb-2' : 'text-slate-500 text-xs font-semibold mb-2';

  return (
    <View>
      {RESTRICTION_SECTIONS.map((section) => {
        const items = RESTRICTIONS.filter((r) => r.section === section.id);
        if (items.length === 0) return null;
        const selectedCount = items.filter((r) => chosen.has(r.id)).length;
        const open = toggled[section.id] ?? selectedCount > 0;
        return (
          <View key={section.id} className="mb-3">
            <Pressable
              onPress={() => setToggled((prev) => ({ ...prev, [section.id]: !open }))}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${section.label}, ${selectedCount} selected`}
              className="flex-row items-center justify-between py-2"
            >
              <Text className={headerClass.replace(' mb-2', '')}>{section.label}{selectedCount > 0 ? ` (${selectedCount})` : ''}</Text>
              <Text className={headerClass.replace(' mb-2', '')}>{open ? 'Hide' : 'Show'}</Text>
            </Pressable>
            {open && <View className="flex-row flex-wrap gap-2">
              {items.map((r) => {
                const active = chosen.has(r.id);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => onToggle(r.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={r.label}
                    className={active ? chipOn : chipOff}
                  >
                    <Text className={active ? textOn : textOff}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>}
          </View>
        );
      })}
    </View>
  );
}
