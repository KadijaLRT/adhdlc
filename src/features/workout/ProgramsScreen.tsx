import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
// Note: the "Switch program"/"Choose a program" list below is rendered
// with a plain .map() rather than a nested FlatList. A FlatList nested
// inside this screen's outer ScrollView — even with scrollEnabled={false}
// — still registers as its own VirtualizedList and can claim the touch/
// pan responder before the outer ScrollView does, which is what was
// blocking scrolling on this page. The gym-equipment strip above stays a
// FlatList since it scrolls horizontally on a different axis and doesn't
// fight the vertical ScrollView the same way.
import { useAppStore, selectActiveProgramId, selectGyms, selectActiveGymId, selectFitnessPreferences, selectCustomPrograms } from '@/store/index';
import { PROGRAMS, getProgramById, type ProgramDefinition } from '@/content/programs';
import { getCurrentProgramWeek, getSessionsThisWeek } from './buildProgramSession';
import { recommendProgramId } from './recommendProgram';
import { avivaBrain } from '@/core/ai/AvivaBrain';
import { describeAiFailure } from '@/core/ai/describeAiFailure';
import { generateId } from '@/shared/generateId';
import { Heading, Subheading } from '@/shared/components/Heading';

const EQUIPMENT_OPTIONS = ['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'resistance_band'];

function GymSelectorCard() {
  const gyms = useAppStore(selectGyms);
  const activeGymId = useAppStore(selectActiveGymId);
  const addGym = useAppStore((s) => s.addGym);
  const updateGymEquipment = useAppStore((s) => s.updateGymEquipment);
  const removeGym = useAppStore((s) => s.removeGym);
  const setActiveGym = useAppStore((s) => s.setActiveGym);

  const [adding, setAdding] = useState(false);
  const [managingGymId, setManagingGymId] = useState<string | null>(null);
  const [newGymName, setNewGymName] = useState('');
  const [newGymEquipment, setNewGymEquipment] = useState<string[]>(['bodyweight']);

  const activeGym = gyms.find((g) => g.id === activeGymId) || null;
  const managingGym = gyms.find((g) => g.id === managingGymId) || null;

  const toggleEquipment = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((e) => e !== item) : [...list, item]);
  };

  const handleAddGym = async () => {
    if (!newGymName.trim()) return;
    await addGym(newGymName.trim(), newGymEquipment);
    setNewGymName('');
    setNewGymEquipment(['bodyweight']);
    setAdding(false);
  };

  if (adding) {
    return (
      <View className="bg-white border-2 border-indigo-500 rounded-2xl p-4 mb-4 dark:bg-slate-900">
        <TextInput
          value={newGymName}
          onChangeText={setNewGymName}
          placeholder="Gym name..."
          placeholderTextColor="#64748b"
          autoFocus
          className="bg-stone-100 text-slate-900 rounded-xl px-3 py-2 mb-3 dark:text-slate-100 dark:bg-slate-800"
        />
        <Text className="text-slate-700 text-xs font-medium mb-2 dark:text-slate-300">What equipment does this gym have?</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {EQUIPMENT_OPTIONS.map((eq) => {
            const isActive = newGymEquipment.includes(eq);
            return (
              <Pressable key={eq} onPress={() => toggleEquipment(newGymEquipment, setNewGymEquipment, eq)}
                className={isActive ? 'bg-emerald-100 border-2 border-emerald-500 rounded-full py-2 px-3' : 'bg-stone-100 border-2 border-transparent rounded-full py-2 px-3'}>
                <Text className={isActive ? 'text-emerald-700 text-xs capitalize' : 'text-slate-700 text-xs capitalize'}>{eq.replace('_', ' ')}</Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={handleAddGym} className="flex-1 bg-indigo-600 rounded-xl py-3 items-center">
            <Text className="text-white text-sm font-semibold">Save gym</Text>
          </Pressable>
          <Pressable onPress={() => setAdding(false)} className="py-3 px-4">
            <Text className="text-slate-500 text-sm">Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (managingGym) {
    return (
      <View className="bg-white border-2 border-indigo-500 rounded-2xl p-4 mb-4 dark:bg-slate-900">
        <Text className="text-slate-900 font-semibold mb-3 dark:text-slate-100">{managingGym.name}</Text>
        <Text className="text-slate-700 text-xs font-medium mb-2 dark:text-slate-300">Equipment available here</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {EQUIPMENT_OPTIONS.map((eq) => {
            const isActive = managingGym.equipment.includes(eq);
            return (
              <Pressable key={eq}
                onPress={() => updateGymEquipment(managingGym.id, isActive ? managingGym.equipment.filter((e) => e !== eq) : [...managingGym.equipment, eq])}
                className={isActive ? 'bg-emerald-100 border-2 border-emerald-500 rounded-full py-2 px-3' : 'bg-stone-100 border-2 border-transparent rounded-full py-2 px-3'}>
                <Text className={isActive ? 'text-emerald-700 text-xs capitalize' : 'text-slate-700 text-xs capitalize'}>{eq.replace('_', ' ')}</Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={() => setManagingGymId(null)} className="flex-1 bg-indigo-600 rounded-xl py-3 items-center">
            <Text className="text-white text-sm font-semibold">Done</Text>
          </Pressable>
          <Pressable onPress={() => { removeGym(managingGym.id); setManagingGymId(null); }} className="py-3 px-4">
            <Text className="text-red-600 text-sm dark:text-red-400">Remove gym</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-4">
      {gyms.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={gyms}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ gap: 8, marginBottom: 8 }}
          renderItem={({ item }) => {
            const isActive = item.id === activeGymId;
            return (
              <Pressable onPress={() => setActiveGym(item.id)} onLongPress={() => setManagingGymId(item.id)}
                className={isActive ? 'bg-purple-100 border-2 border-purple-500 rounded-2xl py-3 px-4' : 'bg-white border-2 border-stone-200 rounded-2xl py-3 px-4'}>
                <Text className={isActive ? 'text-purple-700 font-semibold text-sm' : 'text-slate-700 text-sm'}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      )}
      <Pressable onPress={() => setAdding(true)} className="bg-purple-50 border-2 border-purple-400 rounded-2xl p-4 flex-row items-center justify-between">
        <View>
          <Text className="text-purple-700 font-semibold">{activeGym ? `Exercises tailored to ${activeGym.name}` : 'Add a gym'}</Text>
          <Text className="text-slate-500 text-xs">{gyms.length > 0 ? 'Tap a gym to switch, hold to edit equipment, or add another' : "Workouts adapt to that gym's actual equipment"}</Text>
        </View>
      </Pressable>
    </View>
  );
}

// This screen is now just the program switcher: gym equipment, the
// currently active program with a Stop option, and the list of other
// programs to switch to. The day-of-week split view (day strip +
// DayCard list) lives on the Workouts tab landing page
// (WorkoutsHome.tsx), which is what actually opens when a program is
// active — this screen is only reached via the "Programs" button
// from there.
export default function ProgramsScreen() {
  const router = useRouter();
  const activeProgramId = useAppStore(selectActiveProgramId);
  const sessionsCompletedInProgram = useAppStore((s) => s.sessionsCompletedInProgram);
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const customPrograms = useAppStore(selectCustomPrograms);
  const startProgram = useAppStore((s) => s.startProgram);
  const stopProgram = useAppStore((s) => s.stopProgram);
  const addCustomProgram = useAppStore((s) => s.addCustomProgram);
  const removeCustomProgram = useAppStore((s) => s.removeCustomProgram);

  const [showGenerator, setShowGenerator] = useState(false);
  const [generateInput, setGenerateInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  const activeProgram = getProgramById(activeProgramId, customPrograms || []);
  const currentWeek = activeProgram ? getCurrentProgramWeek(activeProgram, sessionsCompletedInProgram) : 0;
  const sessionsThisWeek = activeProgram ? getSessionsThisWeek(activeProgram, sessionsCompletedInProgram) : 0;
  // Only meaningful once someone has actually set fitness preferences —
  // otherwise every program would show "recommended" from the same
  // no-signal default, which is noise, not personalization.
  const recommendedId = fitnessPreferences ? recommendProgramId(fitnessPreferences) : null;

  const handleGenerate = async () => {
    if (!generateInput.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    const generated = await avivaBrain.generateWorkoutProgram(generateInput);
    setGenerating(false);
    if (!generated) {
      setGenerateError(describeAiFailure(avivaBrain.lastErrorReason));
      return;
    }
    const program: ProgramDefinition = { id: generateId('program'), ...generated };
    await addCustomProgram(program);
    setGenerateInput('');
    setShowGenerator(false);
  };

  const allPrograms = [...PROGRAMS, ...(customPrograms || [])];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Programs</Heading>

        <GymSelectorCard />

        {activeProgram && (
          <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900">
            <View className="flex-row items-center justify-between mb-1">
              <Subheading>{activeProgram.emoji} {activeProgram.title}</Subheading>
              <Pressable onPress={stopProgram}>
                <Text className="text-slate-500 text-xs">Stop</Text>
              </Pressable>
            </View>
            <Text className="text-slate-500 text-xs">
              Week {currentWeek} of {activeProgram.durationWeeks} · {sessionsThisWeek} of {activeProgram.daysPerWeek} sessions this week
            </Text>
          </View>
        )}

        {showGenerator ? (
          <View className="bg-white border-2 border-indigo-500 rounded-2xl p-4 mb-4 dark:bg-slate-900">
            <Text className="text-slate-900 font-semibold mb-1 dark:text-slate-100">Describe the program you want</Text>
            <Text className="text-slate-500 text-xs mb-3">Any length, any focus, any schedule — nothing here is limited to the built-in options.</Text>
            <TextInput
              value={generateInput}
              onChangeText={setGenerateInput}
              placeholder="e.g. '6 days a week, upper/lower split, 7 exercises per session, 12 weeks'"
              placeholderTextColor="#64748b"
              multiline
              className="bg-stone-100 text-slate-900 rounded-xl px-3 py-2 mb-3 dark:text-slate-100 dark:bg-slate-800"
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
            {generateError && <Text className="text-amber-600 dark:text-amber-400 text-xs mb-3">{generateError}</Text>}
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleGenerate}
                disabled={generating || !generateInput.trim()}
                className={generating || !generateInput.trim() ? 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-3 items-center' : 'flex-1 bg-indigo-600 rounded-xl py-3 items-center active:bg-indigo-500'}
              >
                {generating ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white text-sm font-semibold">✨ Generate</Text>}
              </Pressable>
              <Pressable onPress={() => { setShowGenerator(false); setGenerateError(null); }} className="py-3 px-4">
                <Text className="text-slate-500 text-sm">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setShowGenerator(true)} className="border-2 border-indigo-500 rounded-2xl py-3 items-center mb-4">
            <Text className="text-indigo-700 dark:text-indigo-300 text-sm font-semibold">✨ Generate a new program</Text>
          </Pressable>
        )}

        {/*
          6-12-25 isn't a multi-week program like the ones below (it has
          no daysPerWeek/durationWeeks progression) — it's a technique
          you can apply to any single muscle group on any given day. So
          rather than force it into the ProgramDefinition shape just to
          appear in the "Choose a program" list (which would misleadingly
          suggest it's a weeks-long plan you "start"), it gets its own
          clearly-separate card here.
        */}
        <Pressable
          onPress={() => router?.push?.('/fitness/six-twelve-twentyfive')}
          className="bg-white border-2 border-orange-400 rounded-2xl p-4 mb-4 dark:bg-slate-900"
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-slate-900 font-semibold dark:text-slate-100">🔥 6-12-25 Method</Text>
            <Text className="text-orange-500 text-[10px] font-bold uppercase tracking-wide">Technique</Text>
          </View>
          <Text className="text-slate-500 text-xs">Not a weekly program — a single-session technique you can use for any muscle group, anytime.</Text>
        </Pressable>

        <Text className="text-slate-900 text-lg font-semibold mb-3 dark:text-slate-100">{activeProgram ? 'Switch program' : 'Choose a program'}</Text>
        <View style={{ gap: 10 }}>
          {allPrograms.filter((p) => p.id !== activeProgramId).map((item) => {
            const isCustom = !PROGRAMS.some((p) => p.id === item.id);
            return (
            <View key={item.id} className={item.id === recommendedId ? 'bg-white rounded-2xl p-4 border-2 border-emerald-400 dark:bg-slate-900' : 'bg-white rounded-2xl p-4 dark:bg-slate-900'}>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-slate-900 font-medium dark:text-slate-100 flex-1">{item.emoji} {item.title}</Text>
                {item.id === recommendedId && (
                  <Text className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">For you</Text>
                )}
                {isCustom && item.id !== recommendedId && (
                  <Text className="text-indigo-500 text-[10px] font-bold uppercase tracking-wide">Generated</Text>
                )}
              </View>
              <Text className="text-slate-500 text-xs mb-2">{item.forWhom}</Text>
              <Text className="text-slate-500 text-xs mb-3">
                {item.daysPerWeek}x/week · {item.durationWeeks} weeks · {item.sessionExerciseCount} exercises per session
              </Text>
              {confirmingRemoveId === item.id ? (
                <View className="flex-row gap-2">
                  <Pressable onPress={async () => { await removeCustomProgram(item.id); setConfirmingRemoveId(null); }} className="flex-1 bg-red-500 rounded-full py-2 items-center active:bg-red-400">
                    <Text className="text-white text-xs font-semibold">Remove</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmingRemoveId(null)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-full py-2 items-center">
                    <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row gap-2">
                  <Pressable onPress={() => startProgram(item.id)} className="flex-1 bg-stone-100 rounded-full py-2 items-center active:bg-stone-200 dark:bg-slate-800">
                    <Text className="text-slate-800 text-xs font-medium dark:text-slate-200">Start this program</Text>
                  </Pressable>
                  {isCustom && (
                    <Pressable onPress={() => setConfirmingRemoveId(item.id)} className="px-3 items-center justify-center">
                      <Text className="text-red-500 text-xs">Remove</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
