import { z } from 'zod';
// @ts-ignore - plain JS by design, see file header.
import { sanitizeString, sanitizePayload } from './groqSanitizer';
import { callGroqCompletion, type GroqMessage } from './groqProxyClient';

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
      return null;
    }
  }
}

export const avivaBrain = new AvivaBrain();
