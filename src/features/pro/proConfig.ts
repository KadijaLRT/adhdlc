/**
 * Everything you'd want to tweak about Pro lives here or in env vars.
 * EXPO_PUBLIC_* values are baked into the app at build time, so they
 * must never hold secrets. (A RevenueCat *public* iOS key is designed
 * to ship inside apps; the *secret* key only goes on the server.)
 */

export type PurchaseProvider = 'revenuecat' | 'apple';

/** Must match PURCHASE_PROVIDER on the server. */
export const PURCHASE_PROVIDER: PurchaseProvider =
  process.env.EXPO_PUBLIC_PURCHASE_PROVIDER === 'apple' ? 'apple' : 'revenuecat';

/** RevenueCat public Apple API key (starts with "appl_"). Only used when PURCHASE_PROVIDER is revenuecat. */
export const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';

/** RevenueCat entitlement that means "Pro". */
export const REVENUECAT_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'pro';

/** App Store Connect product IDs. Create these exact IDs in App Store Connect. */
export const PRODUCT_IDS = {
  monthly: process.env.EXPO_PUBLIC_IAP_MONTHLY_ID || 'aviva_pro_monthly',
  yearly: process.env.EXPO_PUBLIC_IAP_YEARLY_ID || 'aviva_pro_yearly',
  lifetime: process.env.EXPO_PUBLIC_IAP_LIFETIME_ID || 'aviva_pro_lifetime',
};

/** Required on the paywall by App Store Review Guideline 3.1.2. */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '';
/** Apple's standard license agreement, unless you write your own. */
export const TERMS_OF_USE_URL = process.env.EXPO_PUBLIC_TERMS_URL || 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Optional: your App Store link, shown to web users ("Get Pro in the iPhone app"). */
export const APP_STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL || '';

function parseFreeLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

/** Free AI requests per day before the upgrade screen appears. */
export const FREE_AI_PER_DAY = parseFreeLimit(process.env.EXPO_PUBLIC_FREE_AI_PER_DAY);

/** Re-check Pro with the server this often (catches refunds and ended subscriptions). */
export const REVALIDATE_AFTER_MS = 24 * 60 * 60 * 1000;

/** If the server can't be reached, keep Pro working offline for this long since the last good check. */
export const OFFLINE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

export const PRO_BENEFITS: { emoji: string; title: string; body: string }[] = [
  { emoji: '🧠', title: 'Unlimited Aviva', body: 'Brain dumps, task breakdowns and coaching whenever you need them, with no daily limit.' },
  { emoji: '📚', title: 'Syllabus scanner', body: 'Snap or upload a syllabus and get every assignment and due date pulled out for you.' },
  { emoji: '🍽️', title: 'AI meal plans and recipes', body: 'Weekly meal plans and recipes built around what you like and what you avoid.' },
  { emoji: '🏋️', title: 'Custom workout programs', body: 'Programs written around your equipment, energy and any injuries you have.' },
  { emoji: '💛', title: 'Support an indie app', body: 'Everything else in the app stays free. Pro keeps the AI running.' },
];
