import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Platform, Image } from 'react-native';
import { useAppStore, selectCourses } from '@/store/index';
import { avivaBrain, type SyllabusParseResult } from '@/core/ai/AvivaBrain';
import { pickAndReadTextFile } from './syllabusImport';
import { pickAndExtractPdfText } from './syllabusPdfImport';
import { pickSyllabusImageFromLibrary, captureSyllabusPhoto } from './syllabusImageImport';
// @ts-ignore - plain JS by design, see groqSanitizer.js header.
import { MAX_PAYLOAD_LENGTH } from '@/core/ai/groqSanitizer';

const TYPE_ICON: Record<string, string> = {
  homework: '📝', exam: '📋', quiz: '❓', project: '🛠️', paper: '📄', reading: '📖', other: '🔖',
};

type ProposedAssignment = SyllabusParseResult['assignments'][number] & { included: boolean };

interface SyllabusUploadCardProps {
  /** When opened from a specific course's page, assignments go straight there instead of needing course selection. */
  fixedCourseId?: string;
  onDone?: () => void;
}

/**
 * Paste-text is the primary path since it works identically everywhere
 * and handles any source (PDF, Word, an email, a course website) — the
 * person just copies the text out of whatever they're looking at. File
 * upload is offered as a convenience for an already-plain-text
 * syllabus specifically; anything else (PDF/Word) gets a direct,
 * upfront note to paste instead, rather than silently failing or
 * mangling a parse.
 *
 * Every extracted assignment is reviewable and individually
 * removable/editable before anything is actually added — this never
 * writes to real course/assignment data on its own.
 */
export default function SyllabusUploadCard({ fixedCourseId, onDone }: SyllabusUploadCardProps) {
  const courses = useAppStore(selectCourses);
  const addCourse = useAppStore((s) => s.addCourse);
  const addAssignment = useAppStore((s) => s.addAssignment);

  const [expanded, setExpanded] = useState(false);
  const [syllabusText, setSyllabusText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ courseName: string | null; reasoning: string } | null>(null);
  const [proposed, setProposed] = useState<ProposedAssignment[]>([]);
  const [targetCourseId, setTargetCourseId] = useState<string>(fixedCourseId || '');
  const [newCourseName, setNewCourseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const wasTruncated = syllabusText.length > MAX_PAYLOAD_LENGTH;

  const handlePickFile = async () => {
    setFileError(null);
    setImagePreviewUrl(null);
    try {
      const picked = await pickAndReadTextFile();
      if (!picked) return;
      setFileName(picked.name);
      setSyllabusText(picked.text);
    } catch (error: any) {
      if (error?.message === 'NOT_TXT') {
        setFileError("That's not a .txt file — use \"Upload PDF\" below for a PDF, or paste the text directly.");
      } else {
        setFileError("Couldn't read that file. Try pasting the text directly instead.");
      }
    }
  };

  const handlePickPdf = async () => {
    setFileError(null);
    setImagePreviewUrl(null);
    try {
      const picked = await pickAndExtractPdfText();
      if (!picked) return;
      if (picked.looksScanned) {
        setFileError(`"${picked.name}" doesn't seem to have real text in it — it's probably a scanned page or photo saved as a PDF. Use "Upload screenshot" below instead, which reads the page visually.`);
        return;
      }
      setFileName(picked.name);
      setSyllabusText(picked.text);
    } catch (error) {
      setFileError("Couldn't read that PDF. If it's a scanned document, try \"Upload screenshot\" instead — otherwise, paste the text directly.");
    }
  };

  const runImageExtract = async (picker: () => Promise<{ dataUrl: string } | null>) => {
    setFileError(null);
    setExtractError(null);
    setResult(null);
    setSyllabusText('');
    setFileName(null);
    try {
      const picked = await picker();
      if (!picked) return;
      setImagePreviewUrl(picked.dataUrl);
      setExtracting(true);
      const today = new Date().toISOString().slice(0, 10);
      const parsed = await avivaBrain.parseSyllabusImage(picked.dataUrl, today);
      setExtracting(false);
      applyParsedResult(parsed);
    } catch (error: any) {
      setExtracting(false);
      if (error?.message === 'PERMISSION_DENIED') {
        setFileError('Photo access was denied — you can allow it from your device settings, or paste the text instead.');
      } else {
        setFileError("Couldn't read that image. Try a clearer photo, or paste the text directly instead.");
      }
    }
  };

  const applyParsedResult = (parsed: SyllabusParseResult | null) => {
    if (!parsed) {
      setExtractError("Couldn't extract assignments just now — try again in a moment, or add them manually below instead.");
      return;
    }
    if (!parsed.assignments.length) {
      setExtractError("Didn't find any assignments with clear due dates. If your syllabus has due dates, make sure they're visible in what you uploaded.");
      return;
    }
    setResult({ courseName: parsed.courseName, reasoning: parsed.reasoning });
    setProposed(parsed.assignments.map((a) => ({ ...a, included: true })));
    if (!fixedCourseId && parsed.courseName) setNewCourseName(parsed.courseName);
  };

  const handleExtract = async () => {
    if (!syllabusText.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setResult(null);
    setProposed([]);
    const today = new Date().toISOString().slice(0, 10);
    const parsed = await avivaBrain.parseSyllabus(syllabusText, today);
    setExtracting(false);
    applyParsedResult(parsed);
  };

  const toggleIncluded = (id: string) => {
    setProposed((prev) => prev.map((a) => (a.id === id ? { ...a, included: !a.included } : a)));
  };
  const updateProposed = (id: string, updates: Partial<ProposedAssignment>) => {
    setProposed((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const includedCount = proposed.filter((a) => a.included).length;
  const canSave = includedCount > 0 && (fixedCourseId || targetCourseId || newCourseName.trim());

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    let courseId = fixedCourseId || targetCourseId;
    if (!courseId && newCourseName.trim()) {
      courseId = `course-${Date.now()}`;
      await addCourse({ id: courseId, name: newCourseName.trim(), emoji: '📘' });
    }
    for (const a of proposed) {
      if (!a.included) continue;
      // eslint-disable-next-line no-await-in-loop -- small, bounded list from one syllabus; sequential keeps ids simple and avoids any write-ordering surprise
      await addAssignment({
        id: `assignment-${Date.now()}-${a.id}`,
        courseId,
        title: a.title,
        dueDate: a.dueDate,
        isComplete: false,
        subSteps: [],
      });
    }
    setSaving(false);
    setSavedCount(includedCount);
    setProposed([]);
    setResult(null);
    setSyllabusText('');
    setFileName(null);
    setImagePreviewUrl(null);
    onDone?.();
  };

  if (!expanded) {
    return (
      <Pressable onPress={() => setExpanded(true)} className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 flex-row items-center justify-between">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-medium">📄 Upload a syllabus</Text>
        <Text className="text-slate-400 text-xs">Extract due dates →</Text>
      </Pressable>
    );
  }

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-slate-900 dark:text-slate-100 text-sm font-semibold">📄 Upload a syllabus</Text>
        <Pressable onPress={() => setExpanded(false)}><Text className="text-slate-400 text-xs">Close</Text></Pressable>
      </View>

      {savedCount !== null && (
        <View className="bg-emerald-400/10 border border-emerald-400 rounded-xl p-3 mb-3">
          <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-medium">✓ Added {savedCount} assignment{savedCount === 1 ? '' : 's'}.</Text>
        </View>
      )}

      {!result && (
        <>
          <Text className="text-slate-500 text-xs mb-3">
            Upload a PDF or a screenshot/photo, or paste the text directly below — whatever's easiest.
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-3">
            <Pressable onPress={handlePickPdf} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2.5 items-center min-w-[100px]">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📄 Upload PDF</Text>
            </Pressable>
            <Pressable onPress={() => runImageExtract(pickSyllabusImageFromLibrary)} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2.5 items-center min-w-[100px]">
              <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">🖼️ Upload screenshot</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable onPress={() => runImageExtract(captureSyllabusPhoto)} className="flex-1 border-2 border-stone-300 dark:border-slate-700 rounded-xl py-2.5 items-center min-w-[100px]">
                <Text className="text-slate-700 dark:text-slate-300 text-xs font-medium">📷 Take photo</Text>
              </Pressable>
            )}
          </View>

          {imagePreviewUrl && (
            <View className="mb-3 flex-row items-center gap-2">
              <Image source={{ uri: imagePreviewUrl }} style={{ width: 48, height: 48, borderRadius: 8 }} />
              {extracting && (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" />
                  <Text className="text-slate-500 text-xs">Reading the image…</Text>
                </View>
              )}
            </View>
          )}
          {fileError && <Text className="text-amber-600 dark:text-amber-400 text-xs mb-3">{fileError}</Text>}
          {extractError && <Text className="text-red-500 text-xs mb-3">{extractError}</Text>}

          <View className="border-t border-stone-100 dark:border-slate-800 pt-3">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Or paste text</Text>
            <TextInput
              value={syllabusText}
              onChangeText={setSyllabusText}
              placeholder="Paste your syllabus text here…"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={6}
              className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-2"
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
            {wasTruncated && (
              <Text className="text-amber-600 dark:text-amber-400 text-[11px] mb-2">
                That's long — only the first ~{MAX_PAYLOAD_LENGTH.toLocaleString()} characters will be read. If your due dates are further down, paste just that section instead.
              </Text>
            )}
            <Pressable onPress={handlePickFile} className="py-2 mb-2">
              <Text className="text-indigo-500 text-xs">📎 {fileName ? `Using ${fileName} — choose a different file` : 'Or upload a .txt file'}</Text>
            </Pressable>

            <Pressable
              onPress={handleExtract}
              disabled={!syllabusText.trim() || extracting}
              className={!syllabusText.trim() || extracting ? 'bg-slate-300 dark:bg-slate-700 rounded-xl py-3 items-center' : 'bg-indigo-600 rounded-xl py-3 items-center active:bg-indigo-500'}
            >
              {extracting && !imagePreviewUrl ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#fff" size="small" />
                  <Text className="text-white text-sm font-semibold">Reading…</Text>
                </View>
              ) : (
                <Text className="text-white text-sm font-semibold">✨ Extract assignments</Text>
              )}
            </Pressable>
          </View>
        </>
      )}

      {result && proposed.length > 0 && (
        <>
          <Text className="text-slate-500 text-xs mb-3">{result.reasoning}</Text>

          {!fixedCourseId && (
            <>
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">Add to which course?</Text>
              {courses.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {courses.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => { setTargetCourseId(c.id); setNewCourseName(''); }}
                      className={targetCourseId === c.id ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-1.5 px-3' : 'bg-stone-100 dark:bg-slate-800 border-2 border-transparent rounded-full py-1.5 px-3'}
                    >
                      <Text className={targetCourseId === c.id ? 'text-emerald-700 dark:text-emerald-400 text-xs' : 'text-slate-700 dark:text-slate-300 text-xs'}>{c.emoji} {c.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <TextInput
                value={newCourseName}
                onChangeText={(v) => { setNewCourseName(v); setTargetCourseId(''); }}
                placeholder="Or type a new course name"
                placeholderTextColor="#64748b"
                className="bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 mb-4"
              />
            </>
          )}

          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-2">{includedCount} of {proposed.length} selected — review before adding</Text>
          <View className="gap-2 mb-4">
            {proposed.map((a) => (
              <View key={a.id} className={a.included ? 'bg-stone-50 dark:bg-slate-800 rounded-xl p-3' : 'bg-stone-50 dark:bg-slate-800 rounded-xl p-3 opacity-50'}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Pressable onPress={() => toggleIncluded(a.id)} className={a.included ? 'w-5 h-5 rounded-full bg-emerald-500 items-center justify-center' : 'w-5 h-5 rounded-full border-2 border-stone-300 dark:border-slate-600 items-center justify-center'}>
                    {a.included && <Text className="text-white text-[10px]">✓</Text>}
                  </Pressable>
                  <Text className="text-sm">{TYPE_ICON[a.type] || '🔖'}</Text>
                  <TextInput
                    value={a.title}
                    onChangeText={(v) => updateProposed(a.id, { title: v })}
                    editable={a.included}
                    className="flex-1 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </View>
                <TextInput
                  value={a.dueDate}
                  onChangeText={(v) => updateProposed(a.id, { dueDate: v })}
                  editable={a.included}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                  className="text-slate-500 text-xs ml-7"
                />
              </View>
            ))}
          </View>

          <Pressable
            onPress={handleSave}
            disabled={!canSave || saving}
            className={!canSave || saving ? 'bg-slate-300 dark:bg-slate-700 rounded-xl py-3 items-center' : 'bg-emerald-500 rounded-xl py-3 items-center active:bg-emerald-400'}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text className="text-white text-sm font-semibold">Add {includedCount} assignment{includedCount === 1 ? '' : 's'}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => { setResult(null); setProposed([]); }} className="py-2 mt-1">
            <Text className="text-slate-500 text-center text-xs">Start over</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
