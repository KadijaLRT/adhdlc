import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore } from '@/store/index';
import { parseAppleHealthFile, openNativeHealthFile, pickWebFile } from './appleHealthImport';

/**
 * Imports real Apple Health data by parsing the export the Health app
 * itself produces (Settings → tap your profile icon → Export All
 * Health Data). Accepts either the .zip Apple hands you directly, or
 * export.xml if it's already been extracted — no manual unzipping
 * required either way. Works on web and native: only how the picked
 * file is opened differs by platform (web gets a browser File object
 * directly; native wraps the picked file:// URI so it behaves the
 * same way) — parsing itself is identical either way. This is not
 * live HealthKit access — that would need a custom native module and
 * a real device build — it's a one-time import of a file Apple
 * explicitly designed to be handed to any app.
 */
export default function AppleHealthImportCard() {
  const importWeightEntries = useAppStore((s) => s.importWeightEntries);
  const importCycleLogs = useAppStore((s) => s.importCycleLogs);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ weights: number; cycleDays: number; ovulationDays: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Everything lives inside this try/catch, including the file-picker
  // call itself, so nothing here can surface as an unhandled crash —
  // any failure just shows as a message in the card.
  const handleImport = async () => {
    setError(null);
    setResult(null);
    setImporting(true);
    setProgress(0);

    try {
      let file: (Blob & { name?: string; type?: string }) | Awaited<ReturnType<typeof openNativeHealthFile>>;
      let name: string;

      if (Platform.OS === 'web') {
        // Bypasses expo-document-picker's web implementation entirely —
        // see pickWebFile's own comment for why: it forces every file
        // through FileReader.readAsDataURL(), which is a real crash
        // risk for a file this size.
        const webFile = await pickWebFile('.zip,.xml,application/zip,application/xml,text/xml');
        if (!webFile) {
          setImporting(false);
          return;
        }
        file = webFile;
        name = webFile.name;
      } else {
        const picked = await DocumentPicker.getDocumentAsync({
          type: ['application/zip', 'application/xml', 'text/xml', '*/*'],
          copyToCacheDirectory: true,
        });
        if (picked.canceled || !picked.assets?.[0]) {
          setImporting(false);
          return;
        }
        const asset = picked.assets[0];
        name = asset.name || 'export';
        file = await openNativeHealthFile(asset.uri, name);
      }

      const lowerName = name.toLowerCase();
      if (!lowerName.endsWith('.xml') && !lowerName.endsWith('.zip')) {
        setError('Please upload the export.zip from the Health app, or export.xml if you already extracted it.');
        setImporting(false);
        return;
      }

      const health = await parseAppleHealthFile(file as any, setProgress);

      // Weight and cycle history import as one batch each — real dates
      // preserved, one storage write per domain instead of one per
      // entry, which matters a lot on a real export with months or
      // years of records.
      const weightEntries = Object.entries(health.weightByDate || {}).map(([date, weightLbs]) => ({ date, weightLbs }));
      await importWeightEntries(weightEntries);

      const cycleEntries = [
        ...Array.from(health.periodDates || []).map((date) => ({ date, phase: 'menstrual' as const })),
        ...Array.from(health.ovulationDates || []).map((date) => ({ date, phase: 'ovulation' as const })),
      ];
      await importCycleLogs(cycleEntries);

      setResult({
        weights: weightEntries.length,
        cycleDays: health.periodDates?.size || 0,
        ovulationDays: health.ovulationDates?.size || 0,
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong reading that file. Try again, or make sure it's the export from the Health app.");
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  return (
    <View className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-2xl p-4 mb-4">
      <Text className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2">🍎 Apple Health Import</Text>
      <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-1">Import your weight and cycle history</Text>
      <Text className="text-slate-500 text-xs mb-4">
        In the Health app: profile icon (top right) → Export All Health Data. Upload the .zip it gives you directly — no need to extract it first. This reads the file on your device only; nothing is uploaded anywhere.
      </Text>

      <Pressable onPress={handleImport} disabled={importing} className="bg-indigo-600 rounded-2xl py-4 items-center active:bg-indigo-500">
        {importing ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color="#fff" size="small" />
            <Text className="text-white font-semibold">{Math.round(progress * 100)}%</Text>
          </View>
        ) : (
          <Text className="text-white font-semibold">Choose file (.zip or .xml)</Text>
        )}
      </Pressable>

      {result && (
        <View className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-400 rounded-xl p-3 mt-3">
          <Text className="text-emerald-700 dark:text-emerald-300 text-sm">
            Imported {result.weights} weight entries, {result.cycleDays} period days, and {result.ovulationDays} ovulation days ✓
          </Text>
        </View>
      )}
      {error && (
        <View className="bg-amber-50 dark:bg-amber-500/10 border border-amber-400 rounded-xl p-3 mt-3">
          <Text className="text-amber-700 dark:text-amber-300 text-sm">{error}</Text>
        </View>
      )}
    </View>
  );
}
