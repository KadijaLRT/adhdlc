export type ProOfferKind = 'monthly' | 'yearly' | 'lifetime';

export interface ProOffer {
  /** Provider-specific id used to buy it (RevenueCat package id or App Store product id). */
  id: string;
  kind: ProOfferKind;
  /** Localized price from the App Store, e.g. "$4.99". Never hard-coded. */
  priceLabel: string;
}

export type PurchaseOutcome =
  | { kind: 'success'; proToken: string }
  | { kind: 'cancelled' }
  | { kind: 'nothing_to_restore' }
  | { kind: 'error'; reason: 'store_error' | 'not_available' };

export interface PurchaseService {
  /** False on web (for now) and on platforms without App Store purchases. */
  readonly available: boolean;
  /**
   * Connects to the store. `onStorePurchase` is called for purchases the
   * store reports outside a tap on Buy (e.g. a renewal or an interrupted
   * purchase finishing on the next launch).
   */
  init(onStorePurchase: (proToken: string) => void): Promise<void>;
  getOffers(): Promise<ProOffer[]>;
  purchase(offer: ProOffer): Promise<PurchaseOutcome>;
  restore(): Promise<PurchaseOutcome>;
}

export const OFFER_ORDER: ProOfferKind[] = ['yearly', 'monthly', 'lifetime'];

export function sortOffers(offers: ProOffer[]): ProOffer[] {
  return [...offers].sort((a, b) => OFFER_ORDER.indexOf(a.kind) - OFFER_ORDER.indexOf(b.kind));
}
