export type EnergyLevel = 'low' | 'medium' | 'high';
export type ThemeMode = 'dark' | 'dim';
export type BodyDoublingRoom = 'eat' | 'work' | 'gym' | null;
export type BloodType = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
export type TaskPriority = 'critical' | 'important' | 'nice';
export type TaskCategory = 'home' | 'work' | 'school' | 'health' | 'errands' | 'adhd' | 'general';
// PINCH: what the ADHD brain actually finds compelling enough to get
// activated (Dodson's "interest-based nervous system"), separate from
// priority/category which are about what matters, not what motivates.
// Multiple can apply to one task — Play and Novelty often overlap.
export type MotivatorTag = 'play' | 'interest' | 'novelty' | 'connection' | 'urgency';

export interface SubStep { id: string; title: string; isComplete: boolean; }
export interface Task {
  id: string; title: string; notes?: string; isComplete: boolean;
  estimatedMinutes?: number; realMinutes?: number; energyRequired: EnergyLevel;
  createdAt: string; scheduledFor?: string; subSteps: SubStep[];
  priority?: TaskPriority; category?: TaskCategory; motivators?: MotivatorTag[];
  // Set the first time this task is marked complete and XP/milestone
  // credit is actually given — checked before awarding again, so
  // toggling complete -> incomplete -> complete repeatedly can't farm
  // XP for the same task over and over. Uncompleting a task never
  // clears this: the credit already given isn't retracted (there's no
  // "take back XP" mechanic anywhere in this app), it just isn't given
  // again.
  rewardedAt?: string;
}
export interface RoutineStreak {
  routineId: string; count: number; lastCompletedDate: string | null;
  freezesAvailable: number; isFrozen: boolean;
}
export type MilestoneEvent = 'task_completed' | 'stuck_flow_used' | 'body_doubling_session' | 'routine_completed' | 'focus_session_completed' | 'critical_tasks_cleared_today';
// lastTriggeredDate is optional and only meaningful for events that
// are supposed to be date-scoped (currently just
// critical_tasks_cleared_today, whose own name promises "today" but
// had nothing tracking what day it last fired — uncompleting then
// re-completing the last critical task could trigger it repeatedly in
// the same day). Events like task_completed/routine_completed are
// meant to increment every single time and never set this field.
export interface MilestoneProgress { trackedEvent: MilestoneEvent; count: number; lastTriggeredDate?: string; }
export interface EnergyLogEntry { date: string; energyLevel: EnergyLevel; note?: string; }
export interface StressLogEntry { date: string; stressLevel: EnergyLevel; }
export interface CycleLogEntry {
  date: string; phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unspecified'; note?: string;
}
export interface CannabisSessionEntry {
  id: string;
  date: string; // YYYY-MM-DD
  strain: string;
  type: 'sativa' | 'indica' | 'hybrid';
  effects: string[];
  mood: number; // -2..2
}
export interface WellnessPreferences {
  bloodTypeEnabled: boolean; bloodType: BloodType | null; cannabisModuleEnabled: boolean;
  weedLog?: CannabisSessionEntry[];
}
export type ReminderStyle = 'consequence' | 'loud' | 'gentle';
export type CoachingStyle = 'gentle' | 'funny' | 'reality_check' | 'friend' | 'scientific';
export type AgeBracket = 'middle_school' | 'high_school' | 'college' | 'adult' | 'midlife_adult' | 'senior';

export interface UserProfile {
  timezone: string; energyBaseline: EnergyLevel; stressThreshold: EnergyLevel;
  biggestHurdle: string; onboardingCompletedAt: string;
  displayName?: string; ageBracket?: AgeBracket;
  selectedModules?: string[];
  adhdSymptoms?: string[]; brainTypes?: string[];
  supportMethods?: string[]; priorities?: string[];
  reminderStyle?: ReminderStyle; coachingStyle?: CoachingStyle;
  sleepStruggles?: string[];
  wantsMedicationReminders?: boolean;
  emotionalRegulationHelpers?: string[];
}

export interface RoutineStep {
  id: string;
  text: string;
  durationMinutes?: number; // when set, the guided runner counts down this step instead of just waiting for a tap
}
export interface Routine {
  id: string;
  title: string;
  emoji: string;
  createdAt: string;
  // Optional checklist within the routine (e.g. Morning Routine: "Wake
  // up + hydrate", "Medications", "Eat breakfast"...). Routines without
  // steps stay simple single-tap-done, unchanged from before.
  steps?: RoutineStep[];
  // Which steps are checked off, and for which date — compared against
  // today at render time rather than storing a separate per-day log, so
  // an old date's checked steps naturally read as "not done today"
  // without any explicit daily reset logic.
  stepCompletionDate?: string;
  completedStepIds?: string[];
}
