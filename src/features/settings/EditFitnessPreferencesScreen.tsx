import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useAppStore, selectFitnessPreferences, selectWellnessPreferences,
  type Gender, type WeightGoalDirection, type BodyType, type ActivityLevel, type SessionTimeBudget,
} from '@/store/index';
import type { BloodType } from '@/content/bloodTypeAffinities';
import { ScreenBackButton } from '@/shared/components/ScreenBackButton';

const EQUIPMENT_OPTIONS = ['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'resistance_band'];
const GENDERS: { id: Gender; label: string; emoji: string }[] = [
  { id: 'female', label: 'Female', emoji: '👩' },
  { id: 'male', label: 'Male', emoji: '👨' },
  { id: 'non_binary', label: 'Non-binary', emoji: '🌈' },
];
const WEIGHT_GOALS: { id: WeightGoalDirection; label: string; emoji: string }[] = [
  { id: 'gain', label: 'Gain', emoji: '📈' },
  { id: 'maintain', label: 'Maintain', emoji: '⚖️' },
  { id: 'lose', label: 'Lose', emoji: '📉' },
];
const BODY_TYPES: { id: BodyType; label: string; blurb: string }[] = [
  { id: 'naturally_lean', label: 'Naturally Lean', blurb: 'I struggle to gain weight or muscle' },
  { id: 'athletic_build', label: 'Athletic Build', blurb: 'My body responds pretty evenly to training' },
  { id: 'naturally_curvy', label: 'Naturally Curvy', blurb: 'I gain in hips/thighs more easily' },
  { id: 'stocky_build', label: 'Stocky Build', blurb: 'I build muscle and gain weight easily' },
];
const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; blurb: string }[] = [
  { id: 'mostly_sitting', label: 'Mostly Sitting', blurb: 'Desk job, driving, little walking' },
  { id: 'somewhat_active', label: 'Somewhat Active', blurb: 'On your feet sometimes, light walking' },
  { id: 'active', label: 'Active', blurb: 'On your feet a lot, regular movement' },
  { id: 'very_active', label: 'Very Active', blurb: 'Physically demanding job or lifestyle' },
];
const EXERCISE_GOALS = [
  { id: 'build_muscle', label: 'Build Muscle', emoji: '💪' },
  { id: 'lose_fat', label: 'Lose Fat', emoji: '🔥' },
  { id: 'cardio', label: 'Cardio', emoji: '🏃' },
  { id: 'glutes_curves', label: 'Glutes & Curves', emoji: '🍑' },
  { id: 'get_stronger', label: 'Get Stronger', emoji: '🏋️' },
  { id: 'flexibility', label: 'Flexibility', emoji: '🧘' },
  { id: 'general_health', label: 'General Health', emoji: '❤️' },
];
const SESSION_TIME_BUDGETS: { id: SessionTimeBudget; label: string; blurb: string }[] = [
  { id: 'short', label: 'Short', blurb: 'Fewer exercises per session \u2014 fits in a tight window' },
  { id: 'standard', label: 'Standard', blurb: "As programmed \u2014 no adjustment" },
  { id: 'long', label: 'Long', blurb: 'More exercises per session \u2014 when you have extra time' },
];
const FOCUS_AREAS = ['glutes', 'quads', 'hamstrings', 'back', 'chest', 'shoulders', 'arms', 'core', 'calves', 'fullbody'];
const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function goalFromExerciseGoals(exerciseGoals: string[]): 'strength' | 'endurance' | 'mobility' | 'general' {
  if (exerciseGoals.includes('get_stronger') || exerciseGoals.includes('build_muscle')) return 'strength';
  if (exerciseGoals.includes('flexibility')) return 'mobility';
  if (exerciseGoals.includes('cardio')) return 'endurance';
  return 'general';
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={active ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 px-4' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-full py-2 px-4'}>
      <Text className={active ? 'text-emerald-700 dark:text-emerald-300 text-sm' : 'text-slate-700 dark:text-slate-300 text-sm'}>{label}</Text>
    </Pressable>
  );
}

// The same questions asked during onboarding's body.tsx step, reused
// here as a real edit screen rather than the old stripped-down
// equipment+goal card. Pre-filled from what's actually saved, and only
// writes back the domains this screen owns (fitness + blood type),
// never silently touching weight/goal-date, which live in Progress.
export default function EditFitnessPreferencesScreen() {
  const router = useRouter();
  const fitnessPreferences = useAppStore(selectFitnessPreferences);
  const wellnessPreferences = useAppStore(selectWellnessPreferences);
  const setFitnessPreferences = useAppStore((s) => s.setFitnessPreferences);
  const setWellnessPreferences = useAppStore((s) => s.setWellnessPreferences);

  const [equipment, setEquipment] = useState<string[]>(fitnessPreferences?.equipment || ['bodyweight']);
  const [gender, setGender] = useState<Gender>(fitnessPreferences?.gender ?? null);
  const [weightGoalDirections, setWeightGoalDirections] = useState<WeightGoalDirection[]>(fitnessPreferences?.weightGoalDirections || []);
  const [bodyType, setBodyType] = useState<BodyType | undefined>(fitnessPreferences?.bodyType);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>(fitnessPreferences?.activityLevel);
  const [sessionTimeBudget, setSessionTimeBudget] = useState<SessionTimeBudget>(fitnessPreferences?.sessionTimeBudget || 'standard');
  const [exerciseGoals, setExerciseGoals] = useState<string[]>(fitnessPreferences?.exerciseGoals || []);
  const [focusAreas, setFocusAreas] = useState<string[]>(fitnessPreferences?.focusAreas || []);
  const [bloodType, setBloodType] = useState<BloodType | null>((wellnessPreferences?.bloodType as BloodType | null) || null);
  const [saved, setSaved] = useState(false);

  const toggleIn = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
    setSaved(false);
  };

  const handleSave = async () => {
    await setFitnessPreferences({
      equipment, gender, weightGoalDirections, bodyType, activityLevel, exerciseGoals, focusAreas, sessionTimeBudget,
      primaryGoal: goalFromExerciseGoals(exerciseGoals),
    });
    if (bloodType) {
      await setWellnessPreferences({ bloodTypeEnabled: true, bloodType });
    }
    setSaved(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScreenBackButton />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <Text className="text-slate-900 dark:text-slate-100 text-2xl font-semibold mb-2">Fitness preferences</Text>
          <Text className="text-slate-500 text-sm mb-6">The same questions from setup — update anything anytime.</Text>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">What do you have access to?</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {EQUIPMENT_OPTIONS.map((item) => (
              <Pill key={item} label={item.replace('_', ' ')} active={equipment.includes(item)} onPress={() => toggleIn(equipment, setEquipment, item)} />
            ))}
          </View>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">Gender</Text>
          <View className="flex-row gap-2 mb-2">
            {GENDERS.map((g) => <Pill key={g.id} label={`${g.emoji} ${g.label}`} active={gender === g.id} onPress={() => { setGender(g.id); setSaved(false); }} />)}
          </View>
          <Text className="text-slate-500 text-xs mb-6">Used only as a small factor in the suggested Nutrition Diary targets — never shown or used anywhere else.</Text>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">Weight goal</Text>
          <View className="flex-row gap-2 mb-6">
            {WEIGHT_GOALS.map((g) => <Pill key={g.id} label={`${g.emoji} ${g.label}`} active={weightGoalDirections.includes(g.id)} onPress={() => toggleIn(weightGoalDirections, setWeightGoalDirections as any, g.id)} />)}
          </View>
          <Text className="text-slate-500 text-xs mb-6">Starting/goal weight live in Progress, not here.</Text>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">Body type</Text>
          <View className="gap-2 mb-2">
            {BODY_TYPES.map((t) => (
              <Pressable key={t.id} onPress={() => { setBodyType(t.id); setSaved(false); }} className={bodyType === t.id ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-xl p-3'}>
                <Text className={bodyType === t.id ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-900 dark:text-slate-100 font-medium'}>{t.label}</Text>
                <Text className="text-slate-500 text-xs">{t.blurb}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-slate-500 text-xs mb-6">"Athletic build" adds a small protein bump to the suggested Nutrition Diary targets. Other options don't change anything yet.</Text>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">Daily activity level</Text>
          <View className="gap-2 mb-6">
            {ACTIVITY_LEVELS.map((a) => (
              <Pressable key={a.id} onPress={() => { setActivityLevel(a.id); setSaved(false); }} className={activityLevel === a.id ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-xl p-3'}>
                <Text className={activityLevel === a.id ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-900 dark:text-slate-100 font-medium'}>{a.label}</Text>
                <Text className="text-slate-500 text-xs">{a.blurb}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">Exercise goals</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {EXERCISE_GOALS.map((g) => <Pill key={g.id} label={`${g.emoji} ${g.label}`} active={exerciseGoals.includes(g.id)} onPress={() => toggleIn(exerciseGoals, setExerciseGoals, g.id)} />)}
          </View>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">How long should a session be?</Text>
          <View className="gap-2 mb-6">
            {SESSION_TIME_BUDGETS.map((b) => (
              <Pressable key={b.id} onPress={() => { setSessionTimeBudget(b.id); setSaved(false); }} className={sessionTimeBudget === b.id ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-xl p-3'}>
                <Text className={sessionTimeBudget === b.id ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-900 dark:text-slate-100 font-medium'}>{b.label}</Text>
                <Text className="text-slate-500 text-xs">{b.blurb}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-slate-500 text-xs mb-6">Changes how many exercises are in each day of your split immediately \u2014 swaps you've made mid-workout for today's session aren't affected, but the underlying plan updates right away.</Text>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">Focus areas</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {FOCUS_AREAS.map((f) => <Pill key={f} label={f} active={focusAreas.includes(f)} onPress={() => toggleIn(focusAreas, setFocusAreas, f)} />)}
          </View>

          <Text className="text-slate-900 dark:text-slate-100 text-base font-medium mb-2">Blood type</Text>
          <Text className="text-slate-500 text-xs mb-3">Optional. Powers the opt-in meal lens in Recipes — not clinically validated, just a lens some people like.</Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {BLOOD_TYPES.map((bt) => <Pill key={bt} label={bt} active={bloodType === bt} onPress={() => { setBloodType(bt); setSaved(false); }} />)}
          </View>

          <Pressable onPress={handleSave} className="bg-indigo-600 rounded-full py-4 items-center active:bg-indigo-500 mb-3">
            <Text className="text-white text-lg font-semibold">{saved ? 'Saved ✓' : 'Save changes'}</Text>
          </Pressable>
          <Pressable onPress={() => router?.back?.()} className="py-2">
            <Text className="text-slate-500 text-center text-sm">Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
