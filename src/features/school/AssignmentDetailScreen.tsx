import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectAssignments, selectEnergyLevel, selectIsOverwhelmed, selectDateFormat, selectCourses } from '@/store/index';
import { avivaBrain } from '@/core/ai/AvivaBrain';
import { spreadStepsAcrossDays, groupStepsByDate } from './spreadWorkload';
import { Heading } from '@/shared/components/Heading';
import { formatDate } from '@/shared/formatDate';

export default function AssignmentDetailScreen({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const assignments = useAppStore(selectAssignments);
  const courses = useAppStore(selectCourses);
  const energyLevel = useAppStore(selectEnergyLevel);
  const isOverwhelmed = useAppStore(selectIsOverwhelmed);
  const dateFormat = useAppStore(selectDateFormat);
  const toggleAssignmentComplete = useAppStore((s) => s.toggleAssignmentComplete);
  const toggleAssignmentSubStep = useAppStore((s) => s.toggleAssignmentSubStep);
  const updateAssignment = useAppStore((s) => s.updateAssignment);
  const removeAssignment = useAppStore((s) => s.removeAssignment);
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakDownError, setBreakDownError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pointsEarnedInput, setPointsEarnedInput] = useState('');
  const [pointsPossibleInput, setPointsPossibleInput] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);

  const assignment = (assignments || []).find((a) => a.id === assignmentId);
  const course = (courses || []).find((c) => c.id === assignment?.courseId);

  if (!assignment) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">This assignment isn&apos;t here anymore.</Text>
      </View>
    );
  }

  const handleSaveGrade = () => {
    // Points are raw, not clamped to 0-100 — a category can be worth
    // any total (Final Summative is 200 pts on this person's own
    // syllabus), so only guard against non-numeric/negative input, not
    // an arbitrary percentage ceiling.
    const parseNonNegative = (raw: string, current: number | undefined): number | undefined => {
      if (!raw) return current;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return current;
      return parsed;
    };
    updateAssignment(assignment.id, {
      pointsEarned: parseNonNegative(pointsEarnedInput, assignment.pointsEarned),
      pointsPossible: parseNonNegative(pointsPossibleInput, assignment.pointsPossible),
      categoryId: selectedCategoryId ?? assignment.categoryId,
    });
    setScoreSaved(true);
    setTimeout(() => setScoreSaved(false), 2000);
  };

  const handleBreakDown = async () => {
    setBreakingDown(true);
    setBreakDownError(null);
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    const decomposition = await avivaBrain.breakDownAssignment(assignment.title, {
      currentEnergyLevel: energyLevel,
      isOverwhelmed,
      timeOfDay,
    });

    if (decomposition) {
      const rawSteps = (decomposition.subSteps || []).map((s) => ({ id: s.id, title: s.title, isComplete: false }));
      const spreadSteps = spreadStepsAcrossDays(rawSteps, assignment.dueDate);
      await updateAssignment(assignment.id, {
        subSteps: spreadSteps,
        estimatedMinutes: decomposition.estimatedIdealMinutes,
      });
    } else {
      // avivaBrain.breakDownAssignment already logs the real cause to
      // the console — this was previously a silent no-op with zero
      // feedback whenever the AI call failed for any reason (a dead
      // model, a network hiccup, rate limiting), which read exactly
      // like a broken button rather than a failed request.
      setBreakDownError("Couldn't break this down just now — try again in a moment.");
    }
    setBreakingDown(false);
  };

  const handleRemove = async () => {
    await removeAssignment(assignment.id);
    router?.back?.();
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">{assignment.title}</Heading>
        <Text className="text-slate-500 text-sm mb-6">Due {formatDate(assignment.dueDate, dateFormat)}</Text>

        <Pressable
          onPress={() => toggleAssignmentComplete(assignment.id)}
          className={assignment.isComplete ? 'bg-emerald-500 rounded-full py-4 mb-6' : 'bg-indigo-600 rounded-full py-4 mb-6 active:bg-indigo-500'}
        >
          <Text className={assignment.isComplete ? 'text-white text-center font-semibold' : 'text-white text-center font-semibold'}>
            {assignment.isComplete ? 'Marked done ✓' : 'Done'}
          </Text>
        </Pressable>

        {/*
          Mirrors the same Current %/Goal %-style grade card used at
          course level (CourseDetailScreen.tsx), scoped to just this
          one assignment: a category (from the course's grading
          categories) plus points earned/possible for this one item —
          e.g. 18/20 on a quiz, matching how the syllabus itself states
          points rather than a 0-100 score. Feeds computeCourseGrade
          (courseGrading.ts) which the course screen uses to show the
          cumulative grade.
        */}
        <View className="bg-white rounded-2xl p-4 mb-6 dark:bg-slate-900">
          <Text className="text-slate-700 text-sm font-medium mb-2 dark:text-slate-300">Grade</Text>
          {assignment.pointsEarned !== undefined && (
            <Text className="text-slate-500 text-xs mb-2">
              Currently {assignment.pointsEarned}{assignment.pointsPossible !== undefined ? `/${assignment.pointsPossible}` : ''} pts
              {assignment.categoryId && course?.gradeCategories?.find((c) => c.id === assignment.categoryId)
                ? ` · ${course.gradeCategories.find((c) => c.id === assignment.categoryId)?.name}`
                : ''}
            </Text>
          )}

          {(course?.gradeCategories?.length || 0) > 0 ? (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {course!.gradeCategories!.map((cat) => {
                const activeId = selectedCategoryId ?? assignment.categoryId;
                const isActive = activeId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    className={isActive ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-full px-3 py-1.5' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full px-3 py-1.5'}
                  >
                    <Text className={isActive ? 'text-indigo-700 dark:text-indigo-300 text-xs font-medium' : 'text-slate-600 dark:text-slate-300 text-xs font-medium'}>{cat.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text className="text-slate-400 text-xs mb-3">
              No grading categories set up for this course yet — add some from the course page to have this feed the cumulative grade.
            </Text>
          )}

          <View className="flex-row gap-2 mb-2">
            <TextInput
              value={pointsEarnedInput}
              onChangeText={setPointsEarnedInput}
              placeholder="Points earned"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
            <TextInput
              value={pointsPossibleInput}
              onChangeText={setPointsPossibleInput}
              placeholder="Points possible"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
          </View>
          <Pressable onPress={handleSaveGrade} className="bg-indigo-600 rounded-xl py-2.5 items-center">
            <Text className="text-white text-sm font-semibold">{scoreSaved ? 'Saved ✓' : 'Save grade'}</Text>
          </Pressable>
        </View>

        {(assignment.subSteps?.length || 0) === 0 ? (
          <>
            <Pressable onPress={handleBreakDown} disabled={breakingDown} className="border-2 border-indigo-500 rounded-full py-4 mb-2 items-center">
              {breakingDown ? <ActivityIndicator color="#818cf8" /> : <Text className="text-indigo-700 font-semibold dark:text-indigo-300">Break this into steps</Text>}
            </Pressable>
            {breakDownError && <Text className="text-red-500 text-xs text-center mb-6">{breakDownError}</Text>}
          </>
        ) : (
          <View className="gap-4 mb-6">
            {groupStepsByDate(assignment.subSteps || []).map((group) => (
              <View key={group.date}>
                <Text className="text-slate-500 text-xs font-medium mb-2">
                  {group.date === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() ? 'Today' : formatDate(group.date, dateFormat)}
                </Text>
                <View className="gap-2">
                  {group.steps.map((step) => (
                    <Pressable key={step.id} onPress={() => toggleAssignmentSubStep(assignment.id, step.id)} className="bg-white rounded-xl p-4 flex-row items-center gap-3 dark:bg-slate-900">
                      <View className={step.isComplete ? 'w-5 h-5 rounded-full bg-emerald-500 items-center justify-center' : 'w-5 h-5 rounded-full border-2 border-stone-300'}>
                        {step.isComplete && <Text className="text-white text-xs">✓</Text>}
                      </View>
                      <Text className={step.isComplete ? 'text-slate-500 line-through flex-1' : 'text-slate-900 flex-1'}>{step.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {confirmingRemove ? (
          <View className="border-2 border-red-400 bg-red-400/10 rounded-2xl p-4">
            <Text className="text-red-500 text-sm font-medium mb-3">Remove "{assignment.title}"? This can't be undone.</Text>
            <View className="flex-row gap-2">
              <Pressable onPress={handleRemove} className="flex-1 bg-red-500 rounded-xl py-2.5 items-center active:bg-red-400">
                <Text className="text-white text-sm font-semibold">Remove</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmingRemove(false)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingRemove(true)} className="py-2">
            <Text className="text-red-500 text-center text-xs">Remove this assignment</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
