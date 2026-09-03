// Mirrors the BRAIN_TYPES list in app/onboarding/braintype.tsx exactly
// (ids and traits) — extracted here so anything downstream (like
// AvivaBrain's context building) can resolve a person's saved
// brainTypes ids back to real trait text without re-declaring the
// list or importing a screen component just for its data.
export const BRAIN_TYPE_TRAITS: Record<string, string> = {
  inattentive_dreamer: 'Overthinking, Forgetfulness, Daydreaming',
  hyperactive_motor: 'Restlessness, Fidgeting, Impulsivity',
  visionary_creative: 'Creativity, Hyperfocus, Chaos',
  disorganized_explorer: 'Lost items, Time blindness, Scattered',
  multi_tasker: 'Easily distracted, Task-switching, Energy bursts',
  sensory_sensitive: 'Sensitivity, Overwhelm, Need for quiet',
  hyperfocused_achiever: 'Hyperfocus, Flow state, Tunnel vision',
  time_crunched_planner: 'Procrastination, Last minute, Stress',
  social_charmer: 'Talkative, Interrupting, Social energy',
  masked_regulator: 'Internal struggle, Coping strategies, Burnout',
  emotional_feeler: 'Intense emotions, Rejection sensitivity, Mood swings',
  combined_type: 'Mixed traits, Unpredictable, Adaptable',
};

export function resolveBrainTypeTraits(brainTypeIds: string[] | undefined): string[] {
  return (brainTypeIds || []).map((id) => BRAIN_TYPE_TRAITS[id]).filter((t): t is string => !!t);
}
