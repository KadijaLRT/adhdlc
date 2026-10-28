import { resolveRestrictions } from '@/content/restrictions';
import { WORKOUT_EXERCISES } from '@/content/exercises';

const KIND_WORDS: Record<string, string> = {
  plyo: 'jumping and high-impact moves',
  olympic: 'explosive Olympic-style lifts',
};
const MAX_MOVES = 14;

/**
 * A short plain-text note about a person's saved injuries and weak spots, for
 * the AI prompts. Built only from the app's own fixed list, never from typed
 * text, so nothing a person typed can reach the prompt through here. Returns
 * undefined when there is nothing to say, so callers can pass it straight through.
 */
export function buildRestrictionBrief(ids: readonly string[] | null | undefined): string | undefined {
  const restrictions = resolveRestrictions(ids);
  if (restrictions.length === 0) return undefined;

  const labels = restrictions.map((r) => r.label);
  const kinds = new Set<string>();
  const moves = new Set<string>();
  for (const r of restrictions) {
    for (const k of r.avoid.kinds) if (KIND_WORDS[k]) kinds.add(KIND_WORDS[k]!);
    for (const id of r.avoid.ids) {
      const name = WORKOUT_EXERCISES?.[id]?.name;
      if (name) moves.add(name);
    }
  }
  const shownMoves = Array.from(moves).slice(0, MAX_MOVES);
  const parts = [`Saved physical restrictions: ${labels.join(', ')}.`];
  if (kinds.size > 0) parts.push(`Often aggravating: ${Array.from(kinds).join(', ')}.`);
  if (shownMoves.length > 0) parts.push(`Moves that often bother these areas include: ${shownMoves.join(', ')}.`);
  return parts.join(' ');
}

/** Prompt text for any agent that talks about movement. Empty string when there is no brief. */
export function restrictionPromptLine(brief: string | undefined): string {
  if (!brief) return '';
  return `${brief} Never suggest a move that commonly aggravates these. Prefer gentle, low-impact alternatives and the targeted strengthening the app already offers. You are not a clinician: do not diagnose, and for pain that is sharp, lasting or comes with numbness or swelling, suggest seeing a doctor or physical therapist.`;
}
