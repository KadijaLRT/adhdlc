import {
  finishTransaction, fetchProducts, getAvailablePurchases, initConnection, isUserCancelledError,
  purchaseErrorListener, purchaseUpdatedListener, requestPurchase, restorePurchases,
  type Purchase,
} from 'expo-iap';
import { PRODUCT_IDS } from '../proConfig';
import type { ProOffer, ProOfferKind, PurchaseOutcome, PurchaseService } from './types';

/**
 * Direct StoreKit 2 purchases (via expo-iap), no third party. The "pro
 * token" is the purchase's original transaction ID; our server checks
 * it with Apple's App Store Server API.
 */

const KIND_BY_PRODUCT: Record<string, ProOfferKind> = {
  [PRODUCT_IDS.monthly]: 'monthly',
  [PRODUCT_IDS.yearly]: 'yearly',
  [PRODUCT_IDS.lifetime]: 'lifetime',
};

let connected = false;
let pending: { productId: string; resolve: (o: PurchaseOutcome) => void } | null = null;

function tokenFor(purchase: Purchase): string {
  const p = purchase as Purchase & { originalTransactionIdentifierIOS?: string | null };
  return p.originalTransactionIdentifierIOS || purchase.id;
}

function isOurs(purchase: Purchase): boolean {
  return purchase.productId in KIND_BY_PRODUCT;
}

export const appleService: PurchaseService = {
  available: true,

  async init(onStorePurchase) {
    if (connected) return;
    try {
      await initConnection();
      connected = true;
    } catch (error) {
      console.error('appleService: initConnection failed', error);
      return;
    }

    purchaseUpdatedListener(async (purchase: Purchase) => {
      if (!isOurs(purchase)) return;
      const proToken = tokenFor(purchase);
      // Pro is a non-consumable / subscription: finishing just tells StoreKit we've delivered it.
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch (error) {
        console.error('appleService: finishTransaction failed', error);
      }
      if (pending && pending.productId === purchase.productId) {
        pending.resolve({ kind: 'success', proToken });
        pending = null;
      } else {
        onStorePurchase(proToken);
      }
    });

    purchaseErrorListener((error) => {
      if (!pending) return;
      pending.resolve(isUserCancelledError(error) ? { kind: 'cancelled' } : { kind: 'error', reason: 'store_error' });
      pending = null;
    });
  },

  async getOffers() {
    if (!connected) return [];
    const offers: ProOffer[] = [];
    try {
      const subs = (await fetchProducts({ skus: [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly], type: 'subs' })) || [];
      const lifetime = (await fetchProducts({ skus: [PRODUCT_IDS.lifetime], type: 'in-app' })) || [];
      for (const product of [...subs, ...lifetime]) {
        const kind = KIND_BY_PRODUCT[product.id];
        if (kind) offers.push({ id: product.id, kind, priceLabel: product.displayPrice });
      }
    } catch (error) {
      console.error('appleService: fetchProducts failed', error);
    }
    return offers;
  },

  purchase(offer) {
    if (!connected) return Promise.resolve<PurchaseOutcome>({ kind: 'error', reason: 'store_error' });
    return new Promise<PurchaseOutcome>((resolve) => {
      pending = { productId: offer.id, resolve };
      const request = { apple: { sku: offer.id } };
      const started = offer.kind === 'lifetime'
        ? requestPurchase({ request, type: 'in-app' })
        : requestPurchase({ request, type: 'subs' });
      Promise.resolve(started).catch((error: unknown) => {
        if (!pending) return;
        pending.resolve(isUserCancelledError(error) ? { kind: 'cancelled' } : { kind: 'error', reason: 'store_error' });
        pending = null;
      });
    });
  },

  async restore(): Promise<PurchaseOutcome> {
    if (!connected) return { kind: 'error', reason: 'store_error' };
    try {
      await restorePurchases();
      const purchases = (await getAvailablePurchases()) || [];
      const ours = purchases.filter(isOurs);
      // Prefer lifetime, then the newest subscription.
      ours.sort((a, b) => (KIND_BY_PRODUCT[a.productId] === 'lifetime' ? -1 : 0) - (KIND_BY_PRODUCT[b.productId] === 'lifetime' ? -1 : 0)
        || (b.transactionDate || 0) - (a.transactionDate || 0));
      const best = ours[0];
      if (!best) return { kind: 'nothing_to_restore' };
      return { kind: 'success', proToken: tokenFor(best) };
    } catch (error) {
      console.error('appleService: restore failed', error);
      return { kind: 'error', reason: 'store_error' };
    }
  },
};
