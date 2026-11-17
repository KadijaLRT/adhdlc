/**
 * Pure decision logic for Pro, with no React, storage or network, so
 * it can be tested on its own (see scripts/testPro.mjs).
 */
import type { ProPersistedState } from '@/core/storage/proStorageTypes';

export const EMPTY_PRO_STATE: ProPersistedState = {
  proToken: null,
  isPro: false,
  lastVerifiedAt: null,
  freeUsage: { date: '', count: 0 },
};

export function localDateKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Free AI requests already used today (a new day starts back at 0). */
export function usedToday(state: ProPersistedState, now: Date): number {
  return state.freeUsage.date === localDateKey(now) ? state.freeUsage.count : 0;
}

export function remainingFreeToday(state: ProPersistedState, now: Date, freePerDay: number): number {
  return Math.max(0, freePerDay - usedToday(state, now));
}

/**
 * Whether one more AI request is allowed right now.
 * `onboardingDone` is false while the person is still setting up the
 * app; AI used during setup is never counted or blocked, so nobody hits
 * a paywall before they've even seen the app.
 */
export function canUseAi(state: ProPersistedState, now: Date, freePerDay: number, onboardingDone: boolean): boolean {
  if (state.isPro || !onboardingDone) return true;
  return usedToday(state, now) < freePerDay;
}

/** Counts one successful free AI request. Pro and onboarding use is not counted. */
export function withAiUseRecorded(state: ProPersistedState, now: Date, onboardingDone: boolean): ProPersistedState {
  if (state.isPro || !onboardingDone) return state;
  const date = localDateKey(now);
  const count = state.freeUsage.date === date ? state.freeUsage.count + 1 : 1;
  return { ...state, freeUsage: { date, count } };
}

export function needsRevalidation(state: ProPersistedState, nowMs: number, revalidateAfterMs: number): boolean {
  if (!state.proToken) return false;
  return !state.lastVerifiedAt || nowMs - state.lastVerifiedAt > revalidateAfterMs;
}

export type ServerVerdict =
  | { kind: 'valid' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'unknown'; reason: string }; // couldn't reach the server, or it couldn't reach RevenueCat or Apple

/** What the stored state becomes after a background re-check. */
export function applyRevalidation(state: ProPersistedState, verdict: ServerVerdict, nowMs: number, offlineGraceMs: number): ProPersistedState {
  if (verdict.kind === 'valid') return { ...state, isPro: true, lastVerifiedAt: nowMs };
  if (verdict.kind === 'invalid') return { ...state, isPro: false };
  // Unknown: keep Pro during the grace period, then ask for a fresh check.
  const lastOk = state.lastVerifiedAt || 0;
  if (state.isPro && nowMs - lastOk > offlineGraceMs) return { ...state, isPro: false };
  return state;
}

export function describeProProblem(reason: string): string {
  switch (reason) {
    case 'cancelled':
      return '';
    case 'nothing_to_restore':
      return "We didn't find a Pro purchase on this Apple ID. If you bought Pro with a different Apple ID, sign in with that one and try again.";
    case 'not_found':
      return "We couldn't confirm a Pro purchase. If you were charged, tap Restore Purchases.";
    case 'refunded':
      return 'This purchase was refunded, so Pro is off.';
    case 'ended':
      return 'Your Pro subscription has ended. Subscribe again any time to turn it back on.';
    case 'payment_failed':
      return "Apple couldn't renew your subscription. Check your payment method in Settings > Apple ID > Payment, then tap Restore Purchases.";
    case 'not_available':
      return 'Purchases are only available in the iPhone app right now.';
    case 'store_error':
      return "The App Store didn't respond. Check your connection and try again.";
    case 'rate_limited':
      return 'Too many tries in a row. Wait a minute and try again.';
    case 'not_configured':
      return "Purchases aren't set up on the server yet (see .env.example).";
    default:
      return "Couldn't confirm your purchase right now. Check your connection and try again, or tap Restore Purchases.";
  }
}
