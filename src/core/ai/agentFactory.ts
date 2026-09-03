import { z } from 'zod';
// @ts-ignore - plain JS by design
import { sanitizeString, sanitizePayload } from './groqSanitizer';
import { callGroqCompletion } from './groqProxyClient';

export const AgentResponseSchema = z.object({
  message: z.string(),
  reasoning: z.string(),
  suggestedNextStep: z.string().optional(),
});
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export interface AgentConfig {
  id: string;
  label: string;
  systemPrompt: string;
}

export interface AgentContext {
  energyLevel: 'low' | 'medium' | 'high';
  isOverwhelmed: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  recentReflection?: string; // the person's own most recent evening check-in note, so Aviva can actually reference it instead of it sitting unread
  // Bug fix: onboarding's final screen collects this and its own copy
  // literally says "This shapes Aviva's tone in every conversation" —
  // but nothing downstream ever read it, so every conversation got the
  // exact same tone regardless of what was chosen. Optional so every
  // existing call site (and anyone who skipped that onboarding
  // question) keeps working unchanged.
  coachingStyle?: 'gentle' | 'funny' | 'reality_check' | 'friend' | 'scientific';
  brainTypeTraits?: string[];
}

const COACHING_STYLE_INSTRUCTIONS: Record<NonNullable<AgentContext['coachingStyle']>, string> = {
  gentle: 'Tone: gentle and supportive. Soft language, no pressure, warmth over directness.',
  funny: 'Tone: light and funny where it fits naturally. Humor should never undercut genuinely serious moments.',
  reality_check: 'Tone: direct and matter-of-fact. Skip the cushioning — say the real thing plainly, still kindly.',
  friend: 'Tone: like a close, casual friend talking it through with them, not a formal coach.',
  scientific: "Tone: grounded in the actual mechanism when it's relevant (e.g. briefly why a technique works for ADHD brains), still plain-language and concrete.",
};

/**
 * One factory backs every agent persona, so adding a 10th agent later
 * means one config entry, not one new file. Every agent shares the same
 * sanitization and schema-validation guarantees as AvivaBrain.
 */
export function createAgent(config: AgentConfig) {
  return {
    id: config.id,
    label: config.label,
    async ask(userMessage: string, context: AgentContext): Promise<AgentResponse | null> {
      const cleanMessage = sanitizeString(userMessage);
      if (!cleanMessage) return null;
      const cleanContext = sanitizePayload(context) as AgentContext;

      const fullSystemPrompt = `${config.systemPrompt}
Never use guilt, urgency, or shaming language. Keep responses short and concrete.
${cleanContext.coachingStyle ? COACHING_STYLE_INSTRUCTIONS[cleanContext.coachingStyle] : ''}
${cleanContext.brainTypeTraits?.length ? `This person identifies with these ADHD traits: ${cleanContext.brainTypeTraits.join(', ')}. Let this inform your approach where relevant, without labeling or diagnosing them back.` : ''}
If a recent reflection note is provided, you may reference it naturally if it's relevant to what the person is asking — but never quote it back verbatim or make it the focus unless they bring it up themselves.
Respond with ONLY valid JSON, no markdown fences:
{"message": string, "reasoning": string, "suggestedNextStep": string}`;

      const userPrompt = `User message: "${cleanMessage}"
Energy: ${cleanContext.energyLevel}
Overwhelmed: ${cleanContext.isOverwhelmed}
Time of day: ${cleanContext.timeOfDay}${cleanContext.recentReflection ? `\nTheir most recent evening reflection: "${cleanContext.recentReflection}"` : ''}`;

      try {
        const raw = await callGroqCompletion(
          [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: userPrompt },
          ],
          0.5
        );
        if (!raw) return null;
        const validated = AgentResponseSchema.safeParse(JSON.parse(raw));
        if (!validated.success) {
          console.error(`agent[${config.id}]: schema validation failed`, validated.error.flatten());
          return null;
        }
        return validated.data;
      } catch (error) {
        console.error(`agent[${config.id}]: request failed`, error);
        return null;
      }
    },
  };
}
