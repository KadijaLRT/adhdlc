export interface StuckPrompt {
  id: string;
  text: string;
  // Maps to the same helper ids collected on the emotional-regulation
  // onboarding screen (walking, music, breathing, quiet, journaling,
  // talking, body_doubling) — undefined for prompts that don't cleanly
  // fit any single category. Lets getRandomPrompt lead with whatever
  // the person actually said helps them, rather than a flat random
  // pick that ignores it entirely.
  helperTag?: string;
}

// Deliberately tiny, concrete, low-friction actions. No urgency, no
// "just" or "simply," no implied judgment about why the user is stuck.
export const STUCK_PROMPTS: StuckPrompt[] = [
  { id: 'water', text: 'Take a sip of water.' },
  { id: 'stretch', text: 'Stand up and stretch for ten seconds.' },
  { id: 'one-item', text: 'Put away one single item near you.' },
  { id: 'breath', text: 'Take three slow breaths.', helperTag: 'breathing' },
  { id: 'open-task', text: 'Open the task and read only its title.' },
  { id: 'timer-2', text: 'Set a two minute timer and just start.' },
  { id: 'clear-space', text: 'Clear one small area of your desk or table.' },
  { id: 'stand-window', text: 'Stand near a window for a moment.', helperTag: 'quiet' },
  { id: 'short-walk', text: 'Take a short walk, even just to the door and back.', helperTag: 'walking' },
  { id: 'play-song', text: 'Put on one song you like before starting.', helperTag: 'music' },
  { id: 'jot-line', text: 'Write one line about what\'s making this hard.', helperTag: 'journaling' },
  { id: 'text-someone', text: 'Tell one person what you\'re about to start.', helperTag: 'talking' },
];

/**
 * Bug fix: onboarding's emotional-regulation screen collects
 * emotionalRegulationHelpers and its own copy says "Shapes what
 * Overwhelmed Mode and Stuck Flow suggest first" — but this always
 * picked a flat random prompt with zero awareness of that answer.
 * When the person has picks and hasn't just been shown one of their
 * matching prompts, this weights toward one of those first; otherwise
 * (no picks, or their tagged prompts were just excluded/shown) it
 * falls back to the original flat random behavior across everything.
 */
export function getRandomPrompt(excludeId?: string, preferredHelpers?: string[]): StuckPrompt {
  const pool = excludeId ? STUCK_PROMPTS.filter((p) => p.id !== excludeId) : STUCK_PROMPTS;
  const fallback = STUCK_PROMPTS[0] || { id: 'water', text: 'Take a sip of water.' };
  if (preferredHelpers?.length) {
    const matching = pool.filter((p) => p.helperTag && preferredHelpers.includes(p.helperTag));
    if (matching.length) return matching[Math.floor(Math.random() * matching.length)] || fallback;
  }
  return pool[Math.floor(Math.random() * pool.length)] || fallback;
}
