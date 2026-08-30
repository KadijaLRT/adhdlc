import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

/**
 * A tappable header that expands/collapses its children, matching the
 * same progressive-disclosure pattern already used elsewhere in the
 * app (the "Hide Warm-Up" toggle in WorkoutDaySession, the "who is
 * this for →" expander on the 6-12-25 screen) — collapsed by default
 * keeps a content-dense screen scannable, and nothing is ever hidden
 * permanently, just tucked away until wanted.
 */
export function CollapsibleSection({
  title, subtitle, defaultOpen = true, badge, children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View className="bg-white rounded-2xl mb-4 dark:bg-slate-900 overflow-hidden">
      <Pressable onPress={() => setOpen((v) => !v)} className="flex-row items-center justify-between p-4">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="text-slate-700 text-sm font-medium dark:text-slate-300">{title}</Text>
          {badge ? (
            <View className="bg-indigo-600/10 rounded-full px-2 py-0.5">
              <Text className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-slate-400 text-xs">{open ? '▾' : '▸'}</Text>
      </Pressable>
      {!open && subtitle ? (
        <Pressable onPress={() => setOpen(true)} className="px-4 pb-4 -mt-2">
          <Text className="text-slate-500 text-xs">{subtitle}</Text>
        </Pressable>
      ) : null}
      {open && <View className="px-4 pb-4">{children}</View>}
    </View>
  );
}
