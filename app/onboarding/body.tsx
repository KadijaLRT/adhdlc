import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { FOCUS_AREA_GROUPS, bodyGroupLabel } from '@/content/bodyGroups';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import type { Gender, WeightGoalDirection, BodyType, ActivityLevel } from '@/store/index';
import { OnboardingStepHeader, OnboardingProgressBar } from '@/features/onboarding/OnboardingStepHeader';
import { DateInput } from '@/shared/components/DateInput';
import RestrictionPicker from '@/features/workout/RestrictionPicker';
import { RESTRICTIONS_DISCLAIMER } from '@/content/restrictions';

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
const FOCUS_AREAS = FOCUS_AREA_GROUPS.map((g) => g.id);

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={active ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 px-4' : 'bg-slate-900 border-2 border-transparent rounded-full py-2 px-4'}>
      <Text className={active ? 'text-emerald-300 text-sm' : 'text-slate-300 text-sm'}>{label}</Text>
    </Pressable>
  );
}

export default function BodyScreen() {
  const router = useRouter();
  const o = useOnboardingStore();
  const setField = useOnboardingStore((s) => s.setField);
  const toggleInList = useOnboardingStore((s) => s.toggleInList);
  const [showRestrictions, setShowRestrictions] = useState(false);
  const getStepInfo = useOnboardingStore((s) => s.getStepInfo);
  const { step, total } = getStepInfo('/onboarding/body');

  const goToNextModuleScreen = useOnboardingStore((s) => s.goToNextModuleScreen);
  const handleContinue = () => goToNextModuleScreen(router);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <OnboardingProgressBar step={step} total={total} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View className="w-full max-w-md self-center">
          <OnboardingStepHeader step={step} total={total} />
          <Text className="text-slate-100 text-2xl font-semibold mb-1">A little about your body</Text>
          <Text className="text-slate-400 text-sm mb-1">Used to personalize workouts, macro targets, and which features show up for you.</Text>
          <Text className="text-slate-600 text-xs mb-6">🔒 Stays on your device. Never shared.</Text>

          <Text className="text-slate-100 text-base font-medium mb-2">Gender</Text>
          <View className="flex-row gap-2 mb-6">
            {GENDERS.map((g) => <Pill key={g.id} label={`${g.emoji} ${g.label}`} active={o.gender === g.id} onPress={() => setField('gender', g.id)} />)}
          </View>

          <Text className="text-slate-100 text-base font-medium mb-2">Weight goal</Text>
          <View className="flex-row gap-2 mb-4">
            {WEIGHT_GOALS.map((g) => (
              <Pill
                key={g.id}
                label={`${g.emoji} ${g.label}`}
                active={o.weightGoalDirections.includes(g.id)}
                onPress={() => {
                  // Bug fix: this used to call toggleInList with
                  // 'weightGoalDirections' as any — weightGoalDirections
                  // isn't part of toggleInList's typed key union at
                  // all, so without the cast TypeScript would correctly
                  // reject the call. Written out directly here instead,
                  // fully type-safe, matching the same fix already
                  // applied to the identical pattern in
                  // EditFitnessPreferencesScreen.tsx.
                  setField(
                    'weightGoalDirections',
                    o.weightGoalDirections.includes(g.id)
                      ? o.weightGoalDirections.filter((d) => d !== g.id)
                      : [...o.weightGoalDirections, g.id]
                  );
                }}
              />
            ))}
          </View>
          <TextInput
            value={o.startingWeightLbs}
            onChangeText={(v) => setField('startingWeightLbs', v)}
            placeholder="Starting weight (lbs)"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 mb-3"
          />
          {o.weightGoalDirections.length > 0 && o.weightGoalDirections[0] !== 'maintain' && (
            <>
              <TextInput
                value={o.goalWeightLbs}
                onChangeText={(v) => setField('goalWeightLbs', v)}
                placeholder="Goal weight (lbs) — powers your Progress trend"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 mb-3"
              />
              <Text className="text-slate-400 text-xs mb-2">Goal date (optional)</Text>
              <DateInput value={o.goalDate} onChange={(iso) => setField('goalDate', iso)} dark />
              <Text className="text-slate-500 text-xs mt-2 mb-6">
                With a date, we can show whether your planned workouts and nutrition are actually on pace to get there by then.
              </Text>
            </>
          )}

          <Text className="text-slate-100 text-base font-medium mb-2">Body type</Text>
          <View className="gap-2 mb-6">
            {BODY_TYPES.map((t) => (
              <Pressable key={t.id} onPress={() => setField('bodyType', t.id)} className={o.bodyType === t.id ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-slate-900 border-2 border-transparent rounded-xl p-3'}>
                <Text className={o.bodyType === t.id ? 'text-emerald-300 font-medium' : 'text-slate-100 font-medium'}>{t.label}</Text>
                <Text className="text-slate-500 text-xs">{t.blurb}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-slate-100 text-base font-medium mb-2">Daily activity level</Text>
          <View className="gap-2 mb-6">
            {ACTIVITY_LEVELS.map((a) => (
              <Pressable key={a.id} onPress={() => setField('activityLevel', a.id)} className={o.activityLevel === a.id ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-xl p-3' : 'bg-slate-900 border-2 border-transparent rounded-xl p-3'}>
                <Text className={o.activityLevel === a.id ? 'text-emerald-300 font-medium' : 'text-slate-100 font-medium'}>{a.label}</Text>
                <Text className="text-slate-500 text-xs">{a.blurb}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-slate-100 text-base font-medium mb-2">Exercise goals</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {EXERCISE_GOALS.map((g) => <Pill key={g.id} label={`${g.emoji} ${g.label}`} active={o.exerciseGoals.includes(g.id)} onPress={() => toggleInList('exerciseGoals', g.id)} />)}
          </View>

          <Text className="text-slate-100 text-base font-medium mb-2">Focus areas (pick all that apply)</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {FOCUS_AREAS.map((f) => <Pill key={f} label={bodyGroupLabel(f)} active={o.focusAreas.includes(f)} onPress={() => toggleInList('focusAreas', f)} />)}
          </View>

          <Pressable onPress={() => setShowRestrictions((v) => !v)} className="bg-slate-900 rounded-xl p-4 mb-6 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-slate-100 text-base font-medium">Anything your body is working around?</Text>
              <Text className="text-slate-500 text-xs">Optional. Runner's knee, weak hips, pelvic floor and more.</Text>
            </View>
            <Text className="text-slate-400 text-xs">{showRestrictions ? 'Hide' : o.restrictions.length > 0 ? `${o.restrictions.length} set` : 'Add'}</Text>
          </Pressable>
          {showRestrictions && (
            <View className="mb-6">
              <RestrictionPicker selected={o.restrictions} onToggle={(id) => toggleInList('restrictions', id)} forceDark />
              <Text className="text-slate-500 text-[11px] leading-4">{RESTRICTIONS_DISCLAIMER}</Text>
            </View>
          )}

          <Text className="text-slate-100 text-base font-medium mb-2">Height</Text>
          <View className="flex-row gap-2 mb-8">
            <TextInput value={o.heightFt} onChangeText={(v) => setField('heightFt', v)} placeholder="ft" placeholderTextColor="#64748b" keyboardType="numeric" className="flex-1 bg-slate-900 text-slate-100 rounded-xl px-4 py-3" />
            <TextInput value={o.heightIn} onChangeText={(v) => setField('heightIn', v)} placeholder="in" placeholderTextColor="#64748b" keyboardType="numeric" className="flex-1 bg-slate-900 text-slate-100 rounded-xl px-4 py-3" />
          </View>

          <Pressable onPress={handleContinue} className="bg-emerald-500 rounded-full py-4 active:bg-emerald-400">
            <Text className="text-white text-lg text-center font-semibold">Continue →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
