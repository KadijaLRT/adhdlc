import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { CycleLogEntry } from '@/store/slices/types';
import { toLocalDateString } from '@/shared/formatDate';

const PHASE_COLORS: Record<CycleLogEntry['phase'], string> = {
  menstrual: 'bg-red-400',
  follicular: 'bg-amber-300',
  ovulation: 'bg-emerald-400',
  luteal: 'bg-indigo-400',
  unspecified: 'bg-stone-300 dark:bg-slate-600',
};

const PHASE_SHORT_LABEL: Record<CycleLogEntry['phase'], string> = {
  menstrual: 'Menstrual', follicular: 'Follicular', ovulation: 'Ovulation', luteal: 'Luteal', unspecified: 'Not sure',
};

const PHASE_ORDER: CycleLogEntry['phase'][] = ['menstrual', 'follicular', 'ovulation', 'luteal', 'unspecified'];
const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CycleCalendarProps {
  cycleLogs: CycleLogEntry[];
  onSelectDate: (date: string, currentPhase: CycleLogEntry['phase'] | null) => void;
}

/**
 * A real month grid, not just a same-day toggle — tapping any past (or
 * future, for planning ahead) date opens the phase picker for that
 * specific date via the parent's onSelectDate, which routes to
 * logCycleForDate. That action already existed for the Apple Health
 * import path but had no manual UI of its own before this.
 */
export default function CycleCalendar({ cycleLogs, onSelectDate }: CycleCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const logsByDate = useMemo(() => new Map((cycleLogs || []).map((l) => [l.date, l.phase])), [cycleLogs]);
  const todayStr = toLocalDateString(new Date());

  const weeks = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (string | null)[] = Array(firstDayOfWeek).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(toLocalDateString(new Date(year, month, day)));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [visibleMonth]);

  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Pressable onPress={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="py-1 px-3">
          <Text className="text-slate-500 text-base">‹</Text>
        </Pressable>
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{monthLabel}</Text>
        <Pressable onPress={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="py-1 px-3">
          <Text className="text-slate-500 text-base">›</Text>
        </Pressable>
      </View>

      <View className="flex-row mb-1">
        {WEEKDAY_HEADERS.map((label, i) => (
          <View key={`${label}-${i}`} className="flex-1 items-center">
            <Text className="text-slate-400 text-xs">{label}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, i) => (
        <View key={i} className="flex-row mb-1">
          {week.map((date, j) => {
            if (!date) return <View key={j} className="flex-1 aspect-square" />;
            const phase = logsByDate.get(date) || null;
            const isToday = date === todayStr;
            const dayNum = Number(date.slice(-2));
            return (
              <Pressable key={date} onPress={() => onSelectDate(date, phase)} className="flex-1 aspect-square items-center justify-center">
                <View className={`w-8 h-8 rounded-full items-center justify-center ${phase ? PHASE_COLORS[phase] : ''} ${isToday && !phase ? 'border-2 border-indigo-400' : ''}`}>
                  <Text className={phase ? 'text-white text-xs font-medium' : 'text-slate-700 dark:text-slate-300 text-xs'}>{dayNum}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View className="flex-row flex-wrap gap-3 mt-2 pt-3 border-t border-stone-100 dark:border-slate-800">
        {PHASE_ORDER.map((phase) => (
          <View key={phase} className="flex-row items-center gap-1.5">
            <View className={`w-3 h-3 rounded-full ${PHASE_COLORS[phase]}`} />
            <Text className="text-slate-500 text-xs">{PHASE_SHORT_LABEL[phase]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
