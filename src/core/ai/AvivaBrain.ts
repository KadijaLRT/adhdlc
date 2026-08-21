import { z } from 'zod';
// @ts-ignore - plain JS by design, see file header.
import { sanitizeString, sanitizePayload, MAX_PAYLOAD_LENGTH } from './groqSanitizer';
import { callGroqCompletion, GroqProxyError, type GroqMessage } from './groqProxyClient';

export interface AvivaContext {
  currentEnergyLevel: 'low' | 'medium' | 'high';
  isOverwhelmed: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  recentReflection?: string; // the person's own most recent evening check-in note
}

const SubStepSchema = z.object({
  id: z.string(), title: z.string(), estimatedMinutes: z.number().nonnegative(),
});
const TaskDecompositionSchema = z.object({
  originalTask: z.string(),
  subSteps: z.array(SubStepSchema),
  estimatedRealMinutes: z.number().nonnegative(),
  estimatedIdealMinutes: z.number().nonnegative(),
  reasoning: z.string(),
  suggestedEnergyLevel: z.enum(['low', 'medium', 'high']),
});
export type TaskDecomposition = z.infer<typeof TaskDecompositionSchema>;

const BrainDumpItemSchema = z.object({
  id: z.string(), text: z.string(),
  category: z.enum(['task', 'appointment', 'errand', 'phone_call', 'reminder', 'bill']),
  suggestedEnergyLevel: z.enum(['low', 'medium', 'high']),
  suggestedTiming: z.enum(['morning', 'afternoon', 'evening', 'no_preference']),
});
const BrainDumpResultSchema = z.object({
  items: z.array(BrainDumpItemSchema), reasoning: z.string(),
});
export type BrainDumpResult = z.infer<typeof BrainDumpResultSchema>;

const FlashcardSchema = z.object({ front: z.string(), back: z.string() });
const FlashcardSetSchema = z.object({ cards: z.array(FlashcardSchema) });
export type FlashcardSet = z.infer<typeof FlashcardSetSchema>;

const ReadingNotesSchema = z.object({
  title: z.string().nullable(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  wasTruncated: z.boolean(),
});
export type ReadingNotes = z.infer<typeof ReadingNotesSchema>;

const ReadingListItemSchema = z.object({
  // A short, human label for this source ("Arthur, D. (2012)", "the
  // Guion reading") — used to show the person which item they're
  // matching a file to, and as a fuzzy-match anchor if the uploaded
  // file's own name/title doesn't line up exactly.
  sourceLabel: z.string(),
  // Real page numbers only make sense for a PDF (a fixed, paginated
  // layout) — null for anything else, since "page 120" is meaningless
  // in a reflowable DOCX/EPUB where page breaks depend entirely on the
  // viewer/font/screen size, not the document itself.
  startPage: z.number().int().positive().nullable(),
  endPage: z.number().int().positive().nullable(),
  // A chapter/section title as text — the fallback that actually
  // works for DOCX/EPUB, matched later against real heading text
  // rather than a fixed page position. Also what a screenshot like
  // "Chapters 1-3: Recruitment Challenges..." naturally provides
  // instead of numeric pages.
  sectionLabel: z.string().nullable(),
  // If the item is itself a link (not something to be uploaded as a
  // file), the raw URL text as shown — null when it's a book/PDF
  // reference instead.
  url: z.string().nullable(),
});
const ReadingListSchema = z.object({
  items: z.array(ReadingListItemSchema),
  // The model's own honesty check: did the screenshot clearly show
  // one or more specific, identifiable readings, or is this a guess?
  // A low-confidence result means the person should fall back to
  // summarizing whatever document(s) they upload in full, rather than
  // the app silently scoping to a list that might be wrong or
  // incomplete.
  confident: z.boolean(),
  reasoning: z.string(),
});
export type ReadingListItem = z.infer<typeof ReadingListItemSchema>;
export type ReadingList = z.infer<typeof ReadingListSchema>;

// Every real exercise group this app actually has content for —
// constraining generation to these (rather than letting the model
// invent its own group names) is what keeps a generated program from
// silently matching zero real exercises.
const VALID_EXERCISE_GROUPS = ['glutes', 'hamstrings', 'quads', 'back', 'chest', 'core', 'calves', 'arms', 'shoulders', 'fullbody'] as const;

const GeneratedProgramSchema = z.object({
  title: z.string(),
  emoji: z.string(),
  forWhom: z.string(),
  daysPerWeek: z.number().int().min(1).max(7),
  durationWeeks: z.number().int().min(1).max(16),
  // 'all' is a real recognized value elsewhere in this app's program
  // matching (see ProgramDefinition's own comment) alongside specific
  // group names — both are valid, unlike an invented group name.
  targetGroups: z.array(z.string()).min(1),
  // The only real system-wide bound is 2-8 (see
  // getEffectiveSessionExerciseCount in buildWeeklySplit.ts) — nothing
  // smaller is enforced here, since the person generating this
  // explicitly does not want it artificially narrowed further.
  sessionExerciseCount: z.number().int().min(2).max(8),
  restBetweenSetsHint: z.string(),
});
export type GeneratedProgram = z.infer<typeof GeneratedProgramSchema>;

const isoDateSchema = z.string().refine((val) => {
  // A regex alone (e.g. \d{4}-\d{2}-\d{2}) would pass "2026-13-45" —
  // this actually re-derives the date and checks it round-trips
  // exactly, which real invalid dates never do (JS Date silently
  // normalizes them into a different date instead of erroring).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [y, m, d] = val.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}, { message: 'Not a valid calendar date' });

const SyllabusAssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: isoDateSchema, // the model resolves bare "Oct 15"-style dates using the current date passed in the prompt
  type: z.enum(['homework', 'exam', 'quiz', 'project', 'paper', 'reading', 'other']),
});
const SyllabusParseResultSchema = z.object({
  courseName: z.string().nullable(),
  assignments: z.array(SyllabusAssignmentSchema),
  reasoning: z.string(),
});
export type SyllabusParseResult = z.infer<typeof SyllabusParseResultSchema>;

const LenientSyllabusParseResultSchema = z.object({
  courseName: z.string().nullable(),
  assignments: z.array(z.any()),
  reasoning: z.string(),
});

/**
 * Validates the overall response shape leniently, then validates each
 * assignment individually — a single assignment with a malformed date
 * (or any other bad field) previously failed validation for the whole
 * batch via a single safeParse on the strict schema, discarding every
 * other correctly-extracted assignment along with it. This keeps
 * whatever validates and silently drops only what doesn't, logging how
 * many were dropped so it's visible in the console without being
 * surfaced as a hard failure to the person reviewing the results.
 */
function parseSyllabusResultLeniently(raw: string, context: string): SyllabusParseResult | null {
  const outer = LenientSyllabusParseResultSchema.safeParse(JSON.parse(raw));
  if (!outer.success) {
    console.error(`AvivaBrain: ${context} schema validation failed`, outer.error.flatten());
    return null;
  }
  const validAssignments: SyllabusParseResult['assignments'] = [];
  let droppedCount = 0;
  for (const candidate of outer.data.assignments) {
    const result = SyllabusAssignmentSchema.safeParse(candidate);
    if (result.success) validAssignments.push(result.data);
    else droppedCount++;
  }
  if (droppedCount > 0) {
    console.error(`AvivaBrain: ${context} dropped ${droppedCount} invalid assignment(s) out of ${outer.data.assignments.length}`);
  }
  return { courseName: outer.data.courseName, assignments: validAssignments, reasoning: outer.data.reasoning };
}

/**
 * Wraps all calls to the Groq API used by "Aviva." Every method sanitizes
 * inputs before they leave the device and validates responses against a
 * strict Zod schema before returning, so callers never guess at shape.
 */
export class AvivaBrain {
  /**
   * Set whenever the most recent call fails with a GroqProxyError —
   * read by SyllabusUploadCard right after a failed extraction to show
   * a real, specific reason ("AI service isn't configured" vs. "too
   * many requests" vs. a network problem) instead of one generic
   * "couldn't extract" message that looked identical for every
   * possible cause. Deliberately not part of each method's return
   * type — that would mean touching every existing call site in the
   * app (decomposeTask, generateFlashcards, etc.) for a distinction
   * only the syllabus feature currently needs to surface.
   */
  lastErrorReason: GroqProxyError['reason'] | null = null;

  async decomposeTask(taskTitle: string, context: AvivaContext): Promise<TaskDecomposition | null> {
    const cleanTitle = sanitizeString(taskTitle);
    if (!cleanTitle) return null;
    const cleanContext = sanitizePayload(context) as AvivaContext;

    const systemPrompt = `You are Aviva, a compassionate executive-function assistant for people with ADHD.
Break the user's task into small, concrete, low-friction sub-steps.
Never use guilt, urgency, or shaming language.
The ADHD brain is motivated by an interest-based nervous system, not an importance-based one. When it fits naturally, briefly note in your reasoning which of these five levers (PINCH) could make this specific task easier to start: Play (humor/gamifying), Interest, Novelty, Connection (competition/collaboration), or a real Hurry-Up deadline. Only mention it if genuinely relevant to this task — don't force it in.
Always explain your reasoning briefly and concretely.
Respond with ONLY valid JSON matching this exact shape, no markdown fences:
{"originalTask": string, "subSteps": [{"id": string, "title": string, "estimatedMinutes": number}], "estimatedRealMinutes": number, "estimatedIdealMinutes": number, "reasoning": string, "suggestedEnergyLevel": "low"|"medium"|"high"}`;

    const userPrompt = `Task: "${cleanTitle}"
Energy level: ${cleanContext.currentEnergyLevel}
Overwhelmed: ${cleanContext.isOverwhelmed}
Time of day: ${cleanContext.timeOfDay}`;

    try {
      const raw = await callGroqCompletion(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        0.4
      );
      if (!raw) return null;
      const validated = TaskDecompositionSchema.safeParse(JSON.parse(raw));
      if (!validated.success) {
        console.error('AvivaBrain: decomposeTask schema validation failed', validated.error.flatten());
        return null;
      }
      return validated.data;
    } catch (error) {
      console.error('AvivaBrain: decomposeTask failed', error);
      return null;
    }
  }

  async parseBrainDump(rawText: string, context: AvivaContext): Promise<BrainDumpResult | null> {
    const cleanText = sanitizeString(rawText);
    if (!cleanText) return null;
    const cleanContext = sanitizePayload(context) as AvivaContext;

    const systemPrompt = `You are Aviva, a compassionate executive-function assistant.
The user will paste unstructured, chaotic thoughts. Break them into distinct,
concrete items. Never add urgency or guilt language. Explain your reasoning briefly.
If a recent reflection note is provided, use it only as light context — never quote it back verbatim.
Respond with ONLY valid JSON, no markdown fences:
{"items": [{"id": string, "text": string, "category": "task"|"appointment"|"errand"|"phone_call"|"reminder"|"bill", "suggestedEnergyLevel": "low"|"medium"|"high", "suggestedTiming": "morning"|"afternoon"|"evening"|"no_preference"}], "reasoning": string}`;

    const userPrompt = `Brain dump: "${cleanText}"
Energy level: ${cleanContext.currentEnergyLevel}
Overwhelmed: ${cleanContext.isOverwhelmed}
Time of day: ${cleanContext.timeOfDay}${cleanContext.recentReflection ? `\nTheir most recent evening reflection: "${cleanContext.recentReflection}"` : ''}`;

    try {
      const raw = await callGroqCompletion(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        0.4
      );
      if (!raw) return null;
      const validated = BrainDumpResultSchema.safeParse(JSON.parse(raw));
      if (!validated.success) {
        console.error('AvivaBrain: brain dump schema validation failed', validated.error.flatten());
        return null;
      }
      return validated.data;
    } catch (error) {
      console.error('AvivaBrain: parseBrainDump failed', error);
      return null;
    }
  }

  async breakDownAssignment(assignmentTitle: string, context: AvivaContext): Promise<TaskDecomposition | null> {
    // Reuses the exact same schema/sanitization/validation path as
    // decomposeTask — an assignment breakdown is the same shape of
    // problem as a task breakdown, just entered from School instead of
    // Tasks. No duplicated AI logic.
    return this.decomposeTask(assignmentTitle, context);
  }

  async generateFlashcards(notesText: string): Promise<FlashcardSet | null> {
    const cleanNotes = sanitizeString(notesText);
    if (!cleanNotes) return null;

    const systemPrompt = `You create simple study flashcards from a student's notes.
Extract the clearest, most testable facts or concepts. Keep each card short.
Respond with ONLY valid JSON, no markdown fences:
{"cards": [{"front": string, "back": string}]}`;

    try {
      const raw = await callGroqCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Notes: "${cleanNotes}"` },
        ],
        0.4
      );
      if (!raw) return null;
      const validated = FlashcardSetSchema.safeParse(JSON.parse(raw));
      if (!validated.success) {
        console.error('AvivaBrain: flashcard generation schema validation failed', validated.error.flatten());
        return null;
      }
      return validated.data;
    } catch (error) {
      console.error('AvivaBrain: generateFlashcards failed', error);
      return null;
    }
  }

  /**
   * Reads a screenshot of a reading list (a "Readings & Resources"
   * page, a syllabus section, a course page) and identifies every
   * distinct source it lists — each with its own author/title label
   * and its own chapter range or link, since a real reading list
   * routinely names several separate books/PDFs rather than pointing
   * into just one. Deliberately includes its own confidence check: a
   * genuinely unclear screenshot shouldn't produce a made-up list —
   * the caller falls back to a plain single-document upload when
   * confident is false.
   */
  async identifyReadingList(imageDataUrl: string): Promise<ReadingList | null> {
    this.lastErrorReason = null;
    if (!imageDataUrl?.startsWith('data:image/')) return null;

    const systemPrompt = `You read a screenshot of a reading list (a "Readings & Resources" page, a syllabus section, a course page) and identify every distinct source it lists.
A reading list routinely names several separate sources — each gets its own item in your response, not one combined range. For each item:
- sourceLabel: a short label identifying it (e.g. author/year, like "Arthur, D. (2012)", or a short title) — this is shown to the person to help them pick the matching file, so make it recognizable, not the full citation.
- If real page numbers are visible for that item (e.g. "pages 120-145"), extract them as startPage/endPage.
- If chapters are named instead (e.g. "Chapters 1-3: Recruitment Challenges..."), put that in sectionLabel and leave startPage/endPage null — a page number and a chapter name describe different things, don't guess one from the other.
- If the item is itself a link/URL rather than a book or PDF to upload, put the link text in url and leave the rest null.
If you can't confidently identify any real reading items — the image isn't a reading list, or it's too unclear to read — set confident to false, return an empty items array, and explain why in reasoning. Do not invent items that aren't actually there.
Respond with ONLY valid JSON, no markdown fences:
{"items": [{"sourceLabel": string, "startPage": number|null, "endPage": number|null, "sectionLabel": string|null, "url": string|null}], "confident": boolean, "reasoning": string}`;

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What reading items does this screenshot list?' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ];

    try {
      const raw = await callGroqCompletion(messages, 0.1); // near-zero — this needs to read what's actually there, not guess creatively
      if (!raw) return null;
      const validated = ReadingListSchema.safeParse(JSON.parse(raw));
      if (!validated.success) {
        console.error('AvivaBrain: identifyReadingList schema validation failed', validated.error.flatten());
        return null;
      }
      return validated.data;
    } catch (error) {
      console.error('AvivaBrain: identifyReadingList failed', error);
      if (error instanceof GroqProxyError) this.lastErrorReason = error.reason;
      return null;
    }
  }

  /**
   * Turns raw extracted reading text (from a PDF, DOCX, EPUB, photo,
   * or link) into short, scannable study notes — a plain-language
   * summary plus bulleted key points, not the raw transcript dumped
   * into the notes field. A wall of unprocessed reading text is
   * exactly the kind of dense, low-signal content this app's own
   * design principles (low cognitive load, progressive disclosure)
   * exist to avoid.
   *
   * sanitizeString truncates at MAX_PAYLOAD_LENGTH after also
   * collapsing whitespace/newlines — this checks whether the sanitized
   * output actually hit that cutoff, not a raw before/after length
   * delta (an earlier version compared lengths directly and produced
   * false positives on readings that were never truncated at all,
   * purely from whitespace normalization shrinking the string). The
   * caller gets that same honesty back via wasTruncated, to surface in the UI.
   */
  async summarizeReadingToNotes(readingText: string, sourceLabel: string): Promise<ReadingNotes | null> {
    this.lastErrorReason = null;
    const cleanText = sanitizeString(readingText);
    if (!cleanText) return null;
    // sanitizeString also collapses whitespace/newlines before
    // truncating — comparing sanitized length against the raw
    // original length (what this used to do) produces false
    // positives purely from that normalization, on readings that were
    // never actually truncated at all (verified: a ~2200-character
    // reading with realistic paragraph breaks shrank to ~2200 from
    // whitespace collapsing alone, well under the 8000 cutoff, but
    // still registered as "shorter than original"). The only reliable
    // signal that real truncation happened is the sanitized output
    // actually landing exactly at the cutoff length.
    const wasTruncated = cleanText.length >= MAX_PAYLOAD_LENGTH;

    const systemPrompt = `You turn a piece of assigned course reading into short, scannable study notes for a student with ADHD.
Write a plain-language summary in a few sentences — what this reading is actually about and why it matters, not a restatement of every detail.
Pull out the key points as short, individually scannable bullet items — concrete facts, definitions, or arguments a student would actually need to know, not vague generalities.
${wasTruncated ? 'IMPORTANT: the text you were given is a truncated excerpt of a longer document — it was cut off partway through. Only summarize what you actually have, and set wasTruncated to true. Do not imply this covers the whole reading.' : 'Set wasTruncated to false — you were given the complete text.'}
Respond with ONLY valid JSON, no markdown fences:
{"title": string|null, "summary": string, "keyPoints": [string], "wasTruncated": boolean}`;

    const userPrompt = `Source: ${sourceLabel}\n\nReading text:\n"${cleanText}"`;

    try {
      const raw = await callGroqCompletion(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        0.3
      );
      if (!raw) return null;
      const validated = ReadingNotesSchema.safeParse(JSON.parse(raw));
      if (!validated.success) {
        console.error('AvivaBrain: summarizeReadingToNotes schema validation failed', validated.error.flatten());
        return null;
      }
      // Belt and suspenders: even if the model didn't correctly set
      // wasTruncated itself, this app already knows the definitive
      // answer from its own length comparison above — that should
      // never be silently overridden by a model that got it wrong.
      return { ...validated.data, wasTruncated: validated.data.wasTruncated || wasTruncated };
    } catch (error) {
      console.error('AvivaBrain: summarizeReadingToNotes failed', error);
      if (error instanceof GroqProxyError) this.lastErrorReason = error.reason;
      return null;
    }
  }

  /**
   * Generates a new workout program definition from a plain-language
   * description of what someone wants — a real alternative to picking
   * from the 7 built-in programs, which are deliberately kept small
   * (see content/programs.ts's own comment about avoiding decision
   * paralysis). That default is appropriate for someone choosing
   * between pre-made options, but not for someone explicitly asking to
   * generate their own — the prompt below is deliberately told not to
   * apply that same narrowing, and the schema's only enforced bound is
   * the real system-wide limit (2-8 exercises per session), not a
   * smaller self-imposed one.
   */
  async generateWorkoutProgram(description: string): Promise<GeneratedProgram | null> {
    this.lastErrorReason = null;
    const cleanDescription = sanitizeString(description);
    if (!cleanDescription) return null;

    const systemPrompt = `You design a workout program based on what someone describes wanting.
Pick real values, not the smallest plausible ones — someone generating their own program explicitly does not want it artificially minimized. sessionExerciseCount can be anywhere from 2 to 8 (the app's real system-wide range), daysPerWeek 1-7, durationWeeks 1-16 — choose whatever actually fits their description, including a genuinely larger session or duration if that's what they asked for or implied.
targetGroups must only use these exact values: ${VALID_EXERCISE_GROUPS.join(', ')}, or "all" for every group. Never invent a group name that isn't in that list — it wouldn't match any real exercise.
emoji should be one relevant emoji character. forWhom is a short one-line description of who this fits. restBetweenSetsHint is a short, encouraging one-line note about pacing between sets — reflect current guidance, not outdated "push to failure" framing: recommend stopping a couple of reps short of failure (not grinding every set to zero), and for a program that's specifically about maximal strength (low reps, heavy compound lifts), longer rest (3-5 minutes) is appropriate; for general hypertrophy/fitness work, 60-180 seconds is enough.
Respond with ONLY valid JSON, no markdown fences:
{"title": string, "emoji": string, "forWhom": string, "daysPerWeek": number, "durationWeeks": number, "targetGroups": [string], "sessionExerciseCount": number, "restBetweenSetsHint": string}`;

    try {
      const raw = await callGroqCompletion(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: `What I want: "${cleanDescription}"` }],
        0.6 // higher than extraction tasks — generating a program benefits from some real creative variation, not a single deterministic answer every time
      );
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Defensively drop any group name the model invented anyway,
      // rather than reject the whole program over one bad entry —
      // matches the same lenient-validation reasoning already used for
      // syllabus assignments elsewhere in this file.
      if (Array.isArray(parsed?.targetGroups)) {
        parsed.targetGroups = parsed.targetGroups.filter((g: unknown) => g === 'all' || VALID_EXERCISE_GROUPS.includes(g as any));
        if (!parsed.targetGroups.length) parsed.targetGroups = ['all'];
      }
      const validated = GeneratedProgramSchema.safeParse(parsed);
      if (!validated.success) {
        console.error('AvivaBrain: generateWorkoutProgram schema validation failed', validated.error.flatten());
        return null;
      }
      return validated.data;
    } catch (error) {
      console.error('AvivaBrain: generateWorkoutProgram failed', error);
      if (error instanceof GroqProxyError) this.lastErrorReason = error.reason;
      return null;
    }
  }

  /**
   * Transcribes a photo/screenshot of course material (a reading, slide,
   * handout) into plain text — for feeding into the Notes field, not
   * for structured extraction like parseSyllabusImage. Routed to
   * Groq's vision model the same way parseSyllabusImage is (api/groq.js
   * selects the model based on whether the request contains an image).
   */
  async transcribeImageToText(imageDataUrl: string): Promise<string | null> {
    this.lastErrorReason = null;
    if (!imageDataUrl?.startsWith('data:image/')) return null;

    // api/groq.js hardcodes response_format: json_object for every
    // request that goes through it — asking for a plain-text reply
    // here would conflict with that shared constraint, so this wraps
    // the transcription in a minimal JSON envelope instead.
    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: 'Transcribe all readable text from this image, in reading order, as plain text — no commentary, no markdown, no summarizing, just the text as it actually appears. If the image is blurry or partly unreadable, transcribe what you can. Respond with ONLY valid JSON, no markdown fences: {"text": string}',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe this image.' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ];

    try {
      const raw = await callGroqCompletion(messages, 0.1); // near-zero — transcription should be faithful, not creative
      if (!raw) return null;
      const validated = z.object({ text: z.string() }).safeParse(JSON.parse(raw));
      if (!validated.success) {
        console.error('AvivaBrain: transcribeImageToText schema validation failed', validated.error.flatten());
        return null;
      }
      return validated.data.text || null;
    } catch (error) {
      console.error('AvivaBrain: transcribeImageToText failed', error);
      if (error instanceof GroqProxyError) this.lastErrorReason = error.reason;
      return null;
    }
  }

  /**
   * Extracts assignments/exams/due dates from raw syllabus text. This
   * never writes anything on its own — callers get back a proposed
   * list for the person to review, edit, and explicitly confirm before
   * anything is added to their real courses/assignments, the same way
   * a brain dump is reviewed before becoming tasks. Syllabus text
   * routinely exceeds the sanitizer's MAX_PAYLOAD_LENGTH (8000 chars);
   * sanitizeString already truncates rather than erroring, so a very
   * long syllabus still gets a best-effort partial extraction instead
   * of failing outright — the caller surfaces that truncation to the
   * person rather than silently losing the tail of their document.
   */
  async parseSyllabus(syllabusText: string, todayIsoDate: string): Promise<SyllabusParseResult | null> {
    this.lastErrorReason = null;
    const cleanText = sanitizeString(syllabusText);
    if (!cleanText) return null;

    const systemPrompt = `You extract assignments, exams, quizzes, and due dates from a pasted college/school syllabus.
Only extract items that have or clearly imply an actual due date somewhere in the text — never invent one.
Resolve bare or relative dates (like "Oct 15", "Week 6", "the Friday before finals") into a real ISO date (YYYY-MM-DD) using the current date provided. If a date genuinely cannot be resolved to a real calendar date, do not invent one — omit that item instead of guessing.
Keep titles short and student-facing (e.g. "Midterm Exam", "Problem Set 3", "Research Paper Draft"), not the full syllabus sentence.
Respond with ONLY valid JSON, no markdown fences:
{"courseName": string|null, "assignments": [{"id": string, "title": string, "dueDate": string, "type": "homework"|"exam"|"quiz"|"project"|"paper"|"reading"|"other"}], "reasoning": string}`;

    const userPrompt = `Today's date: ${todayIsoDate}\n\nSyllabus text:\n"${cleanText}"`;

    try {
      const raw = await callGroqCompletion(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        0.2 // lower temperature — this is extraction, not generation, and dates need to be read faithfully rather than creatively
      );
      if (!raw) return null;
      return parseSyllabusResultLeniently(raw, 'parseSyllabus');
    } catch (error) {
      console.error('AvivaBrain: parseSyllabus failed', error);
      if (error instanceof GroqProxyError) this.lastErrorReason = error.reason;
      return null;
    }
  }

  /**
   * Same extraction as parseSyllabus, but from a photo/screenshot of a
   * syllabus instead of pasted text — routed automatically to Groq's
   * vision model by api/groq.js (which selects the model based on
   * whether the request actually contains an image, not from anything
   * the client specifies). Returns the identical SyllabusParseResult
   * shape, so the review/confirm UI already built for the text path
   * works unchanged regardless of which one produced it.
   */
  async parseSyllabusImage(imageDataUrl: string, todayIsoDate: string): Promise<SyllabusParseResult | null> {
    this.lastErrorReason = null;
    if (!imageDataUrl?.startsWith('data:image/')) return null;

    const systemPrompt = `You extract assignments, exams, quizzes, and due dates from a photo or screenshot of a school/college syllabus.
Only extract items that have or clearly imply an actual due date visible in the image — never invent one.
Resolve bare or relative dates (like "Oct 15", "Week 6") into a real ISO date (YYYY-MM-DD) using the current date provided. If a date genuinely cannot be resolved to a real calendar date, omit that item instead of guessing.
Keep titles short and student-facing (e.g. "Midterm Exam", "Problem Set 3"), not a full sentence copied from the page.
If the image is blurry, cut off, or you can't confidently read it, still return whatever you genuinely can read, and say so plainly in "reasoning".
Respond with ONLY valid JSON, no markdown fences:
{"courseName": string|null, "assignments": [{"id": string, "title": string, "dueDate": string, "type": "homework"|"exam"|"quiz"|"project"|"paper"|"reading"|"other"}], "reasoning": string}`;

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Today's date: ${todayIsoDate}. Extract the assignments and due dates from this syllabus image.` },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ];

    try {
      const raw = await callGroqCompletion(messages, 0.2);
      if (!raw) return null;
      return parseSyllabusResultLeniently(raw, 'parseSyllabusImage');
    } catch (error) {
      console.error('AvivaBrain: parseSyllabusImage failed', error);
      if (error instanceof GroqProxyError) this.lastErrorReason = error.reason;
      return null;
    }
  }
}

export const avivaBrain = new AvivaBrain();
