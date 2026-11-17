export interface ProPersistedState {
  /** RevenueCat App User ID, or Apple original transaction ID, depending on PURCHASE_PROVIDER. */
  proToken: string | null;
  isPro: boolean;
  /** Epoch ms of the last time the server confirmed the purchase. */
  lastVerifiedAt: number | null;
  /** Free-tier AI use, counted per local calendar day. */
  freeUsage: { date: string; count: number };
}
