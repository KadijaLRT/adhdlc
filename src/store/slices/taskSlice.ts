import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { Task } from './types';
import type { MilestoneSlice } from './milestoneSlice';
import type { RpgSlice } from './rpgSlice';

export interface TaskSlice {
  tasks: Task[];
  addTask: (task: Task) => Promise<void>;
  addTasks: (tasks: Task[]) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  toggleSubStep: (taskId: string, subStepId: string) => Promise<void>;
}

const persist = createWriteGuard(async (tasks: Task[]) => {
  const repo = await getRepository();
  await repo.saveTasks(tasks || []);
});

// Depends on MilestoneSlice for the completion-count side effect. This
// is the one cross-slice dependency in the store; every other slice is
// fully self-contained.
export const createTaskSlice: StateCreator<
  TaskSlice & MilestoneSlice & RpgSlice, [], [], TaskSlice
> = (set, get) => ({
  tasks: [],

  addTask: async (task) => {
    const next = [...(get().tasks || []), task];
    set({ tasks: next });
    await persist(next);
  },

  // Bulk variant for flows that add several tasks at once (e.g. a brain
  // dump parsed into N items). One state update and one persisted write
  // instead of N sequential ones — avoids N redundant full-array
  // serializations where every intermediate write is immediately
  // superseded by the next.
  addTasks: async (tasks) => {
    const next = [...(get().tasks || []), ...(tasks || [])];
    set({ tasks: next });
    await persist(next);
  },

  updateTask: async (id, updates) => {
    const next = (get().tasks || []).map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tasks: next });
    await persist(next);
  },

  removeTask: async (id) => {
    const next = (get().tasks || []).filter((t) => t.id !== id);
    set({ tasks: next });
    await persist(next);
  },

  toggleTaskComplete: async (id) => {
    const currentTasks = get().tasks || [];
    const task = currentTasks.find((t) => t.id === id);
    const willBeComplete = !task?.isComplete;
    // Previously fired on every complete transition, so
    // complete -> uncomplete -> complete awarded XP twice for the same
    // task. rewardedAt is set the first time credit is actually given
    // and checked here before giving it again — un-completing a task
    // never clears it, since there's no "take back XP" mechanic to
    // pair with that, it just prevents giving it a second time.
    const alreadyRewarded = !!task?.rewardedAt;

    const criticalBefore = currentTasks.filter((t) => t.priority === 'critical');
    const wasAllClearedBefore = criticalBefore.length > 0 && criticalBefore.every((t) => t.isComplete);

    const next = currentTasks.map((t) =>
      t.id === id
        ? { ...t, isComplete: willBeComplete, rewardedAt: willBeComplete && !alreadyRewarded ? new Date().toISOString() : t.rewardedAt }
        : t
    );
    set({ tasks: next });
    await persist(next);

    if (willBeComplete && !alreadyRewarded) {
      await get().incrementMilestone('task_completed');
      await get().awardProgress('organization', 10, 5);
    }

    // A "cleared the critical tasks" milestone fires only on the
    // transition into fully-cleared, never repeatedly for an already
    // cleared day, and never if there were no critical tasks to begin with.
    const criticalAfter = next.filter((t) => t.priority === 'critical');
    const isAllClearedAfter = criticalAfter.length > 0 && criticalAfter.every((t) => t.isComplete);
    if (isAllClearedAfter && !wasAllClearedBefore) {
      await get().incrementMilestoneOnce('critical_tasks_cleared_today');
    }
  },

  toggleSubStep: async (taskId, subStepId) => {
    const next = (get().tasks || []).map((t) => {
      if (t.id !== taskId) return t;
      return { ...t, subSteps: (t.subSteps || []).map((s) => (s.id === subStepId ? { ...s, isComplete: !s.isComplete } : s)) };
    });
    set({ tasks: next });
    await persist(next);
  },
});
