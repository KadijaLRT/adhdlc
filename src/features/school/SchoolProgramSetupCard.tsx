import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Linking } from 'react-native';
import {
  useAppStore, selectProfile, selectGradeLevel, selectProgramName, selectUniversityName, selectCourses,
} from '@/store/index';
import { generateStarterCourses, buildOfficialCatalogSearchUrl } from './courseGeneration';
import { generateId } from '@/shared/generateId';

const GRADE_LEVELS = ['6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const STANDARD_SUBJECTS = [
  { name: 'Math', emoji: '🧮' }, { name: 'Science', emoji: '🧪' }, { name: 'English', emoji: '📖' },
  { name: 'History', emoji: '🌍' }, { name: 'Language', emoji: '🗣️' }, { name: 'Art', emoji: '🎨' },
  { name: 'PE', emoji: '🏃' }, { name: 'Elective', emoji: '⭐' },
];
const COMMON_PROGRAMS = [
  'Computer Science', 'Nursing', 'Business Administration', 'Psychology', 'Biology', 'Engineering',
  'Education', 'Communications', 'Criminal Justice', 'Economics', 'Political Science', 'Social Work',
];

/**
 * Adapts to the age bracket set during onboarding: middle/high school
 * gets a grade level and one-tap standard subjects, college/adult gets
 * a program + university, an AI-generated starter course list (framed
 * honestly as generated, not a real live catalog), and a link to the
 * school's actual official catalog for verification.
 */
export default function SchoolProgramSetupCard() {
  const profile = useAppStore(selectProfile);
  const gradeLevel = useAppStore(selectGradeLevel);
  const programName = useAppStore(selectProgramName);
  const universityName = useAppStore(selectUniversityName);
  const courses = useAppStore(selectCourses);
  const setSchoolSetup = useAppStore((s) => s.setSchoolSetup);
  const addCourse = useAppStore((s) => s.addCourse);

  const [localUniversity, setLocalUniversity] = useState(universityName || '');
  const [localProgram, setLocalProgram] = useState(programName || '');
  const [customProgram, setCustomProgram] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!gradeLevel && !programName && courses.length === 0);

  const isYounger = profile?.ageBracket === 'middle_school' || profile?.ageBracket === 'high_school';

  const handleAddSubject = async (subject: { name: string; emoji: string }) => {
    if (courses.some((c) => c.name === subject.name)) return;
    await addCourse({ id: generateId('course'), name: subject.name, emoji: subject.emoji });
  };

  const handleSaveProgram = async () => {
    await setSchoolSetup({ programName: localProgram, universityName: localUniversity });
  };

  const handleGenerateCourses = async () => {
    if (!localProgram.trim()) return;
    setGenerating(true);
    setGenError(null);
    await handleSaveProgram();
    const suggestions = await generateStarterCourses(localProgram.trim(), localUniversity.trim() || undefined);
    setGenerating(false);
    if (!suggestions) {
      setGenError("Couldn't generate a course list just now — try again in a moment, or just add courses manually below.");
      return;
    }
    // Previously appended every generated course with no duplicate
    // check at all — pressing Generate twice (a real, easy-to-do
    // accident, not an edge case) created duplicate courses outright.
    for (const course of suggestions) {
      if (courses.some((c) => c.name === course.name)) continue;
      await addCourse({
        id: generateId('course'),
        name: course.name,
        emoji: '📘',
        credits: course.suggestedCredits,
      });
    }
  };

  const handleOpenCatalog = () => {
    if (!localUniversity.trim() || !localProgram.trim()) return;
    Linking.openURL(buildOfficialCatalogSearchUrl(localUniversity.trim(), localProgram.trim()));
  };

  if (!expanded) {
    return (
      <Pressable onPress={() => setExpanded(true)} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium">
          🎓 {universityName ? `${universityName} · ${programName}` : gradeLevel ? `${gradeLevel} grade` : 'School setup'}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">Tap to edit</Text>
      </Pressable>
    );
  }

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4">
      <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold mb-3">🎓 School setup</Text>

      {isYounger ? (
        <>
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Grade level</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {GRADE_LEVELS.map((grade) => (
              <Pressable
                key={grade}
                onPress={() => setSchoolSetup({ gradeLevel: grade })}
                className={gradeLevel === grade ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-1.5 px-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-1.5 px-3'}
              >
                <Text className={gradeLevel === grade ? 'text-emerald-700 dark:text-emerald-400 text-xs font-medium' : 'text-slate-700 dark:text-slate-300 text-xs font-medium'}>{grade}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Add a standard subject</Text>
          <View className="flex-row flex-wrap gap-2 mb-2">
            {STANDARD_SUBJECTS.map((subject) => {
              const already = courses.some((c) => c.name === subject.name);
              return (
                <Pressable
                  key={subject.name}
                  onPress={() => handleAddSubject(subject)}
                  disabled={already}
                  className={already ? 'bg-stone-100 dark:bg-slate-800 rounded-full py-1.5 px-3 opacity-50' : 'bg-indigo-600/10 border border-indigo-400 rounded-full py-1.5 px-3'}
                >
                  <Text className="text-xs">{subject.emoji} {subject.name}{already ? ' ✓' : ''}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-slate-500 text-xs">Or add anything custom in Courses below.</Text>
        </>
      ) : (
        <>
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">School (optional)</Text>
          <TextInput
            value={localUniversity}
            onChangeText={setLocalUniversity}
            onBlur={handleSaveProgram}
            placeholder="e.g. University of Michigan"
            placeholderTextColor="#64748b"
            className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-4"
          />

          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Program / Major</Text>
          {!customProgram ? (
            <>
              <View className="flex-row flex-wrap gap-2 mb-2">
                {COMMON_PROGRAMS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => { setLocalProgram(p); setSchoolSetup({ programName: p, universityName: localUniversity }); }}
                    className={localProgram === p ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-1.5 px-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-1.5 px-3'}
                  >
                    <Text className={localProgram === p ? 'text-emerald-700 dark:text-emerald-400 text-xs' : 'text-slate-700 dark:text-slate-300 text-xs'}>{p}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setCustomProgram(true)} className="mb-4">
                <Text className="text-indigo-500 text-xs">+ Type my own program</Text>
              </Pressable>
            </>
          ) : (
            <TextInput
              value={localProgram}
              onChangeText={setLocalProgram}
              onBlur={handleSaveProgram}
              placeholder="Type your program or major"
              placeholderTextColor="#64748b"
              className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-4"
            />
          )}

          <Pressable
            onPress={handleGenerateCourses}
            disabled={!localProgram.trim() || generating}
            className={!localProgram.trim() || generating ? 'bg-slate-300 dark:bg-slate-700 rounded-xl py-3 items-center mb-2' : 'bg-emerald-500 rounded-xl py-3 items-center active:bg-emerald-400 mb-2'}
          >
            {generating ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-white text-sm font-semibold">Generating…</Text>
              </View>
            ) : (
              <Text className="text-white text-sm font-semibold">✨ Generate a starter course list</Text>
            )}
          </Pressable>
          <Text className="text-slate-500 text-[11px] mb-3">
            Generated from general knowledge of typical {localProgram || 'program'} requirements — not pulled from your actual school's live catalog. Edit or delete anything below.
          </Text>

          {localUniversity.trim() && localProgram.trim() && (
            <Pressable onPress={handleOpenCatalog} className="py-2 mb-2">
              <Text className="text-indigo-500 text-xs">🔗 Open {localUniversity}'s official catalog to verify →</Text>
            </Pressable>
          )}

          {genError && <Text className="text-red-500 text-xs mb-2">{genError}</Text>}
        </>
      )}

      <Pressable onPress={() => { if (!isYounger) handleSaveProgram(); setExpanded(false); }} className="py-2 mt-1">
        <Text className="text-slate-500 text-center text-xs">Done</Text>
      </Pressable>
    </View>
  );
}
