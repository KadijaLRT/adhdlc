import { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { avivaBrain, type BrainDumpResult } from '@/core/ai/AvivaBrain';
import type { TaskCategory } from '@/store/index';
import { useAppStore, selectReflections } from '@/store/index';
import { useSafeBottomInset } from '@/shared/hooks/useSafeTopInset';

export default function BrainDumpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrainDumpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomInset = useSafeBottomInset();
  const energyLevel = useAppStore((s) => s.energyLevel);
  const reflections = useAppStore(selectReflections);
  const isOverwhelmed = useAppStore((s) => s.isOverwhelmed);
  const addTasks = useAppStore((s) => s.addTasks);

  const handleSubmit = async () => {
    if (!text?.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    try {
      const mostRecentReflection = [...(reflections || [])].sort((a, b) => b.date.localeCompare(a.date))[0];
      const parsed = await avivaBrain.parseBrainDump(text, { currentEnergyLevel: energyLevel, isOverwhelmed, timeOfDay, recentReflection: mostRecentReflection?.note });
      if (parsed) {
        setResult(parsed);
      } else {
        setError("Aviva couldn't sort this out just now. This usually means the AI service is temporarily unreachable — try again in a moment.");
      }
    } catch (err) {
      setError('Something went wrong. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const mapBrainDumpCategory = (category: string): TaskCategory => {
    if (category === 'bill' || category === 'errand') return 'errands';
    if (category === 'appointment' || category === 'reminder' || category === 'phone_call') return 'general';
    return 'general';
  };

  const handleAddAll = async () => {
    const createdAt = new Date().toISOString();
    const newTasks = (result?.items || []).map((item) => ({
      id: item.id,
      title: item.text,
      isComplete: false,
      energyRequired: item.suggestedEnergyLevel,
      category: mapBrainDumpCategory(item.category),
      priority: 'nice' as const,
      createdAt,
      subSteps: [],
    }));
    await addTasks(newTasks);
    setText(''); setResult(null); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-stone-50 rounded-t-3xl p-6 max-h-[85%] dark:bg-slate-950" style={{ paddingBottom: bottomInset }}>
          <Text className="text-slate-900 text-xl font-semibold mb-1 dark:text-slate-100">Brain Dump</Text>
          <Text className="text-slate-500 text-sm mb-4">Type whatever&apos;s in your head. Aviva will sort it out.</Text>
          <TextInput value={text} onChangeText={setText} placeholder="everything is chaos..." placeholderTextColor="#64748b" multiline
            className="bg-white text-slate-900 rounded-xl p-4 min-h-[100px] mb-4 dark:text-slate-100 dark:bg-slate-900" />
          {error && (
            <View className="bg-amber-50 border border-amber-400 rounded-xl p-3 mb-3 dark:bg-amber-500/10">
              <Text className="text-amber-700 dark:text-amber-300 text-sm">{error}</Text>
            </View>
          )}
          {!result && (
            <Pressable onPress={handleSubmit} disabled={loading} className="bg-indigo-600 rounded-full py-4 mb-2 active:bg-indigo-500">
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-center font-semibold">Sort this out</Text>}
            </Pressable>
          )}
          {result && (
            <ScrollView className="mb-4 max-h-64">
              <Text className="text-emerald-700 text-sm mb-3 dark:text-emerald-400">{result?.reasoning || ''}</Text>
              {(result?.items || []).map((item) => (
                <View key={item.id} className="bg-white rounded-xl p-3 mb-2 dark:bg-slate-900">
                  <Text className="text-slate-900 dark:text-slate-100">{item.text}</Text>
                  <Text className="text-slate-500 text-xs mt-1">{item.category} · {item.suggestedTiming}</Text>
                </View>
              ))}
              <Pressable onPress={handleAddAll} className="bg-emerald-500 rounded-full py-3 mt-2">
                <Text className="text-white text-center font-semibold">Add all to my tasks</Text>
              </Pressable>
            </ScrollView>
          )}
          <Pressable onPress={onClose} className="py-3">
            <Text className="text-slate-500 text-center text-sm">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
