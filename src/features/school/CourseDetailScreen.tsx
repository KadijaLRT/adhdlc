import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectCourses, selectAssignments, selectDateFormat } from '@/store/index';
import { getCourseStatus } from '@/store/slices/schoolSlice';
import { computeCourseGrade } from './courseGrading';
import { formatDate } from '@/shared/formatDate';
import { avivaBrain, type FlashcardSet, type ReadingNotes } from '@/core/ai/AvivaBrain';
import { describeAiFailure } from '@/core/ai/describeAiFailure';
import { Heading } from '@/shared/components/Heading';
import { CollapsibleSection } from '@/shared/components/CollapsibleSection';
import { generateId } from '@/shared/generateId';
import { DateInput } from '@/shared/components/DateInput';
import { pickAndReadTextFile } from './syllabusImport';
import { pickAndExtractPdfText } from './syllabusPdfImport';
import { pickSyllabusImageFromLibrary, captureSyllabusPhoto } from './syllabusImageImport';
import { pickAndExtractDocxText } from './syllabusDocxImport';
import { pickAndExtractEpubText } from './syllabusEpubImport';
import { fetchAndExtractLinkText } from './syllabusLinkImport';
import ReadingListMatcher from './ReadingListMatcher';
import SyllabusUploadCard from './SyllabusUploadCard';

const COURSE_EMOJIS = ['📖', '🧮', '🧪', '🎨', '🌍', '💻'];

function describeSummarizeFailure(reason: Parameters<typeof describeAiFailure>[0]): string {
  if (!reason) return "Couldn't turn that into notes just now — try again in a moment.";
  return describeAiFailure(reason);
}

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
  const [goalInput, setGoalInput] = useState('');
  const [creditsInput, setCreditsInput] = useState('');
  const [notesText, setNotesText] = useState('');
  const [flashcards, setFlashcards] = useState<FlashcardSet | null>(null);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [readingUploadError, setReadingUploadError] = useState<string | null>(null);
  const [readingUploading, setReadingUploading] = useState(false);
  const [readingLinkInput, setReadingLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [gradeSaved, setGradeSaved] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPoints, setNewCategoryPoints] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const course = (courses || []).find((c) => c.id === courseId);
  const courseAssignments = (assignments || []).filter((a) => a.courseId === courseId);

  const gradeBreakdown = computeCourseGrade(course?.gradeCategories, courseAssignments);

  // Grade is entirely calculated from category points now — there's no
  // manual Current % field to keep in sync, so this just persists the
  // calculated value into course.currentGrade whenever the underlying
  // assignments change, which is what gpaCalculations.ts already reads
  // for weighted GPA. Goal % and credit hours are still genuinely
  // manual (nothing computes those), so they keep their own Save flow.
  useEffect(() => {
    if (gradeBreakdown && course && course.currentGrade !== gradeBreakdown.overallPercent) {
      updateCourse(courseId, { currentGrade: gradeBreakdown.overallPercent });
    }
  }, [gradeBreakdown?.overallPercent, courseId]);

  const handleSaveGoalAndCredits = () => {
    // Goal is a raw points total now, not a 0-100 percentage — no
    // upper clamp, since a course's own point scale can be anything
    // (640 on this person's actual syllabus).
    const parsePointsValue = (raw: string, current: number | undefined): number | undefined => {
      if (!raw) return current;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return current;
      return parsed;
    };
    const parseCreditsValue = (raw: string, current: number | undefined): number | undefined => {
      if (!raw) return current;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return current;
      return parsed;
    };
    updateCourse(courseId, {
      gradeGoal: parsePointsValue(goalInput, course?.gradeGoal),
      credits: parseCreditsValue(creditsInput, course?.credits),
    });
    setGradeSaved(true);
    setTimeout(() => setGradeSaved(false), 2000);
  };

  // Total points earned/possible across every category (graded or
  // not) — used to compare against the points-based goal below.
  // gradeBreakdown itself only sums possible points for categories
  // that have at least one graded item (see courseGrading.ts), which
  // is correct for the overall % but not what a "goal points" compare
  // needs — the goal is against the course's full declared point
  // scale, whether or not everything's graded yet.
  const totalPointsEarnedSoFar = (course?.gradeCategories || []).reduce((sum, cat) => {
    const graded = courseAssignments.filter((a) => a.categoryId === cat.id && typeof a.pointsEarned === 'number');
    return sum + graded.reduce((s, a) => s + (a.pointsEarned as number), 0);
  }, 0);
  const totalPointsPossibleAllCategories = (course?.gradeCategories || []).reduce((sum, cat) => sum + (cat.totalPointsPossible || 0), 0);
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const points = Number(newCategoryPoints);
    const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0;
    const next = [...(course?.gradeCategories || []), { id: generateId('gradecat'), name: newCategoryName.trim(), totalPointsPossible: safePoints }];
    updateCourse(courseId, { gradeCategories: next });
    setNewCategoryName('');
    setNewCategoryPoints('');
    setAddingCategory(false);
  };

  const handleRemoveCategory = (id: string) => {
    // Assignments that referenced this category keep their categoryId
    // pointing at a now-missing category rather than being silently
    // recategorized — computeCourseGrade already only counts points
    // whose categoryId matches a category that still exists, so this
    // can't corrupt the grade; the person can just recategorize those
    // assignments if they want the points to count again.
    updateCourse(courseId, { gradeCategories: (course?.gradeCategories || []).filter((c) => c.id !== id) });
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

  const appendReadingNotes = (label: string, notes: ReadingNotes) => {
    const heading = notes.title || label;
    const bullets = notes.keyPoints.map((point) => `• ${point}`).join('\n');
    const truncatedNote = notes.wasTruncated
      ? '\n\n(This reading was long — these notes only cover the part that was read. Add the rest separately if you need it.)'
      : '';
    const block = `--- ${heading} ---\n${notes.summary}\n\n${bullets}${truncatedNote}`;
    const separator = notesText.trim() ? '\n\n' : '';
    const next = `${notesText}${separator}${block}`;
    setNotesText(next);
    updateCourse(courseId, { notes: next });
  };

  /**
   * Shared by every reading-upload input method: takes whatever raw
   * text was extracted (from a PDF, DOCX, EPUB, image, or link) and
   * turns it into real study notes via the AI, rather than appending
   * the raw transcript directly — a wall of unprocessed reading text
   * dumped into the notes field isn't actually notes, and works
   * against this app's own low-cognitive-load design principle.
   */
  const summarizeAndAppend = async (sourceLabel: string, rawText: string) => {
    setReadingUploadError(null);
    setReadingUploading(true);
    const notes = await avivaBrain.summarizeReadingToNotes(rawText, sourceLabel);
    setReadingUploading(false);
    if (!notes) {
      setReadingUploadError(describeSummarizeFailure(avivaBrain.lastErrorReason));
      return;
    }
    appendReadingNotes(sourceLabel, notes);
  };

  const handleUploadReadingPdf = async () => {
    setReadingUploadError(null);
    try {
      const picked = await pickAndExtractPdfText();
      if (!picked) return;
      if (picked.looksScanned) {
        setReadingUploadError(`"${picked.name}" doesn't seem to have real text in it — it's probably a scanned page. Try "Upload photo" instead.`);
        return;
      }
      await summarizeAndAppend(picked.name, picked.text);
    } catch (error: any) {
      console.error('CourseDetailScreen: failed to read reading PDF', error);
      setReadingUploadError(error?.message === 'NOT_PDF' ? "That's not a .pdf file — pick a PDF, or try Word/ePub/.txt instead." : "Couldn't read that PDF. Try a .txt, .docx, or .epub file, or a photo instead.");
    }
  };

  const handleUploadReadingDocx = async () => {
    setReadingUploadError(null);
    try {
      const picked = await pickAndExtractDocxText();
      if (!picked) return;
      if (!picked.text) {
        setReadingUploadError(`"${picked.name}" didn't have any readable text in it.`);
        return;
      }
      await summarizeAndAppend(picked.name, picked.text);
    } catch (error: any) {
      console.error('CourseDetailScreen: failed to read reading docx', error);
      setReadingUploadError(error?.message === 'NOT_DOCX' ? "That's not a .docx file — pick a Word document (not the older .doc format)." : "Couldn't read that file. Make sure it's a .docx (not the older .doc format).");
    }
  };

  const handleUploadReadingEpub = async () => {
    setReadingUploadError(null);
    try {
      const picked = await pickAndExtractEpubText();
      if (!picked) return;
      if (!picked.text) {
        setReadingUploadError(`"${picked.name}" didn't have any readable text in it.`);
        return;
      }
      await summarizeAndAppend(picked.title || picked.name, picked.text);
    } catch (error: any) {
      console.error('CourseDetailScreen: failed to read reading epub', error);
      if (error?.message === 'NOT_EPUB') setReadingUploadError("That's not a .epub file — pick an ePub book file.");
      else setReadingUploadError(error?.message === 'NOT_A_VALID_EPUB' ? "That doesn't look like a valid .epub file." : "Couldn't read that file.");
    }
  };

  const handleUploadReadingTextFile = async () => {
    setReadingUploadError(null);
    try {
      const picked = await pickAndReadTextFile();
      if (!picked) return;
      await summarizeAndAppend(picked.name, picked.text);
    } catch (error: any) {
      console.error('CourseDetailScreen: failed to read reading text file', error);
      setReadingUploadError(error?.message === 'NOT_TXT' ? "That's not a .txt file — use \"Upload PDF\" instead." : "Couldn't read that file.");
    }
  };

  const handleUploadReadingImage = async (picker: () => Promise<{ dataUrl: string } | null>) => {
    setReadingUploadError(null);
    try {
      const picked = await picker();
      if (!picked) return;
      setReadingUploading(true);
      const text = await avivaBrain.transcribeImageToText(picked.dataUrl);
      setReadingUploading(false);
      if (!text) {
        setReadingUploadError(describeSummarizeFailure(avivaBrain.lastErrorReason) || "Couldn't read the text in that image — try a clearer photo.");
        return;
      }
      await summarizeAndAppend('Photo', text);
    } catch (error: any) {
      setReadingUploading(false);
      console.error('CourseDetailScreen: failed to transcribe reading image', error);
      setReadingUploadError(error?.message === 'PERMISSION_DENIED' ? 'Photo access was denied — allow it from your device settings.' : "Couldn't read that image.");
    }
  };

  const handleUploadReadingLink = async () => {
    if (!readingLinkInput.trim()) return;
    setReadingUploadError(null);
    setReadingUploading(true);
    try {
      const result = await fetchAndExtractLinkText(readingLinkInput);
      if (!result) { setReadingUploading(false); return; }
      setReadingLinkInput('');
      await summarizeAndAppend(result.title || result.url, result.text);
    } catch (error: any) {
      setReadingUploading(false);
      console.error('CourseDetailScreen: failed to fetch reading link', error);
      if (error?.message === 'INVALID_URL') {
        setReadingUploadError('That needs to be a full link starting with http:// or https://.');
      } else if (error?.message === 'NO_READABLE_TEXT') {
        setReadingUploadError("Couldn't find real readable text on that page — try a screenshot instead.");
      } else {
        // The honest, unavoidable case: most course/university sites
        // don't allow their pages to be read this way from a browser
        // (CORS) — see syllabusLinkImport.ts's module comment. This is
        // indistinguishable here from the site genuinely being down.
        setReadingUploadError("Couldn't reach that page — many course sites don't allow this. Try a screenshot of the page instead.");
      }
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newDueDate.trim()) return;
    await addAssignment({
      id: generateId('assignment'),
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

        <CollapsibleSection
          title="Grade"
          badge={gradeBreakdown ? `${gradeBreakdown.overallPercent}%` : undefined}
          subtitle={gradeBreakdown ? `${gradeBreakdown.overallPercent}%${course.gradeGoal !== undefined ? ` · goal ${course.gradeGoal} pts` : ''}` : 'No grade yet'}
        >
          {/*
            Goal (points) and credit hours first, per request — these
            are the two genuinely manual fields with their own Save
            action. Grading categories (below) are a separate concern
            with their own Save action, not sharing a row with these.
          */}
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1.5">Goal & credits</Text>
          <View className="flex-row gap-2 mb-2">
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="Goal, e.g. 576 pts"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
            <TextInput
              value={creditsInput}
              onChangeText={setCreditsInput}
              placeholder="Credit hours (for GPA)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
            />
          </View>
          <Pressable onPress={handleSaveGoalAndCredits} className="bg-indigo-600 rounded-xl py-2.5 items-center mb-4">
            <Text className="text-white text-sm font-semibold">{gradeSaved ? 'Saved ✓' : 'Save goal & credits'}</Text>
          </Pressable>

          {(course.currentGrade !== undefined || course.gradeGoal !== undefined || course.credits !== undefined) && (
            <Text className="text-slate-500 text-xs mb-4">
              {course.gradeGoal !== undefined && totalPointsPossibleAllCategories > 0
                ? `${totalPointsEarnedSoFar} pts earned so far · goal ${course.gradeGoal} pts${totalPointsEarnedSoFar >= course.gradeGoal ? ' · on track' : ` · ${course.gradeGoal - totalPointsEarnedSoFar} pts to go`}`
                : course.currentGrade !== undefined
                ? `Currently ${course.currentGrade}%`
                : course.gradeGoal !== undefined
                ? `Goal ${course.gradeGoal} pts`
                : ''}
              {course.credits !== undefined ? ` · ${course.credits} credit${course.credits === 1 ? '' : 's'}` : ''}
            </Text>
          )}

          <View className="h-px bg-stone-100 dark:bg-slate-800 mb-4" />

          {/*
            Grading categories (e.g. Homework 20% / Quizzes 30% / Exams
            50%) — assignments pick one of these on the assignment
            screen, and the cumulative grade below is calculated from
            whichever categories actually have a graded assignment so
            far, weighted by these percentages. Its own Save action
            (renamed from "Add" — this is the button that was getting
            visually lost crammed into a 3-column row before), stacked
            in its own vertical form rather than squeezed alongside two
            numeric inputs, so it's never clipped on a phone screen.
          */}
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1.5">Grading categories</Text>
          {(course.gradeCategories?.length || 0) > 0 && (
            <View className="gap-1.5 mb-2">
              {course.gradeCategories!.map((cat) => (
                <View key={cat.id} className="flex-row items-center justify-between bg-stone-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <Text className="text-slate-700 dark:text-slate-300 text-xs flex-1">{cat.name}</Text>
                  <Text className="text-slate-500 text-xs mr-3">{cat.totalPointsPossible} pts</Text>
                  <Pressable onPress={() => handleRemoveCategory(cat.id)}>
                    <Text className="text-red-500 text-xs">Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {addingCategory ? (
            <View className="gap-2 mb-2">
              <TextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="e.g. Exams"
                placeholderTextColor="#64748b"
                autoFocus
                className="bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
              />
              <TextInput
                value={newCategoryPoints}
                onChangeText={setNewCategoryPoints}
                placeholder="Total points, e.g. 60"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                className="bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
              />
              <View className="flex-row gap-2">
                <Pressable onPress={handleAddCategory} className="flex-1 bg-indigo-600 rounded-xl py-2.5 items-center">
                  <Text className="text-white text-sm font-semibold">Save category</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setAddingCategory(false); setNewCategoryName(''); setNewCategoryPoints(''); }}
                  className="flex-1 bg-stone-100 dark:bg-slate-800 rounded-xl py-2.5 items-center"
                >
                  <Text className="text-slate-600 dark:text-slate-300 text-sm font-semibold">Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAddingCategory(true)} className="mb-2">
              <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">+ Add grading category</Text>
            </Pressable>
          )}

          <View className="h-px bg-stone-100 dark:bg-slate-800 mb-4 mt-2" />

          {/*
            Calculated grade readout — entirely derived from category
            points, no manual entry here. The useEffect above keeps
            course.currentGrade (what gpaCalculations.ts reads) in sync
            with this automatically.
          */}
          {gradeBreakdown ? (
            <View className="bg-indigo-600/10 rounded-xl p-3">
              <Text className="text-indigo-700 dark:text-indigo-300 text-base font-bold mb-1">
                {gradeBreakdown.overallPercent}%{course.gradeGoal !== undefined ? ` · goal ${course.gradeGoal} pts` : ''}
              </Text>
              {gradeBreakdown.byCategory.filter((c) => c.gradedCount > 0).map((c) => (
                <Text key={c.categoryId} className="text-indigo-600 dark:text-indigo-400 text-[11px]">
                  {c.name}: {c.pointsEarned}/{c.totalPointsPossible} pts ({c.percent}%, {c.gradedCount} graded)
                </Text>
              ))}
            </View>
          ) : (
            <Text className="text-slate-400 text-xs">
              {course.gradeCategories?.length
                ? 'No assignments graded yet — enter points on an assignment to see your grade here.'
                : 'Add a grading category above, then enter points on individual assignments to see your grade here.'}
            </Text>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Notes & flashcards" defaultOpen={false} subtitle="Upload a reading or type notes, then generate flashcards">
          <Text className="text-slate-500 text-xs mb-2">Upload a weekly reading to turn it into notes below, or type/paste your own.</Text>

          <ReadingListMatcher onMatched={summarizeAndAppend} />

          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2 mt-1">Or upload one reading directly</Text>

          <View className="flex-row flex-wrap gap-2 mb-2">
            <Pressable onPress={handleUploadReadingPdf} disabled={readingUploading} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center min-w-[80px]">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📄 PDF</Text>
            </Pressable>
            <Pressable onPress={handleUploadReadingDocx} disabled={readingUploading} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center min-w-[80px]">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📃 Word</Text>
            </Pressable>
            <Pressable onPress={handleUploadReadingEpub} disabled={readingUploading} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center min-w-[80px]">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📚 ePub</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-2 mb-2">
            <Pressable onPress={() => handleUploadReadingImage(pickSyllabusImageFromLibrary)} disabled={readingUploading} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center min-w-[80px]">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">🖼️ Photo</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable onPress={() => handleUploadReadingImage(captureSyllabusPhoto)} disabled={readingUploading} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center min-w-[80px]">
                <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📷 Take photo</Text>
              </Pressable>
            )}
            <Pressable onPress={handleUploadReadingTextFile} disabled={readingUploading} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center min-w-[80px]">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📎 .txt</Text>
            </Pressable>
            <Pressable onPress={() => setShowLinkInput(!showLinkInput)} disabled={readingUploading} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2 items-center min-w-[80px]">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">🔗 Link</Text>
            </Pressable>
          </View>
          {showLinkInput && (
            <View className="flex-row gap-2 mb-2">
              <TextInput
                value={readingLinkInput}
                onChangeText={setReadingLinkInput}
                placeholder="https://…"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                className="flex-1 bg-stone-100 text-slate-900 rounded-xl px-3 py-2 dark:text-slate-100 dark:bg-slate-800"
              />
              <Pressable
                onPress={handleUploadReadingLink}
                disabled={readingUploading || !readingLinkInput.trim()}
                className={readingUploading || !readingLinkInput.trim() ? 'bg-slate-300 dark:bg-slate-700 rounded-xl px-4 justify-center' : 'bg-indigo-600 rounded-xl px-4 justify-center active:bg-indigo-500'}
              >
                <Text className="text-white text-xs font-semibold">Go</Text>
              </Pressable>
            </View>
          )}
          {readingUploading && (
            <View className="flex-row items-center gap-2 mb-2">
              <ActivityIndicator size="small" />
              <Text className="text-slate-500 text-xs">Reading and taking notes…</Text>
            </View>
          )}

          {readingUploadError && <Text className="text-amber-600 dark:text-amber-400 text-xs mb-2">{readingUploadError}</Text>}

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
        </CollapsibleSection>

        <SyllabusUploadCard fixedCourseId={courseId} />

        <CollapsibleSection title="New assignment" defaultOpen={false} subtitle="Add an assignment by title and due date">
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
        </CollapsibleSection>

        <CollapsibleSection
          title="Assignments"
          badge={courseAssignments.length ? String(courseAssignments.length) : undefined}
          subtitle={courseAssignments.length ? `${courseAssignments.length} assignment${courseAssignments.length === 1 ? '' : 's'}` : 'No assignments yet'}
        >
          <View className="gap-2">
            {courseAssignments.length === 0 && <Text className="text-slate-500 text-center mt-4">No assignments yet.</Text>}
            {courseAssignments.map((a) => (
              <View key={a.id} className="bg-stone-50 dark:bg-slate-800 rounded-xl">
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
        </CollapsibleSection>

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
