import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useAppStore, type EnergyLevel, type ReminderStyle, type CoachingStyle } from '@/store/index';
import { syncProfileIfSignedIn } from '@/core/supabase/client';
import { avivaBrain } from '@/core/ai/AvivaBrain';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';
import CloudBackupCard from '@/features/onboarding/CloudBackupCard';

const REMINDER_STYLES: { id: ReminderStyle; label: string; blurb: string; emoji: string }[] = [
  { id: 'consequence', label: 'Consequence-based', blurb: '"Here\'s what happens if you skip this"', emoji: '⚡' },
  { id: 'loud', label: 'Loud and direct', blurb: 'hard to ignore', emoji: '🔔' },
  { id: 'gentle', label: 'Gentle', blurb: 'supportive, no pressure', emoji: '💚' },
];

const COACHING_STYLES: { id: CoachingStyle; label: string; emoji: string }[] = [
  { id: 'gentle', label: 'Gentle', emoji: '💚' },
  { id: 'funny', label: 'Funny', emoji: '😂' },
  { id: 'reality_check', label: 'Reality Check', emoji: '⚡' },
  { id: 'friend', label: 'Like a friend', emoji: '🤝' },
  { id: 'scientific', label: 'Scientific', emoji: '🧠' },
];

function parseList(text: string): string[] {
  return (text || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Best-effort parse of casual time text ("8am", "2:30pm", "14:00") into
// 24hr "HH:MM" for the schedule. Returns null rather than guessing
// wrong if it can't confidently parse — a skipped reminder is better
// than one silently scheduled at the wrong time.
function parseTimeToHHMM(raw: string): string | null {
  const match = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hour = parseInt(match[1] || '0', 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function FinalScreen() {
  const router = useRouter();
  const o = useOnboardingStore();
  const setField = useOnboardingStore((s) => s.setField);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  // Default, not a hard gate — matches WellnessHub's same reasoning:
  // showing this by default to every man is irrelevant noise for the
  // overwhelming majority, but a rigid "hide for male" rule would
  // assume biology from a gender label, which is its own dignity
  // problem for a trans man who does menstruate. Once explicitly
  // enabled it stays visible regardless of what's selected for gender.
  const showCycleTracking = o.gender !== 'male' || o.cycleTrackingEnabled;
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/final');

  const setEnergyLevel = useAppStore((s) => s.setEnergyLevel);
  const setProfile = useAppStore((s) => s.setProfile);
  const addTask = useAppStore((s) => s.addTask);
  const setNutritionPreferences = useAppStore((s) => s.setNutritionPreferences);
  const setFitnessPreferences = useAppStore((s) => s.setFitnessPreferences);
  const setWellnessPreferences = useAppStore((s) => s.setWellnessPreferences);
  const setCycleTrackingEnabled = useAppStore((s) => s.setCycleTrackingEnabled);
  const logWeight = useAppStore((s) => s.logWeight);
  const setWeightGoal = useAppStore((s) => s.setWeightGoal);
  const addScheduleItem = useAppStore((s) => s.addScheduleItem);

  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    setFinishing(true);
    // Same fix — never let a haptics rejection go unhandled or block finishing onboarding.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const timezone = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'UTC';
    const unparsedMedicationTimes: string[] = [];

    const profile = {
      timezone,
      energyBaseline: o.energyBaseline,
      stressThreshold: o.stressThreshold,
      biggestHurdle: o.biggestHurdle,
      onboardingCompletedAt: new Date().toISOString(),
      displayName: o.displayName || undefined,
      ageBracket: o.ageBracket || undefined,
      selectedModules: o.selectedModules,
      adhdSymptoms: o.adhdSymptoms,
      brainTypes: o.brainTypes,
      supportMethods: o.supportMethods,
      reminderStyle: o.reminderStyle || undefined,
      coachingStyle: o.coachingStyle || undefined,
      sleepStruggles: o.sleepStruggles,
      wantsMedicationReminders: o.wantsMedicationReminders ?? undefined,
      emotionalRegulationHelpers: o.emotionalRegulationHelpers,
    };

    // Everything local and instant happens first and is never blocked by
    // a network call. If anything below fails, the person still has a
    // saved profile and still reaches Home — onboarding must never be
    // able to strand someone on a spinner.
    try {
      setEnergyLevel(o.energyBaseline);
      await setProfile(profile);

      await setNutritionPreferences({
        allergies: parseList(o.allergies),
        dietaryRestrictions: [],
        foodsLoved: parseList(o.foodsLoved),
        foodsAvoided: parseList(o.foodsAvoided),
      });

      await setFitnessPreferences({
        equipment: ['bodyweight'],
        primaryGoal: o.exerciseGoals.includes('get_stronger') ? 'strength' : o.exerciseGoals.includes('flexibility') ? 'mobility' : o.exerciseGoals.includes('cardio') ? 'endurance' : 'general',
        gender: o.gender,
        weightGoalDirections: o.weightGoalDirections,
        bodyType: o.bodyType || undefined,
        activityLevel: o.activityLevel || undefined,
        exerciseGoals: o.exerciseGoals,
        focusAreas: o.focusAreas,
      });

      if (o.bloodType) {
        await setWellnessPreferences({ bloodTypeEnabled: true, bloodType: o.bloodType });
      }

      if (o.startingWeightLbs && Number(o.startingWeightLbs) > 0) {
        await logWeight(Number(o.startingWeightLbs));
      }
      if (o.goalWeightLbs && Number(o.goalWeightLbs) > 0) {
        await setWeightGoal(Number(o.goalWeightLbs), o.goalDate?.trim() || null);
      }

      if (o.cycleTrackingEnabled) {
        await setCycleTrackingEnabled(true);
      }

      // Medication times become real Schedule items immediately — a
      // concrete answer to "wire it to functionality," not just stored data.
      if (o.wantsMedicationReminders && o.medicationTimes?.trim()) {
        const times = parseList(o.medicationTimes);
        for (const rawTime of times) {
          const parsedTime = parseTimeToHHMM(rawTime);
          if (parsedTime) {
            await addScheduleItem({
              id: `med-${Date.now()}-${rawTime}`,
              label: '💊 Medication',
              time: parsedTime,
              refKind: 'freeform',
            });
          } else {
            // Bug fix: an unparseable time (e.g. "whenever I remember"
            // mixed in with "8am, 2pm") used to be silently dropped —
            // no reminder created, and no indication to the person that
            // anything had gone wrong. For a medication reminder,
            // silently missing one is a real problem, not a cosmetic
            // one. This surfaces on the Home screen once, right after
            // onboarding, rather than vanishing without a trace.
            unparsedMedicationTimes.push(rawTime);
          }
        }
      }
    } catch (error) {
      console.error('onboarding: local save failed', error);
      // Continue anyway — whatever did save, saved; the person should
      // never be stuck here because of this.
    }

    // If any medication times couldn't be parsed, this becomes a real
    // task on their list rather than a silently dropped reminder —
    // something concrete pointing back at the exact problem, right
    // where they'll actually see it (Home/Tasks), instead of vanishing
    // with no trace.
    if (unparsedMedicationTimes.length > 0) {
      try {
        await addTask({
          id: `onboarding-medtime-fix-${Date.now()}`,
          title: `Set exact times for medication reminders: "${unparsedMedicationTimes.join('", "')}" — couldn't tell what time you meant`,
          isComplete: false,
          energyRequired: 'low',
          priority: 'important',
          category: 'health',
          createdAt: new Date().toISOString(),
          subSteps: [],
        });
      } catch (error) {
        console.error('onboarding: failed to add medication-time follow-up task', error);
      }
    }

    // The AI-dependent first task is a nice-to-have, never a blocker.
    // Timeout-raced so a slow or unreachable AI service can't hang
    // onboarding — after 6 seconds it gives up and falls back to a
    // plain, undivided task instead.
    if (o.biggestHurdle?.trim()) {
      try {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

        const decomposition = await Promise.race([
          avivaBrain.decomposeTask(o.biggestHurdle, {
            currentEnergyLevel: o.energyBaseline,
            isOverwhelmed: false,
            timeOfDay,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
        ]);

        if (decomposition) {
          await addTask({
            id: `onboarding-${Date.now()}`,
            title: decomposition.originalTask || o.biggestHurdle,
            isComplete: false,
            energyRequired: decomposition.suggestedEnergyLevel,
            realMinutes: decomposition.estimatedRealMinutes,
            estimatedMinutes: decomposition.estimatedIdealMinutes,
            priority: 'important',
            category: 'general',
            createdAt: new Date().toISOString(),
            subSteps: (decomposition.subSteps || []).map((s) => ({ id: s.id, title: s.title, isComplete: false })),
          });
        } else {
          await addTask({
            id: `onboarding-${Date.now()}`,
            title: o.biggestHurdle,
            isComplete: false,
            energyRequired: o.energyBaseline,
            priority: 'important',
            category: 'general',
            createdAt: new Date().toISOString(),
            subSteps: [],
          });
        }
      } catch (error) {
        console.error('onboarding: AI task breakdown failed, continuing without it', error);
      }
    }

    // Fire-and-forget, never awaited in a way that could block navigation.
    try {
      syncProfileIfSignedIn(profile);
    } catch (error) {
      console.error('onboarding: cloud sync failed', error);
    }

    resetOnboarding();
    router?.replace?.('/(tabs)/home');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-2">Almost there 🎉</Text>
          <Text className="text-slate-400 text-sm mb-6">A few last things. These help your reminders feel right for how your brain works.</Text>

          {showCycleTracking && (
          <View className="bg-purple-400/10 border-2 border-purple-400 rounded-2xl p-4 mb-6">
            <Text className="text-purple-300 font-medium mb-1">🌸 Cycle & Wellness Tracking</Text>
            <Text className="text-slate-400 text-xs mb-3">Track how your cycle affects your mood, energy, and ADHD symptoms. Optional and off by default.</Text>
            <Pressable
              onPress={() => setField('cycleTrackingEnabled', !o.cycleTrackingEnabled)}
              className={o.cycleTrackingEnabled ? 'bg-purple-400/20 border-2 border-purple-400 rounded-xl py-2 items-center' : 'bg-slate-800 rounded-xl py-2 items-center'}
            >
              <Text className={o.cycleTrackingEnabled ? 'text-purple-200 font-medium' : 'text-slate-300 font-medium'}>
                {o.cycleTrackingEnabled ? 'Cycle tracking enabled ✓' : 'Enable cycle tracking'}
              </Text>
            </Pressable>
          </View>
          )}

          <CloudBackupCard />

          <Text className="text-slate-100 text-lg font-semibold mb-1">How should I coach you?</Text>
          <Text className="text-slate-400 text-sm mb-4">This shapes Aviva's tone in every conversation.</Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {COACHING_STYLES.map((style) => {
              const isActive = o.coachingStyle === style.id;
              return (
                <Pressable key={style.id} onPress={() => setField('coachingStyle', style.id)} className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 px-4' : 'bg-slate-900 border-2 border-transparent rounded-full py-2 px-4'}>
                  <Text className={isActive ? 'text-emerald-300 text-sm' : 'text-slate-300 text-sm'}>{style.emoji} {style.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-slate-100 text-lg font-semibold mb-1">How do reminders land best for you?</Text>
          <Text className="text-slate-400 text-sm mb-4">There's no right answer — pick what actually gets you moving.</Text>
          <View className="gap-2 mb-8">
            {REMINDER_STYLES.map((style) => {
              const isActive = o.reminderStyle === style.id;
              return (
                <Pressable key={style.id} onPress={() => setField('reminderStyle', style.id)} className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-4' : 'bg-slate-900 border-2 border-transparent rounded-xl p-4'}>
                  <Text className={isActive ? 'text-emerald-300 font-medium' : 'text-slate-100 font-medium'}>{style.emoji} {style.label}</Text>
                  <Text className="text-slate-500 text-xs">{style.blurb}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleFinish} disabled={finishing} className="bg-emerald-500 rounded-full py-4 items-center active:bg-emerald-400">
            <Text className="text-white text-lg font-semibold">{finishing ? 'Setting things up...' : '✨ Start Using App →'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
