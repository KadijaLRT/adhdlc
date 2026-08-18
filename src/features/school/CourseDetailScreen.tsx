import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectCourses, selectAssignments, selectDateFormat } from '@/store/index';
import { getCourseStatus } from '@/store/slices/schoolSlice';
import { formatDate } from '@/shared/formatDate';
import { avivaBrain, type FlashcardSet } from '@/core/ai/AvivaBrain';
import { Heading } from '@/shared/components/Heading';
import { DateInput } from '@/shared/components/DateInput';
import SyllabusUploadCard from './SyllabusUploadCard';

const COURSE_EMOJIS = ['📖', '🧮', '🧪', '🎨', '🌍', '💻'];

export default function CourseDetailScreen({ courseId }: { courseId: string }) {
  const router = useRouter();
  const courses = useAppStore(selectCourses);
  const dateFormat = useAppStore(selectDateFormat);
  const assignments = useAppStore(selectAssignments);
  const addAssignment = useAppStore((s) => s.addAssignment);
  const removeAssignment = useAppStore((s) => s.removeAssignment);
  const updateCourse = useAppStore((s) => s.updateCourse);
  const removeCourse = useAppStore((s) => s.removeCourse);

  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [gradeInput, setGradeInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [creditsInput, setCreditsInput] = useState('');
  const [notesText, setNotesText] = useState('');
  const [flashcards, setFlashcards] = useState<FlashcardSet | null>(null);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [gradeSaved, setGradeSaved] = useState(false);

  const course = (courses || []).find((c) => c.id === courseId);
  const courseAssignments = (assignments || []).filter((a) => a.courseId === courseId);

  const handleSaveGrade = () => {
    const grade = Number(gradeInput);
    const goal = Number(goalInput);
    const credits = Number(creditsInput);
    updateCourse(courseId, {
      currentGrade: gradeInput ? grade : course?.currentGrade,
      gradeGoal: goalInput ? goal : course?.gradeGoal,
      credits: creditsInput ? credits : course?.credits,
    });
    setGradeSaved(true);
    setTimeout(() => setGradeSaved(false), 2000);
  };

  const handleStartEditCourse = () => {
    setNameInput(course?.name || '');
    setEmojiInput(course?.emoji || COURSE_EMOJIS[0] || '📘');
    setEditingCourse(true);
  };

  const handleSaveCourseEdit = async () => {
    if (!nameInput.trim()) return;
    await updateCourse(courseId, { name: nameInput.trim(), emoji: emojiInput });
    setEditingCourse(false);
  };

  const handleDeleteCourse = async () => {
    await removeCourse(courseId);
    router?.replace?.('/school');
  };

  const handleGenerateFlashcards = async () => {
    if (!notesText.trim()) return;
    setGeneratingCards(true);
    const result = await avivaBrain.generateFlashcards(notesText);
    setFlashcards(result);
    setGeneratingCards(false);
    updateCourse(courseId, { notes: notesText });
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newDueDate.trim()) return;
    await addAssignment({
      id: `assignment-${Date.now()}`,
      courseId,
      title: newTitle.trim(),
      dueDate: newDueDate.trim(),
      isComplete: false,
      subSteps: [],
    });
    setNewTitle('');
    setNewDueDate('');
  };

  if (!course) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-slate-500 text-center">This course isn&apos;t here anymore.</Text>
      </View>
    );
  }

  const courseStatus = getCourseStatus(course);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        {editingCourse ? (
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6 mt-2">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Emoji</Text>
            <View className="flex-row gap-2 mb-3">
              {COURSE_EMOJIS.map((emoji) => (
                <Pressable key={emoji} onPress={() => setEmojiInput(emoji)} className={emojiInput === emoji ? 'bg-indigo-600/30 rounded-lg p-2' : 'p-2'}>
                  <Text className="text-lg">{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Course name</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Course name"
              placeholderTextColor="#64748b"
              className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-3"
            />
            <View className="flex-row gap-2">
              <Pressable onPress={handleSaveCourseEdit} disabled={!nameInput.trim()} className={nameInput.trim() ? 'flex-1 bg-indigo-600 rounded-xl py-2.5 items-center active:bg-indigo-500' : 'flex-1 bg-slate-300 dark:bg-slate-700 rounded-xl py-2.5 items-center'}>
                <Text className="text-white text-sm font-semibold">Save</Text>
              </Pressable>
              <Pressable onPress={() => setEditingCourse(false)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center justify-between mb-4 mt-2">
            <Heading className={courseStatus === 'completed' ? 'text-slate-400 line-through' : ''}>{course.emoji} {course.name}</Heading>
            <Pressable onPress={handleStartEditCourse} className="p-2">
              <Text className="text-indigo-500 text-sm">Edit</Text>
            </Pressable>
          </View>
        )}

        <View className="flex-row flex-wrap gap-2 mb-6">
          {(['in_progress', 'completed', 'failed', 'retaking'] as const).map((option) => {
            const isActive = courseStatus === option;
            const borderStyles: Record<string, string> = {
              in_progress: 'bg-indigo-600/10 border-indigo-400',
              completed: 'bg-emerald-400/10 border-emerald-400',
              failed: 'bg-red-400/10 border-red-400',
              retaking: 'bg-amber-400/10 border-amber-400',
            };
            const textStyles: Record<string, string> = {
              in_progress: 'text-indigo-700 dark:text-indigo-300',
              completed: 'text-emerald-700 dark:text-emerald-400',
              failed: 'text-red-600 dark:text-red-400',
              retaking: 'text-amber-700 dark:text-amber-400',
            };
            const labels: Record<string, string> = { in_progress: 'In progress', completed: '✓ Completed', failed: '✕ Failed', retaking: '↻ Retaking' };
            return (
              <Pressable
                key={option}
                onPress={() => updateCourse(courseId, { status: option, isCompleted: option === 'completed' })}
                className={isActive ? `border-2 rounded-full py-2 px-4 ${borderStyles[option]}` : 'border-2 border-transparent bg-stone-100 dark:bg-slate-800 rounded-full py-2 px-4'}
              >
                <Text className={isActive ? `text-sm font-medium ${textStyles[option]}` : 'text-slate-600 dark:text-slate-300 text-sm font-medium'}>
                  {labels[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {courseStatus === 'retaking' && (
          <View className="bg-amber-400/10 border border-amber-400/40 rounded-xl p-3 mb-6">
            <Text className="text-amber-700 dark:text-amber-400 text-xs">
              Retaking doesn't count toward your degree credits until you mark it Completed. If your school replaces the failed grade instead of averaging it, you may want to set the original failed attempt's credits to 0 so it doesn't double up in your GPA.
            </Text>
          </View>
        )}

        <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900">
          <Text className="text-slate-700 text-sm font-medium mb-2 dark:text-slate-300">Grade</Text>
          {(course.currentGrade !== undefined || course.gradeGoal !== undefined || course.credits !== undefined) && (
            <Text className="text-slate-500 text-xs mb-2">
              {course.currentGrade !== undefined && course.gradeGoal !== undefined
                ? `Currently ${course.currentGrade}% · goal ${course.gradeGoal}%${course.currentGrade >= course.gradeGoal ? ' · on track' : ` · ${course.gradeGoal - course.currentGrade} points to go`}`
                : course.currentGrade !== undefined
                ? `Currently ${course.currentGrade}%`
                : course.gradeGoal !== undefined
                ? `Goal ${course.gradeGoal}%`
                : ''}
              {course.credits !== undefined ? ` · ${course.credits} credit${course.credits === 1 ? '' : 's'}` : ''}
            </Text>
          )}
          <View className="flex-row gap-2 mb-2">
            <TextInput
              value={gradeInput}
              onChangeText={setGradeInput}
              placeholder="Current %"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="Goal %"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
          </View>
          <View className="flex-row gap-2">
            <TextInput
              value={creditsInput}
              onChangeText={setCreditsInput}
              placeholder="Credit hours (for GPA)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
            <Pressable onPress={handleSaveGrade} className="bg-indigo-600 rounded-xl px-4 justify-center">
              <Text className="text-white text-sm font-semibold">{gradeSaved ? 'Saved ✓' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900">
          <Text className="text-slate-700 text-sm font-medium mb-2 dark:text-slate-300">Notes & flashcards</Text>
          <TextInput
            value={notesText}
            onChangeText={setNotesText}
            placeholder="Paste or type your notes..."
            placeholderTextColor="#64748b"
            multiline
            className="bg-stone-100 text-slate-900 rounded-xl p-3 min-h-[80px] mb-2 dark:text-slate-100 dark:bg-slate-800"
          />
          <Pressable onPress={handleGenerateFlashcards} disabled={generatingCards} className="border-2 border-indigo-500 rounded-xl py-2 items-center mb-2">
            {generatingCards ? <ActivityIndicator color="#818cf8" /> : <Text className="text-indigo-700 text-sm font-medium dark:text-indigo-300">Generate flashcards</Text>}
          </Pressable>
          {flashcards?.cards?.length ? (
            <View className="gap-2">
              {flashcards.cards.map((card, i) => (
                <View key={i} className="bg-stone-100 rounded-lg p-3 dark:bg-slate-800">
                  <Text className="text-slate-900 text-sm mb-1 dark:text-slate-100">{card.front}</Text>
                  <Text className="text-slate-500 text-xs">{card.back}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <SyllabusUploadCard fixedCourseId={courseId} />

        <View className="bg-white rounded-2xl p-4 mb-4 dark:bg-slate-900">
          <Text className="text-slate-700 text-sm font-medium mb-2 dark:text-slate-300">New assignment</Text>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Research paper, Chapter 6 reading..."
            placeholderTextColor="#64748b"
            className="bg-stone-100 text-slate-900 rounded-xl px-4 py-3 mb-2 dark:text-slate-100 dark:bg-slate-800"
          />
          <View className="mb-2">
            <DateInput value={newDueDate} onChange={setNewDueDate} dark={false} />
          </View>
          <Pressable onPress={handleAdd} className="bg-indigo-600 rounded-xl py-3 items-center">
            <Text className="text-white font-semibold">Add</Text>
          </Pressable>
        </View>

        <View className="gap-2 mb-8">
          {courseAssignments.length === 0 && <Text className="text-slate-500 text-center mt-4">No assignments yet.</Text>}
          {courseAssignments.map((a) => (
            <View key={a.id} className="bg-white rounded-xl dark:bg-slate-900">
              {confirmingRemoveId === a.id ? (
                <View className="p-4">
                  <Text className="text-red-500 text-xs font-medium mb-2">Remove "{a.title}"?</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={async () => { await removeAssignment(a.id); setConfirmingRemoveId(null); }}
                      className="flex-1 bg-red-500 rounded-lg py-2 items-center active:bg-red-400"
                    >
                      <Text className="text-white text-xs font-semibold">Remove</Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmingRemoveId(null)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-lg py-2 items-center">
                      <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Pressable onPress={() => router?.push?.(`/school/assignment/${a.id}`)} className="flex-1 p-4 flex-row items-center justify-between">
                    <Text className={a.isComplete ? 'text-slate-500 line-through flex-1' : 'text-slate-900 dark:text-slate-100 flex-1'}>{a.title}</Text>
                    <Text className="text-slate-500 text-xs">{formatDate(a.dueDate, dateFormat)}</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmingRemoveId(a.id)} accessibilityLabel={`Remove ${a.title}`} className="px-3 py-4">
                    <Text className="text-slate-300 dark:text-slate-600 text-base">✕</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>

        {confirmingDelete ? (
          <View className="border-2 border-red-400 bg-red-400/10 rounded-2xl p-4">
            <Text className="text-red-500 text-sm font-medium mb-3">
              Delete {course.name}? Its assignments will stay in your list but won't show under any course anymore.
            </Text>
            <View className="flex-row gap-2">
              <Pressable onPress={handleDeleteCourse} className="flex-1 bg-red-500 rounded-xl py-2.5 items-center active:bg-red-400">
                <Text className="text-white text-sm font-semibold">Delete course</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmingDelete(false)} className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center">
                <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingDelete(true)} className="py-2">
            <Text className="text-red-500 text-center text-xs">Delete this course</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
