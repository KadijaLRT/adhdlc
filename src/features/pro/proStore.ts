import { create } from 'zustand';
import { loadProState, saveProState } from '@/core/storage/proStorage';
import type { ProPersistedState } from '@/core/storage/proStorageTypes';
import { registerAiAccessGate } from '@/core/ai/aiAccessGate';
import { useAppStore } from '@/store/index';
import { FREE_AI_PER_DAY, OFFLINE_GRACE_MS, REVALIDATE_AFTER_MS } from './proConfig';
import {
  EMPTY_PRO_STATE, applyRevalidation, canUseAi, needsRevalidation, withAiUseRecorded, type ServerVerdict,
} from './proLogic';
import { getPurchaseService } from './purchases';
import { sortOffers, type ProOffer } from './purchases/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const purchases = getPurchaseService();

type ActionResult = { ok: true } | { ok: false; reason: string };

interface ProStore extends ProPersistedState {
  isLoaded: boolean;
  paywallVisible: boolean;
  purchasesAvailable: boolean;
  offers: ProOffer[];
  offersLoading: boolean;
  load: () => Promise<void>;
  loadOffers: () => Promise<void>;
  buy: (offer: ProOffer) => Promise<ActionResult>;
  restore: () => Promise<ActionResult>;
  showPaywall: () => void;
  hidePaywall: () => void;
}

function persistedPart(s: ProStore): ProPersistedState {
  return { proToken: s.proToken, isPro: s.isPro, lastVerifiedAt: s.lastVerifiedAt, freeUsage: s.freeUsage };
}

/** Asks our server (which asks RevenueCat or Apple) whether this token is really Pro. */
async function askServer(proToken: string): Promise<ServerVerdict> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pro-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proToken }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.valid === true) return { kind: 'valid' };
    if (response.ok && data?.valid === false) return { kind: 'invalid', reason: String(data.reason || 'not_found') };
    return { kind: 'unknown', reason: String(data?.reason || 'unavailable') };
  } catch {
    return { kind: 'unknown', reason: 'unavailable' };
  }
}

function onboardingDone(): boolean {
  return !!useAppStore.getState().profile;
}

export const useProStore = create<ProStore>()((set, get) => {
  /**
   * The store (App Store via RevenueCat or StoreKit) says this person
   * just paid. Confirm with our server. If the server can't be reached,
   * trust the on-device store for now and re-check on the next launch.
   */
  async function grantFromStore(proToken: string): Promise<ActionResult> {
    const verdict = await askServer(proToken);
    const base = persistedPart(get());
    let next: ProPersistedState;
    if (verdict.kind === 'valid') {
      next = { ...base, proToken, isPro: true, lastVerifiedAt: Date.now() };
    } else if (verdict.kind === 'unknown') {
      next = { ...base, proToken, isPro: true, lastVerifiedAt: Date.now() - REVALIDATE_AFTER_MS - 1 };
    } else {
      return { ok: false, reason: verdict.reason };
    }
    set({ ...next, paywallVisible: false });
    await saveProState(next);
    return { ok: true };
  }

  return {
    ...EMPTY_PRO_STATE,
    isLoaded: false,
    paywallVisible: false,
    purchasesAvailable: purchases.available,
    offers: [],
    offersLoading: false,

    load: async () => {
      const stored = await loadProState();
      set({ ...EMPTY_PRO_STATE, ...(stored || {}), isLoaded: true });

      purchases.init((proToken) => {
        // Renewals, refunds-then-repurchase, or an interrupted purchase finishing.
        if (!get().isPro || get().proToken !== proToken) grantFromStore(proToken).catch(() => {});
      }).catch(() => {});

      // Quietly re-check once a day so refunds and ended subscriptions are picked up.
      const current = persistedPart(get());
      if (current.proToken && needsRevalidation(current, Date.now(), REVALIDATE_AFTER_MS)) {
        const verdict = await askServer(current.proToken);
        const next = applyRevalidation(persistedPart(get()), verdict, Date.now(), OFFLINE_GRACE_MS);
        set(next);
        await saveProState(next);
      }
    },

    loadOffers: async () => {
      if (!purchases.available) return;
      set({ offersLoading: true });
      const offers = await purchases.getOffers();
      set({ offers: sortOffers(offers), offersLoading: false });
    },

    buy: async (offer) => {
      const outcome = await purchases.purchase(offer);
      if (outcome.kind === 'success') return grantFromStore(outcome.proToken);
      if (outcome.kind === 'cancelled') return { ok: false, reason: 'cancelled' };
      if (outcome.kind === 'nothing_to_restore') return { ok: false, reason: 'nothing_to_restore' };
      return { ok: false, reason: outcome.reason };
    },

    restore: async () => {
      const outcome = await purchases.restore();
      if (outcome.kind === 'success') return grantFromStore(outcome.proToken);
      if (outcome.kind === 'nothing_to_restore') {
        // Nothing on this Apple ID: make sure a stale Pro flag isn't left on.
        const next = { ...persistedPart(get()), isPro: false };
        set(next);
        await saveProState(next);
        return { ok: false, reason: 'nothing_to_restore' };
      }
      if (outcome.kind === 'cancelled') return { ok: false, reason: 'cancelled' };
      return { ok: false, reason: outcome.reason };
    },

    showPaywall: () => set({ paywallVisible: true }),
    hidePaywall: () => set({ paywallVisible: false }),
  };
});

// Plug Pro into the AI client. Runs once, when this module is first
// imported (app/_layout.tsx imports it through ProPaywallModal).
registerAiAccessGate({
  canMakeRequest: () => {
    const s = useProStore.getState();
    if (!s.isLoaded) return true; // count not known yet; don't block
    return canUseAi(persistedPart(s), new Date(), FREE_AI_PER_DAY, onboardingDone());
  },
  proToken: () => {
    const s = useProStore.getState();
    return s.isPro ? s.proToken : null;
  },
  recordSuccess: () => {
    const s = useProStore.getState();
    const next = withAiUseRecorded(persistedPart(s), new Date(), onboardingDone());
    if (next.freeUsage !== s.freeUsage) {
      useProStore.setState({ freeUsage: next.freeUsage });
      saveProState(next).catch(() => {});
    }
  },
  onProRequired: () => useProStore.getState().showPaywall(),
});
