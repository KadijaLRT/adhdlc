import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useAppStore, selectThoughtReframes, selectFrustrationEntries, selectSabotageChecks } from '@/store/index';

const DISTORTIONS = [
  'All-or-nothing thinking', 'Catastrophizing', 'Mind reading', 'Personalization',
  'Should statements', 'Emotional reasoning', 'Overgeneralization', 'Labeling',
];

const SABOTAGE_PATTERNS = [
  { id: 'procrastinate', label: 'I procrastinate on things that matter most' },
  { id: 'perfectionism', label: 'I do not start unless I can do it perfectly' },
  { id: 'overcommit', label: 'I say yes to everything then deliver nothing' },
  { id: 'avoidance', label: 'I avoid situations where I might fail' },
  { id: 'selfsabotage', label: 'When things are going well I do something to mess it up' },
  { id: 'isolation', label: 'I withdraw from people when I am struggling' },
  { id: 'rumination', label: 'I replay mistakes repeatedly instead of moving forward' },
  { id: 'comparison', label: 'I compare myself to others and feel hopeless' },
];

type WorkbookTab = 'reframe' | 'frustration' | 'sabotage';

export default function WorkbookCard() {
  const [tab, setTab] = useState<WorkbookTab>('reframe');
  const thoughtReframes = useAppStore(selectThoughtReframes);
  const frustrationEntries = useAppStore(selectFrustrationEntries);
  const sabotageChecks = useAppStore(selectSabotageChecks);
  const saveThoughtReframe = useAppStore((s) => s.saveThoughtReframe);
  const saveFrustrationEntry = useAppStore((s) => s.saveFrustrationEntry);
  const saveSabotageCheck = useAppStore((s) => s.saveSabotageCheck);

  // Thought reframe
  const [thought, setThought] = useState('');
  const [distortion, setDistortion] = useState<string | null>(null);
  const [reframe, setReframe] = useState('');
  const [reframeSaved, setReframeSaved] = useState(false);

  // Frustration processing
  const [frustLevel, setFrustLevel] = useState(5);
  const [frustTrigger, setFrustTrigger] = useState('');
  const [frustLogged, setFrustLogged] = useState(false);

  // Self-sabotage check
  const [sabotageSelected, setSabotageSelected] = useState<string[]>([]);
  const [sabotageSaved, setSabotageSaved] = useState(false);

  const toggleSabotage = (id: string) => {
    setSabotageSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    setSabotageSaved(false);
  };

  // Bug fix: none of these three exercises ever wrote anywhere —
  // everything below was local component state only, so filling out a
  // reframe, logging a frustration entry (complete with a "Logged."
  // message implying it had been saved), or checking off self-sabotage
  // patterns was silently lost the moment the screen unmounted. All
  // three now persist through workbookSlice.ts.
  const handleSaveReframe = async () => {
    if (!thought.trim() && !reframe.trim()) return;
    await saveThoughtReframe(thought.trim(), distortion, reframe.trim());
    setReframeSaved(true);
    setTimeout(() => setReframeSaved(false), 2000);
  };

  const handleSaveSabotageCheck = async () => {
    if (!sabotageSelected.length) return;
    await saveSabotageCheck(sabotageSelected);
    setSabotageSaved(true);
  };

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-3">📝 Workbook</Text>

      <View className="flex-row gap-2 mb-4">
        {([
          { id: 'reframe', label: 'Reframe' },
          { id: 'frustration', label: 'Frustration' },
          { id: 'sabotage', label: 'Patterns' },
        ] as { id: WorkbookTab; label: string }[]).map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            className={tab === t.id ? 'flex-1 bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-2 items-center' : 'flex-1 bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-2 items-center'}
          >
            <Text className={tab === t.id ? 'text-indigo-700 dark:text-indigo-300 text-xs font-medium' : 'text-slate-700 dark:text-slate-300 text-xs font-medium'}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'reframe' && (
        <View>
          <Text className="text-slate-500 text-xs mb-2">What thought is stuck on repeat?</Text>
          <TextInput
            value={thought}
            onChangeText={setThought}
            placeholder="e.g. I always mess this up"
            placeholderTextColor="#64748b"
            multiline
            className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 min-h-[60px] mb-3"
          />
          <Text className="text-slate-500 text-xs mb-2">Does it match a pattern?</Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {DISTORTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDistortion(distortion === d ? null : d)}
                className={distortion === d ? 'bg-amber-400/10 border-2 border-amber-400 rounded-full py-1.5 px-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-1.5 px-3'}
              >
                <Text className={distortion === d ? 'text-amber-700 dark:text-amber-400 text-xs' : 'text-slate-600 dark:text-slate-300 text-xs'}>{d}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-slate-500 text-xs mb-2">A more balanced version:</Text>
          <TextInput
            value={reframe}
            onChangeText={setReframe}
            placeholder="What would you tell a friend thinking this?"
            placeholderTextColor="#64748b"
            multiline
            className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 min-h-[60px] mb-3"
          />
          <Pressable onPress={handleSaveReframe} className="bg-indigo-600 rounded-xl py-3 items-center active:bg-indigo-500">
            <Text className="text-white text-sm font-semibold">{reframeSaved ? 'Saved ✓' : 'Save this reframe'}</Text>
          </Pressable>
          {thoughtReframes.length > 0 && (
            <Text className="text-slate-400 text-[11px] mt-2">{thoughtReframes.length} reframe{thoughtReframes.length === 1 ? '' : 's'} saved so far.</Text>
          )}
        </View>
      )}

      {tab === 'frustration' && (
        <View>
          {frustLogged ? (
            <View className="items-center py-4">
              <Text className="text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-1">Logged.</Text>
              <Text className="text-slate-500 text-xs text-center mb-3">Naming it is the first step to it passing.</Text>
              {frustrationEntries.length > 0 && (
                <Text className="text-slate-400 text-[11px] mb-3">{frustrationEntries.length} entr{frustrationEntries.length === 1 ? 'y' : 'ies'} saved so far.</Text>
              )}
              <Pressable onPress={() => { setFrustLogged(false); setFrustTrigger(''); setFrustLevel(5); }} className="py-2">
                <Text className="text-slate-500 text-xs">Log another</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text className="text-slate-500 text-xs mb-2">How frustrated, 1-10?</Text>
              <View className="flex-row gap-1 mb-3">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <Pressable key={n} onPress={() => setFrustLevel(n)} className={n <= frustLevel ? 'flex-1 h-8 bg-amber-400 rounded' : 'flex-1 h-8 bg-stone-100 dark:bg-slate-800 rounded'} />
                ))}
              </View>
              <Text className="text-slate-500 text-xs mb-2">What triggered it?</Text>
              <TextInput
                value={frustTrigger}
                onChangeText={setFrustTrigger}
                placeholder="Name it, briefly"
                placeholderTextColor="#64748b"
                className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-3"
              />
              <Pressable onPress={() => { setFrustLogged(true); saveFrustrationEntry(frustLevel, frustTrigger.trim()); }} className="bg-indigo-600 rounded-xl py-3 items-center active:bg-indigo-500">
                <Text className="text-white text-sm font-semibold">Log it</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {tab === 'sabotage' && (
        <View>
          <Text className="text-slate-500 text-xs mb-3">Tap anything that sounds familiar — no judgment, just noticing.</Text>
          <View className="gap-2">
            {SABOTAGE_PATTERNS.map((p) => {
              const isSelected = sabotageSelected.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => toggleSabotage(p.id)}
                  className={isSelected ? 'bg-amber-400/10 border-2 border-amber-400 rounded-xl p-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-xl p-3'}
                >
                  <Text className={isSelected ? 'text-amber-700 dark:text-amber-400 text-xs' : 'text-slate-600 dark:text-slate-300 text-xs'}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {sabotageSelected.length > 0 && (
            <>
              <Text className="text-slate-500 text-xs mt-3 mb-3">
                {sabotageSelected.length} pattern{sabotageSelected.length > 1 ? 's' : ''} noticed. Awareness is the first step — no pattern here needs fixing today, just noticing.
              </Text>
              <Pressable onPress={handleSaveSabotageCheck} className="bg-indigo-600 rounded-xl py-3 items-center active:bg-indigo-500">
                <Text className="text-white text-sm font-semibold">{sabotageSaved ? 'Saved ✓' : 'Save this check-in'}</Text>
              </Pressable>
            </>
          )}
          {sabotageChecks.length > 0 && (
            <Text className="text-slate-400 text-[11px] mt-2">{sabotageChecks.length} check-in{sabotageChecks.length === 1 ? '' : 's'} saved so far.</Text>
          )}
        </View>
      )}
    </View>
  );
}
