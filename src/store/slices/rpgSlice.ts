import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import type { SkillId } from '@/content/rpgCatalog';

export interface RpgState {
  totalXp: number;
  coins: number;
  skillXp: Record<SkillId, number>;
  ownedUnlockables: string[];
}

export interface RpgSlice extends RpgState {
  awardProgress: (skill: SkillId, xp: number, coins: number) => Promise<void>;
  purchaseUnlockable: (id: string, cost: number) => Promise<boolean>;
}

const DEFAULT_STATE: RpgState = {
  totalXp: 0,
  coins: 0,
  skillXp: { focus: 0, organization: 0, sleep: 0, nutrition: 0, exercise: 0, confidence: 0 },
  ownedUnlockables: [],
};

const persist = createWriteGuard(async (state: RpgState) => {
  const repo = await getRepository();
  await repo.saveRpgState(state);
});

// Only ever goes up. No penalty path, no XP loss — purely additive
// progression, matching the forgiving-systems rule everywhere else.
export const createRpgSlice: StateCreator<RpgSlice> = (set, get) => ({
  ...DEFAULT_STATE,

  awardProgress: async (skill, xp, coins) => {
    const currentSkillXp = get().skillXp || DEFAULT_STATE.skillXp;
    const nextState: RpgState = {
      totalXp: (get().totalXp || 0) + (xp || 0),
      coins: (get().coins || 0) + (coins || 0),
      skillXp: { ...currentSkillXp, [skill]: (currentSkillXp[skill] || 0) + (xp || 0) },
      ownedUnlockables: get().ownedUnlockables || [],
    };
    set(nextState);
    await persist(nextState);
  },

  purchaseUnlockable: async (id, cost) => {
    // The current catalog only ever passes a positive cost, but this
    // guards the action itself rather than relying on that staying
    // true forever — a negative cost would otherwise pass the balance
    // check below unconditionally (any real balance is >= a negative
    // number) and coins - cost would add coins instead of spending
    // them.
    if (!Number.isFinite(cost) || cost < 0) return false;
    const owned = get().ownedUnlockables || [];
    if (owned.includes(id)) return true;
    if ((get().coins || 0) < cost) return false;
    const nextState: RpgState = {
      totalXp: get().totalXp || 0,
      coins: (get().coins || 0) - cost,
      skillXp: get().skillXp || DEFAULT_STATE.skillXp,
      ownedUnlockables: [...owned, id],
    };
    set(nextState);
    await persist(nextState);
    return true;
  },
});
