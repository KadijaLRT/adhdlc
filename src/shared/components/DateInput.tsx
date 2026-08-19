import { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';

interface DateInputProps {
  value: string; // ISO YYYY-MM-DD, or empty
  onChange: (isoDate: string) => void;
  dark?: boolean;
}

/**
 * Three separate MM / DD / YYYY numeric fields rather than one free-text
 * field — much harder to enter an ambiguous or malformed date than a
 * single "type whatever" box, without needing a native date-picker
 * dependency this app doesn't have installed. Stores and reports the
 * value as a real ISO date string internally, since that's what every
 * date calculation elsewhere in the app expects.
 */
export function DateInput({ value, onChange, dark = true }: DateInputProps) {
  const [year, month, day] = (value || '').split('-');
  const [mm, setMm] = useState(month || '');
  const [dd, setDd] = useState(day || '');
  const [yyyy, setYyyy] = useState(year || '');

  useEffect(() => {
    const [y, m, d] = (value || '').split('-');
    setMm(m || '');
    setDd(d || '');
    setYyyy(y || '');
  }, [value]);

  const emitIfComplete = (nextMm: string, nextDd: string, nextYyyy: string) => {
    if (nextMm.length === 2 && nextDd.length === 2 && nextYyyy.length === 4) {
      const year = parseInt(nextYyyy, 10) || new Date().getFullYear();
      const month = Math.min(Math.max(parseInt(nextMm, 10) || 1, 1), 12);
      // A flat 1-31 clamp let "02/31/2026" through as a literal
      // malformed stored string — new Date(0, month, 0).getDate()
      // gives the real last day of the given month (correctly
      // accounting for leap years via the year), so the day clamp is
      // actually valid for the month that was entered, not just "some
      // month or other."
      const daysInMonth = new Date(year, month, 0).getDate();
      const day = Math.min(Math.max(parseInt(nextDd, 10) || 1, 1), daysInMonth);
      onChange(`${nextYyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    } else if (!nextMm && !nextDd && !nextYyyy) {
      onChange('');
    }
  };

  const fieldClass = dark
    ? 'bg-slate-900 text-slate-100 rounded-xl px-3 py-3 text-center'
    : 'bg-stone-100 text-slate-900 rounded-xl px-3 py-3 text-center';
  const placeholderColor = '#64748b';

  return (
    <View className="flex-row gap-2">
      <TextInput
        value={mm}
        onChangeText={(v) => { const c = v.replace(/\D/g, '').slice(0, 2); setMm(c); emitIfComplete(c, dd, yyyy); }}
        placeholder="MM"
        placeholderTextColor={placeholderColor}
        keyboardType="numeric"
        maxLength={2}
        className={`w-16 ${fieldClass}`}
      />
      <Text className={dark ? 'text-slate-500 self-center' : 'text-slate-400 self-center'}>/</Text>
      <TextInput
        value={dd}
        onChangeText={(v) => { const c = v.replace(/\D/g, '').slice(0, 2); setDd(c); emitIfComplete(mm, c, yyyy); }}
        placeholder="DD"
        placeholderTextColor={placeholderColor}
        keyboardType="numeric"
        maxLength={2}
        className={`w-16 ${fieldClass}`}
      />
      <Text className={dark ? 'text-slate-500 self-center' : 'text-slate-400 self-center'}>/</Text>
      <TextInput
        value={yyyy}
        onChangeText={(v) => { const c = v.replace(/\D/g, '').slice(0, 4); setYyyy(c); emitIfComplete(mm, dd, c); }}
        placeholder="YYYY"
        placeholderTextColor={placeholderColor}
        keyboardType="numeric"
        maxLength={4}
        className={`flex-1 ${fieldClass}`}
      />
    </View>
  );
}
