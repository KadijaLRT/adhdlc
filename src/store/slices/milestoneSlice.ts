import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { MilestoneEvent, MilestoneProgress } from './types';

export interface MilestoneSlice {
  milestones: MilestoneProgress[];
  incrementMilestone: (event: MilestoneEvent) => Promise<void>;
  incrementMilestoneOnce: (event: MilestoneEvent) => Promise<void>;
}

const persist = createWriteGuard(async (milestones: MilestoneProgress[]) => {
  const repo = await getRepository();
  await repo.saveMilestones(milestones);
});

function today(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export const createMilestoneSlice: StateCreator<MilestoneSlice> = (set, get) => ({
  milestones: [],

  incrementMilestone: async (event) => {
    const existing = (get().milestones || []).find((m) => m.trackedEvent === event);
    const next = existing
      ? (get().milestones || []).map((m) => (m.trackedEvent === event ? { ...m, count: m.count + 1 } : m))
      : [...(get().milestones || []), { trackedEvent: event, count: 1 }];
    set({ milestones: next });
    await persist(next);
  },

  // Same as incrementMilestone, but only actually increments once per
  // calendar day — for an event whose own name promises "today"
  // (critical_tasks_cleared_today), toggling the last critical task
  // off and back on shouldn't be able to trigger it again in the same
  // day.
  incrementMilestoneOnce: async (event) => {
    const todayStr = today();
    const existing = (get().milestones || []).find((m) => m.trackedEvent === event);
    if (existing?.lastTriggeredDate === todayStr) return; // already fired today — no-op

    const next = existing
      ? (get().milestones || []).map((m) => (m.trackedEvent === event ? { ...m, count: m.count + 1, lastTriggeredDate: todayStr } : m))
      : [...(get().milestones || []), { trackedEvent: event, count: 1, lastTriggeredDate: todayStr }];
    set({ milestones: next });
    await persist(next);
  },
});
