import { useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView } from 'react-native';
import {
  useAppStore, selectTextSize, selectReduceMotion, selectHighContrast, selectDyslexiaFont,
  selectColorScheme, selectTasks, selectAssignments, selectDateFormat, selectUnitSystem,
  type TextSize, type ColorSchemePreference, type DateFormat, type UnitSystem,
} from '@/store/index';
import { Heading } from '@/shared/components/Heading';
import { buildIcsContent, downloadIcsFile } from './exportCalendar';

const TEXT_SIZES: { id: TextSize; label: string; scale: number }[] = [
  { id: 'small', label: 'A', scale: 0.85 },
  { id: 'medium', label: 'A', scale: 1 },
  { id: 'large', label: 'A', scale: 1.25 },
];

const DATE_FORMAT_OPTIONS: { id: DateFormat; example: string }[] = [
  { id: 'MM-DD-YYYY', example: '07-16-2026' },
  { id: 'DD-MM-YYYY', example: '16-07-2026' },
  { id: 'YYYY-MM-DD', example: '2026-07-16' },
];

export default function AccessibilityScreen() {
  const textSize = useAppStore(selectTextSize);
  const reduceMotion = useAppStore(selectReduceMotion);
  const highContrast = useAppStore(selectHighContrast);
  const dyslexiaFont = useAppStore(selectDyslexiaFont);
  const colorScheme = useAppStore(selectColorScheme);
  const dateFormat = useAppStore(selectDateFormat);
  const unitSystem = useAppStore(selectUnitSystem);
  const setColorSchemePref = useAppStore((s) => s.setColorScheme);
  const setTextSize = useAppStore((s) => s.setTextSize);
  const setReduceMotion = useAppStore((s) => s.setReduceMotion);
  const setHighContrast = useAppStore((s) => s.setHighContrast);
  const setDyslexiaFont = useAppStore((s) => s.setDyslexiaFont);
  const setDateFormat = useAppStore((s) => s.setDateFormat);
  const setUnitSystem = useAppStore((s) => s.setUnitSystem);
  const tasks = useAppStore(selectTasks);
  const assignments = useAppStore(selectAssignments);

  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportCalendar = async () => {
    setExportError(null);
    const content = buildIcsContent(tasks, assignments);
    const success = await downloadIcsFile(content);
    if (!success) setExportError("Couldn't export just now — try again in a moment.");
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Accessibility</Heading>
        <Text className="text-slate-500 text-sm mb-6">Make the app fit how you read and see best.</Text>

        <View className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-2xl p-4 mb-4">
          <Text className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-3">🎨 Appearance</Text>
          <View className="flex-row gap-2">
            {(['light', 'dark', 'system'] as ColorSchemePreference[]).map((option) => {
              const isActive = colorScheme === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setColorSchemePref(option)}
                  className={isActive ? 'flex-1 bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-500 rounded-xl py-3 items-center' : 'flex-1 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl py-3 items-center'}
                >
                  <Text className={isActive ? 'text-emerald-700 dark:text-emerald-300 text-sm font-semibold capitalize' : 'text-slate-700 dark:text-slate-300 text-sm capitalize'}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-slate-500 text-xs mt-3">
            Onboarding always stays dark by design. Now applied across the whole app.
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-2xl p-4 mb-4">
          <Text className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-3">📅 Date & Units</Text>

          <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2">Date format</Text>
          <View className="gap-2 mb-4">
            {DATE_FORMAT_OPTIONS.map((option) => {
              const isActive = dateFormat === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setDateFormat(option.id)}
                  className={isActive ? 'flex-row items-center justify-between bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-500 rounded-xl py-3 px-4' : 'flex-row items-center justify-between bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl py-3 px-4'}
                >
                  <Text className={isActive ? 'text-emerald-700 dark:text-emerald-300 text-sm font-semibold' : 'text-slate-700 dark:text-slate-300 text-sm'}>{option.id}</Text>
                  <Text className="text-slate-500 text-xs">{option.example}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2">Units</Text>
          <View className="flex-row gap-2">
            {(['imperial', 'metric'] as UnitSystem[]).map((option) => {
              const isActive = unitSystem === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setUnitSystem(option)}
                  className={isActive ? 'flex-1 bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-500 rounded-xl py-3 items-center' : 'flex-1 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl py-3 items-center'}
                >
                  <Text className={isActive ? 'text-emerald-700 dark:text-emerald-300 text-sm font-semibold capitalize' : 'text-slate-700 dark:text-slate-300 text-sm capitalize'}>
                    {option === 'imperial' ? 'Imperial (lbs)' : 'Metric (kg)'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-indigo-600 text-xs font-bold uppercase tracking-wider">🗓️ Calendar Export</Text>
          </View>
          <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-1">Send your schedule to any calendar app</Text>
          <Text className="text-slate-500 text-xs mb-4">
            Downloads a .ics file with your open tasks and school assignments that have a due date. Import it into Google Calendar, Outlook, or Apple Calendar. Tasks show as all-day events since exact times aren't tracked yet. On iOS/Android, this opens your device's share sheet so you can save or send it.
          </Text>
          <Pressable onPress={handleExportCalendar} className="bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-500">
            <Text className="text-white font-semibold">🗓️ Export Schedule (.ics)</Text>
          </Pressable>
          {exportError && <Text className="text-red-500 text-xs mt-2">{exportError}</Text>}
        </View>

        <View className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-2xl p-4">
          <Text className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4">♿ Accessibility</Text>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-3">Text Size</Text>
          <Text className="text-slate-500 text-xs mb-2">Affects headings and section titles app-wide. Not every screen uses these shared text styles yet.</Text>
          <View className="flex-row gap-2 mb-4">
            {TEXT_SIZES.map((option) => {
              const isActive = textSize === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setTextSize(option.id)}
                  className={isActive ? 'flex-1 bg-emerald-100 border-2 border-emerald-500 rounded-xl py-4 items-center' : 'flex-1 bg-stone-50 border border-stone-200 rounded-xl py-4 items-center'}
                >
                  <Text style={{ fontSize: 16 * option.scale }} className={isActive ? 'text-emerald-700 font-bold' : 'text-slate-800 font-bold'}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="h-px bg-stone-200 my-4" />

          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1 pr-3">
              <Text className="text-slate-900 text-base font-semibold">Reduce Motion</Text>
              <Text className="text-slate-500 text-xs">Turns off breathing animations and transitions</Text>
            </View>
            <Switch value={reduceMotion} onValueChange={setReduceMotion} trackColor={{ false: '#d6d3d1', true: '#4f46e5' }} thumbColor="#fff" />
          </View>

          <View className="h-px bg-stone-200 my-4" />

          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1 pr-3">
              <Text className="text-slate-900 text-base font-semibold">High Contrast</Text>
              <Text className="text-slate-500 text-xs">Boosts contrast on headings and section titles app-wide. Not every screen uses these shared text styles yet.</Text>
            </View>
            <Switch value={highContrast} onValueChange={setHighContrast} trackColor={{ false: '#d6d3d1', true: '#4f46e5' }} thumbColor="#fff" />
          </View>

          <View className="h-px bg-stone-200 my-4" />

          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-slate-900 text-base font-semibold">Dyslexia-Friendly Font</Text>
              <Text className="text-slate-500 text-xs">Switches to Lexend, a font built for reading ease. Restart the app for it to fully apply.</Text>
            </View>
            <Switch value={dyslexiaFont} onValueChange={setDyslexiaFont} trackColor={{ false: '#d6d3d1', true: '#4f46e5' }} thumbColor="#fff" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
