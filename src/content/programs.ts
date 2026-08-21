export interface ProgramDefinition {
  id: string;
  title: string;
  emoji: string;
  forWhom: string;
  daysPerWeek: number;
  durationWeeks: number;
  targetGroups: string[]; // 'all' matches every exercise group
  sessionExerciseCount: number;
  restBetweenSetsHint: string;
}

// Deliberately 7, matching the document, and deliberately small each —
// choosing a program should never itself become a new decision-paralysis
// point.
export const PROGRAMS: ProgramDefinition[] = [
  { id: 'beginner-strength', title: 'Beginner Strength', emoji: '🏋️', forWhom: 'New to lifting, want a simple starting point', daysPerWeek: 3, durationWeeks: 4, targetGroups: ['all'], sessionExerciseCount: 5, restBetweenSetsHint: 'Take the full rest — form matters more than speed right now.' },
  { id: 'fat-loss', title: 'Fat Loss', emoji: '🔥', forWhom: 'Want higher-rep, higher-effort sessions', daysPerWeek: 4, durationWeeks: 6, targetGroups: ['all'], sessionExerciseCount: 5, restBetweenSetsHint: 'Shorter rest is fine here if it feels okay.' },
  { id: 'muscle-building', title: 'Muscle Building', emoji: '💪', forWhom: 'Want to build size and strength over time', daysPerWeek: 4, durationWeeks: 8, targetGroups: ['all'], sessionExerciseCount: 5, restBetweenSetsHint: "Full rest between sets. Aim to stop with a couple reps still in the tank, not full failure — that builds just as much with less fatigue." },
  { id: 'endurance', title: 'Endurance', emoji: '🏃', forWhom: 'Want more reps and stamina, not maximal weight', daysPerWeek: 3, durationWeeks: 6, targetGroups: ['all'], sessionExerciseCount: 5, restBetweenSetsHint: 'Keep rest short, focus on steady breathing.' },
  { id: 'mobility', title: 'Mobility', emoji: '🧘', forWhom: 'Want to move better and feel less stiff', daysPerWeek: 3, durationWeeks: 4, targetGroups: ['all'], sessionExerciseCount: 3, restBetweenSetsHint: 'No rush. Rest as long as you want.' },
  { id: 'desk-worker-relief', title: 'Desk Worker Relief', emoji: '🪑', forWhom: 'Sit most of the day and want to counteract it', daysPerWeek: 5, durationWeeks: 4, targetGroups: ['glutes', 'hamstrings'], sessionExerciseCount: 3, restBetweenSetsHint: 'Short sessions on purpose — this fits in a break.' },
  { id: 'adhd-quick-energy', title: 'ADHD Quick Energy', emoji: '🧠', forWhom: 'Need a fast energy reset, not a full workout', daysPerWeek: 7, durationWeeks: 4, targetGroups: ['all'], sessionExerciseCount: 2, restBetweenSetsHint: "Short and done. That's the whole point." },
];

/**
 * The single place that looks across both program sources: the
 * static, shipped PROGRAMS above, and any AI-generated custom
 * programs (customProgramSlice.ts) a person has created. Every screen
 * that needs to resolve a program by id uses this instead of checking
 * PROGRAMS directly, so a generated program works identically to a
 * built-in one everywhere it's looked up.
 */
export function getProgramById(id: string | null, customPrograms: ProgramDefinition[]): ProgramDefinition | null {
  if (!id) return null;
  return PROGRAMS.find((p) => p.id === id) || customPrograms.find((p) => p.id === id) || null;
}
