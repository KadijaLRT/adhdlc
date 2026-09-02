import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectCourses, selectAssignments, selectEnergyLevel, selectProfile, selectTotalCreditsRequired } from '@/store/index';
import { Heading } from '@/shared/components/Heading';
import { parseLocalDate } from '@/shared/formatDate';
import { generateId } from '@/shared/generateId';
import { calculateGPA } from './gpaCalculations';
import { getCourseStatus, type CourseStatus, type Course } from '@/store/slices/schoolSlice';
import SchoolProgramSetupCard from './SchoolProgramSetupCard';

const COURSE_EMOJIS = ['📖', '🧮', '🧪', '🎨', '🌍', '💻'];

function daysUntil(dueDate: string): number {
  const due = parseLocalDate(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * "What should I study next" — scores incomplete assignments by how
 * soon they're due and how long they'll take, so the person never has
 * to weigh that tradeoff themselves. Same "one recommendation, not a
 * ranked list" principle as suggestNextTask and pickStartSomewhere.
 */
function suggestNextAssignment(assignments: ReturnType<typeof selectAssignments>) {
  const incomplete = (assignments || []).filter((a) => !a.isComplete);
  if (!incomplete.length) return null;
  const scored = incomplete.map((a) => {
    const days = daysUntil(a.dueDate);
    const urgency = days <= 0 ? 100 : Math.max(0, 30 - days);
    const effortPenalty = (a.estimatedMinutes || 30) / 60;
    return { assignment: a, score: urgency - effortPenalty };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.assignment || null;
}

const STATUS_ORDER: CourseStatus[] = ['in_progress', 'completed', 'failed', 'retaking'];
const STATUS_DISPLAY: Record<CourseStatus, { label: string; icon: string; circleClass: string; textClass: string }> = {
  in_progress: { label: 'In progress', icon: '', circleClass: 'border-2 border-stone-300 dark:border-slate-700', textClass: 'text-slate-900 dark:text-slate-100' },
  completed: { label: 'Completed', icon: '✓', circleClass: 'bg-emerald-500', textClass: 'text-slate-400 line-through' },
  failed: { label: 'Failed', icon: '✕', circleClass: 'bg-red-500', textClass: 'text-slate-900 dark:text-slate-100' },
  retaking: { label: 'Retaking', icon: '↻', circleClass: 'bg-amber-500', textClass: 'text-slate-900 dark:text-slate-100' },
};

function nextCourseStatus(current: CourseStatus): CourseStatus {
  const index = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length] || 'in_progress';
}

export default function SchoolScreen() {
  const router = useRouter();
  const courses = useAppStore(selectCourses);
  const assignments = useAppStore(selectAssignments);
  const energyLevel = useAppStore(selectEnergyLevel);
  const profile = useAppStore(selectProfile);
  const totalCreditsRequired = useAppStore(selectTotalCreditsRequired);
  const addCourse = useAppStore((s) => s.addCourse);
  const updateCourse = useAppStore((s) => s.updateCourse);
  const toggleAssignmentComplete = useAppStore((s) => s.toggleAssignmentComplete);
  const setSchoolSetup = useAppStore((s) => s.setSchoolSetup);

  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseEmoji, setNewCourseEmoji] = useState(COURSE_EMOJIS[0] || '📘');
  const [creditsGoalInput, setCreditsGoalInput] = useState('');
  const [confirmingFailId, setConfirmingFailId] = useState<string | null>(null);

  const suggested = useMemo(() => suggestNextAssignment(assignments), [assignments]);
  const gpa = useMemo(() => calculateGPA(courses), [courses]);

  const isYounger = profile?.ageBracket === 'middle_school' || profile?.ageBracket === 'high_school';
  const creditsCompleted = (courses || []).reduce((sum, c) => sum + (getCourseStatus(c) === 'completed' ? (c.credits || 0) : 0), 0);
  const creditsInProgress = (courses || []).reduce((sum, c) => sum + (getCourseStatus(c) === 'in_progress' || getCourseStatus(c) === 'retaking' ? (c.credits || 0) : 0), 0);
  const degreePercent = totalCreditsRequired ? Math.min(100, Math.round((creditsCompleted / totalCreditsRequired) * 100)) : 0;

  const handleSaveCreditsGoal = () => {
    const goal = Number(creditsGoalInput);
    if (goal > 0) setSchoolSetup({ totalCreditsRequired: goal });
    setCreditsGoalInput('');
  };

  const handleAddCourse = async () => {
    if (!newCourseName.trim()) return;
    await addCourse({ id: generateId('course'), name: newCourseName.trim(), emoji: newCourseEmoji });
    setNewCourseName('');
  };

  // Bug fix: tapping the small status circle instantly cycled
  // in_progress -> completed -> failed -> retaking with zero
  // confirmation on any step — one mis-tap silently marked a course
  // "Failed," which is both emotionally loaded to get wrong by
  // accident and has a real effect (that course's credits stop
  // counting toward degree progress in either the completed or
  // in-progress bucket). Only the transition INTO "failed" now
  // confirms; the other transitions (which are reversible with no
  // real stakes either way) stay a free single tap.
  const handleCycleStatus = (course: Course) => {
    const status = getCourseStatus(course);
    const next = nextCourseStatus(status);
    if (next === 'failed') {
      setConfirmingFailId(course.id);
    } else {
      updateCourse(course.id, { status: next, isCompleted: next === 'completed' });
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">School</Heading>
        <Text className="text-slate-500 text-sm mb-4">What should I study next?</Text>

        <SchoolProgramSetupCard />

        {gpa !== null && (
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium">📊 Current GPA</Text>
            <Text className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">{gpa.toFixed(2)}</Text>
          </View>
        )}

        {!isYounger && (
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4">
            <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-2">🎓 Degree Progress</Text>
            {totalCreditsRequired ? (
              <>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-500 text-xs">{creditsCompleted} of {totalCreditsRequired} credits completed</Text>
                  <Text className="text-slate-500 text-xs">{degreePercent}%</Text>
                </View>
                <View className="h-2 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden mb-1">
                  <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${degreePercent}%` }} />
                </View>
                {creditsInProgress > 0 && (
                  <Text className="text-slate-500 text-xs mt-1">+ {creditsInProgress} credit{creditsInProgress === 1 ? '' : 's'} in progress or being retaken (not yet counted)</Text>
                )}
                <Pressable onPress={() => setSchoolSetup({ totalCreditsRequired: undefined })} className="mt-2">
                  <Text className="text-indigo-500 text-xs">Change total credits needed</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-slate-500 text-xs mb-3">
                  Set how many total credits your degree needs, and this fills in automatically as you mark courses completed with credit hours.
                </Text>
                <View className="flex-row gap-2">
                  <TextInput
                    value={creditsGoalInput}
                    onChangeText={setCreditsGoalInput}
                    placeholder="e.g. 120"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                    className="flex-1 bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2"
                  />
                  <Pressable onPress={handleSaveCreditsGoal} className="bg-indigo-600 rounded-xl px-4 justify-center">
                    <Text className="text-white text-sm font-semibold">Set</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {suggested && (
          <Pressable onPress={() => router?.push?.(`/school/assignment/${suggested.id}`)} className="bg-indigo-600 rounded-2xl p-5 mb-4 active:bg-indigo-500">
            <Text className="text-indigo-100 text-xs uppercase tracking-wider mb-1">
              Recommended {daysUntil(suggested.dueDate) <= 0 ? '· due now' : `· due in ${daysUntil(suggested.dueDate)} day${daysUntil(suggested.dueDate) === 1 ? '' : 's'}`}
            </Text>
            <Text className="text-white text-lg font-semibold mb-1">{suggested.title}</Text>
            {suggested.estimatedMinutes && <Text className="text-indigo-700 text-xs dark:text-indigo-300">About {suggested.estimatedMinutes} min</Text>}
          </Pressable>
        )}

        <Pressable onPress={() => router?.push?.('/school/semester')} className="bg-white rounded-2xl p-4 flex-row items-center justify-between mb-4 dark:bg-slate-900">
          <Text className="text-slate-900 text-sm dark:text-slate-100">🗓️ Semester view</Text>
          <Text className="text-slate-500 text-xs">→</Text>
        </Pressable>

        <Text className="text-slate-900 text-lg font-semibold mb-3 dark:text-slate-100">Courses</Text>
        <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900">
          <View className="flex-row gap-2 mb-3">
            {(COURSE_EMOJIS || []).map((emoji) => (
              <Pressable key={emoji} onPress={() => setNewCourseEmoji(emoji)} className={newCourseEmoji === emoji ? 'bg-indigo-600/30 rounded-lg p-2' : 'p-2'}>
                <Text className="text-lg">{emoji}</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row gap-2">
            <TextInput
              value={newCourseName}
              onChangeText={setNewCourseName}
              placeholder="Biology, Algebra II..."
              placeholderTextColor="#64748b"
              onSubmitEditing={handleAddCourse}
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-4 py-3 dark:text-slate-100 dark:bg-slate-800"
            />
            <Pressable onPress={handleAddCourse} className="bg-indigo-600 rounded-xl px-5 justify-center">
              <Text className="text-white font-semibold">Add</Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-2 mb-6">
          {(courses || []).length === 0 && <Text className="text-slate-500 text-center">No courses yet. Add one above.</Text>}
          {(courses || []).map((course) => {
            const courseAssignments = (assignments || []).filter((a) => a.courseId === course.id);
            const openCount = courseAssignments.filter((a) => !a.isComplete).length;
            const status = getCourseStatus(course);
            const display = STATUS_DISPLAY[status];
            return (
              <View key={course.id}>
                <View className="bg-white rounded-xl p-4 flex-row items-center gap-3 dark:bg-slate-900">
                  <Pressable onPress={() => handleCycleStatus(course)}>
                    <View className={`w-5 h-5 rounded-full items-center justify-center ${display.circleClass}`}>
                      {display.icon && <Text className="text-white text-xs">{display.icon}</Text>}
                    </View>
                  </Pressable>
                  <Pressable onPress={() => router?.push?.(`/school/course/${course.id}`)} className="flex-1 flex-row items-center justify-between">
                    <Text className={`text-sm ${display.textClass}`}>{course.emoji} {course.name}</Text>
                    <Text className={status === 'failed' ? 'text-red-500 text-xs font-medium' : status === 'retaking' ? 'text-amber-600 dark:text-amber-400 text-xs font-medium' : 'text-slate-500 text-xs'}>
                      {status === 'in_progress' ? `${openCount} open` : display.label}
                    </Text>
                  </Pressable>
                </View>
                {confirmingFailId === course.id && (
                  <View className="bg-red-400/10 border-2 border-red-400 rounded-xl p-3 mt-1">
                    <Text className="text-red-500 text-xs font-medium mb-2">
                      Mark {course.name} as failed? It'll stop counting toward degree progress until you change it back.
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => { updateCourse(course.id, { status: 'failed', isCompleted: false }); setConfirmingFailId(null); }}
                        className="flex-1 bg-red-500 rounded-lg py-2 items-center active:bg-red-400"
                      >
                        <Text className="text-white text-xs font-semibold">Mark failed</Text>
                      </Pressable>
                      <Pressable onPress={() => setConfirmingFailId(null)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-lg py-2 items-center">
                        <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">Cancel</Text>
                      </Pressable>
                    </View>
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
