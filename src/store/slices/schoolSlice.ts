import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';

export type CourseStatus = 'in_progress' | 'completed' | 'failed' | 'retaking';

export interface GradeCategory {
  id: string;
  name: string; // e.g. "Homework", "Quizzes", "Exams"
  weightPercent: number; // 0-100, categories on a course are meant to sum to ~100 but this isn't enforced
}

export interface Course {
  id: string;
  name: string;
  emoji: string;
  currentGrade?: number; // 0-100
  gradeGoal?: number; // 0-100
  credits?: number; // credit hours, used for weighted GPA
  notes?: string;
  isCompleted?: boolean; // kept for backward compatibility with data saved before `status` existed
  status?: CourseStatus;
  gradeCategories?: GradeCategory[];
}

/** Reads status with a fallback to the older isCompleted boolean, for courses saved before status existed. */
export function getCourseStatus(course: Pick<Course, 'status' | 'isCompleted'>): CourseStatus {
  if (course.status) return course.status;
  return course.isCompleted ? 'completed' : 'in_progress';
}

export interface AssignmentSubStep {
  id: string;
  title: string;
  isComplete: boolean;
  suggestedDate?: string; // ISO date this step is spread onto
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string; // ISO date
  estimatedMinutes?: number;
  isComplete: boolean;
  subSteps: AssignmentSubStep[];
  categoryId?: string; // references a Course.gradeCategories entry
  score?: number; // 0-100, this assignment's own grade once graded
}

export interface SchoolState {
  courses: Course[];
  assignments: Assignment[];
  gradeLevel?: string; // for middle/high school age brackets
  programName?: string; // for college/adult age brackets
  universityName?: string;
  totalCreditsRequired?: number; // set by the user — how many credits their program/degree needs
}

export interface SchoolSlice extends SchoolState {
  addCourse: (course: Course) => Promise<void>;
  removeCourse: (id: string) => Promise<void>;
  addAssignment: (assignment: Assignment) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<Assignment>) => Promise<void>;
  updateCourse: (id: string, updates: Partial<Course>) => Promise<void>;
  toggleAssignmentComplete: (id: string) => Promise<void>;
  toggleAssignmentSubStep: (assignmentId: string, subStepId: string) => Promise<void>;
  removeAssignment: (id: string) => Promise<void>;
  setSchoolSetup: (setup: { gradeLevel?: string; programName?: string; universityName?: string; totalCreditsRequired?: number }) => Promise<void>;
}

const persist = createWriteGuard(async (state: SchoolState) => {
  const repo = await getRepository();
  await repo.saveSchoolState(state);
});

function currentState(get: () => SchoolState): SchoolState {
  return {
    courses: get().courses || [],
    assignments: get().assignments || [],
    gradeLevel: get().gradeLevel,
    programName: get().programName,
    universityName: get().universityName,
    totalCreditsRequired: get().totalCreditsRequired,
  };
}

export const createSchoolSlice: StateCreator<SchoolSlice> = (set, get) => ({
  courses: [],
  assignments: [],

  addCourse: async (course) => {
    const nextState = { ...currentState(get), courses: [...(get().courses || []), course] };
    set(nextState);
    await persist(nextState);
  },

  updateCourse: async (id, updates) => {
    const next = (get().courses || []).map((c) => (c.id === id ? { ...c, ...updates } : c));
    const nextState = { ...currentState(get), courses: next };
    set(nextState);
    await persist(nextState);
  },

  removeCourse: async (id) => {
    // Removing a course leaves its assignments in place (orphaned by
    // courseId) rather than silently deleting someone's work; the
    // screen filters them out of course views but they're not lost.
    const nextState = { ...currentState(get), courses: (get().courses || []).filter((c) => c.id !== id) };
    set(nextState);
    await persist(nextState);
  },

  addAssignment: async (assignment) => {
    const nextState = { ...currentState(get), assignments: [...(get().assignments || []), assignment] };
    set(nextState);
    await persist(nextState);
  },

  updateAssignment: async (id, updates) => {
    const next = (get().assignments || []).map((a) => (a.id === id ? { ...a, ...updates } : a));
    const nextState = { ...currentState(get), assignments: next };
    set(nextState);
    await persist(nextState);
  },

  toggleAssignmentComplete: async (id) => {
    const next = (get().assignments || []).map((a) => (a.id === id ? { ...a, isComplete: !a.isComplete } : a));
    const nextState = { ...currentState(get), assignments: next };
    set(nextState);
    await persist(nextState);
  },

  toggleAssignmentSubStep: async (assignmentId, subStepId) => {
    const next = (get().assignments || []).map((a) => {
      if (a.id !== assignmentId) return a;
      return { ...a, subSteps: (a.subSteps || []).map((s) => (s.id === subStepId ? { ...s, isComplete: !s.isComplete } : s)) };
    });
    const nextState = { ...currentState(get), assignments: next };
    set(nextState);
    await persist(nextState);
  },

  removeAssignment: async (id) => {
    const nextState = { ...currentState(get), assignments: (get().assignments || []).filter((a) => a.id !== id) };
    set(nextState);
    await persist(nextState);
  },

  setSchoolSetup: async (setup) => {
    const nextState = { ...currentState(get), ...setup };
    set(nextState);
    await persist(nextState);
  },
});
