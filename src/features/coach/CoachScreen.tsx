import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useAppStore, selectReflections, selectProfile, selectFitnessPreferences } from '@/store/index';
import { AGENTS } from '@/core/ai/agents';
import { askOrchestrator } from '@/core/ai/orchestrator';
import { resolveBrainTypeTraits } from '@/content/brainTypes';
import { buildRestrictionBrief } from '@/core/ai/restrictionBrief';
import { Heading } from '@/shared/components/Heading';

export default function CoachScreen() {
  const energyLevel = useAppStore((s) => s.energyLevel);
  const isOverwhelmed = useAppStore((s) => s.isOverwhelmed);
  const reflections = useAppStore(selectReflections);
  const profile = useAppStore(selectProfile);
  const savedRestrictions = useAppStore(selectFitnessPreferences)?.restrictions;
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedLabel = selectedAgentId ? ((AGENTS || []).find((a) => a.id === selectedAgentId)?.label || 'Auto') : 'Auto (I\'ll route it)';
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<{ agentLabel: string; message: string; reasoning: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!message?.trim()) return;
    setLoading(true);
    setError(null);
    setReply(null);
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    const mostRecentReflection = [...(reflections || [])].sort((a, b) => b.date.localeCompare(a.date))[0];

    try {
      const { agentLabel, response } = await askOrchestrator(
        message,
        { energyLevel, isOverwhelmed, timeOfDay, recentReflection: mostRecentReflection?.note, coachingStyle: profile?.coachingStyle, brainTypeTraits: resolveBrainTypeTraits(profile?.brainTypes), restrictionBrief: buildRestrictionBrief(savedRestrictions) },
        selectedAgentId || undefined
      );

      if (response) {
        setReply({ agentLabel, message: response.message, reasoning: response.reasoning });
      } else {
        setError("Aviva couldn't get a response back just now. This usually means the AI service is temporarily unreachable — try again in a moment.");
      }
    } catch (err) {
      setError("Something went wrong reaching Aviva. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Chat with Aviva</Heading>
        <Text className="text-slate-500 text-sm mb-4">Pick a specialist, or just ask and I&apos;ll route it for you.</Text>

        <View className="mb-4">
          <Pressable
            onPress={() => setMenuOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel="Choose a specialist"
            accessibilityState={{ expanded: menuOpen }}
            className="bg-white dark:bg-slate-900 border-2 border-indigo-400/40 rounded-xl px-4 py-3 flex-row items-center justify-between"
          >
            <Text className="text-slate-900 dark:text-slate-100 text-sm">{selectedLabel}</Text>
            <Text className="text-slate-500 text-xs">{menuOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {menuOpen && (
            <View className="bg-white dark:bg-slate-900 rounded-xl mt-2 overflow-hidden border border-slate-200 dark:border-slate-800">
              {[{ id: null as string | null, label: 'Auto (I\'ll route it)' }, ...(AGENTS || []).map((a) => ({ id: a.id as string | null, label: a.label }))].map((opt) => {
                const active = selectedAgentId === opt.id;
                return (
                  <Pressable
                    key={opt.id ?? 'auto'}
                    onPress={() => { setSelectedAgentId(opt.id); setMenuOpen(false); }}
                    className={active ? 'bg-indigo-600/20 px-4 py-3' : 'px-4 py-3 active:bg-slate-100 dark:active:bg-slate-800'}
                  >
                    <Text className={active ? 'text-indigo-700 dark:text-indigo-300 text-sm font-medium' : 'text-slate-700 dark:text-slate-300 text-sm'}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="What's on your mind?"
          placeholderTextColor="#64748b"
          multiline
          className="bg-white text-slate-900 rounded-xl p-4 min-h-[80px] mb-4 dark:text-slate-100 dark:bg-slate-900"
        />

        <Pressable onPress={handleAsk} disabled={loading} className="bg-indigo-600 rounded-full py-4 mb-6 active:bg-indigo-500">
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-center font-semibold">Ask</Text>}
        </Pressable>

        {error && (
          <View className="bg-amber-50 border border-amber-400 rounded-2xl p-4 mb-4 dark:bg-amber-500/10">
            <Text className="text-amber-700 dark:text-amber-300 text-sm">{error}</Text>
          </View>
        )}

        {reply && (
          <View className="bg-white rounded-2xl p-4 dark:bg-slate-900">
            <Text className="text-indigo-700 text-xs uppercase tracking-wider mb-2 dark:text-indigo-300">{reply.agentLabel}</Text>
            <Text className="text-slate-900 mb-3 dark:text-slate-100">{reply.message}</Text>
            <Text className="text-slate-500 text-xs">{reply.reasoning}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
