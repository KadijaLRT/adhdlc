import Purchases, { PACKAGE_TYPE, PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_ENTITLEMENT_ID, REVENUECAT_IOS_API_KEY } from '../proConfig';
import type { ProOffer, ProOfferKind, PurchaseOutcome, PurchaseService } from './types';

/**
 * RevenueCat handles the App Store receipt, renewals and refunds. The
 * "pro token" we hand to our server is RevenueCat's App User ID; the
 * server asks RevenueCat (with the secret key) whether that user has the
 * "pro" entitlement.
 *
 * In the RevenueCat dashboard, the current Offering should contain the
 * Monthly, Annual and Lifetime packages, all attached to the "pro"
 * entitlement.
 */

let configured = false;
const packagesById = new Map<string, PurchasesPackage>();

function kindFor(pkg: PurchasesPackage): ProOfferKind | null {
  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return 'monthly';
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return 'yearly';
  if (pkg.packageType === PACKAGE_TYPE.LIFETIME) return 'lifetime';
  return null;
}

function hasPro(info: CustomerInfo): boolean {
  return !!info.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
}

function isCancel(error: unknown): boolean {
  const e = error as { userCancelled?: boolean | null; code?: string } | null;
  return !!e && (e.userCancelled === true || e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR);
}

export const revenueCatService: PurchaseService = {
  available: true,

  async init(onStorePurchase) {
    if (configured) return;
    if (!REVENUECAT_IOS_API_KEY) {
      console.error('revenueCatService: EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set');
      return;
    }
    Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
    configured = true;
    // Fires on launch and whenever RevenueCat learns of a change (renewal, refund, purchase on another device).
    Purchases.addCustomerInfoUpdateListener(async (info) => {
      if (hasPro(info)) onStorePurchase(await Purchases.getAppUserID());
    });
  },

  async getOffers() {
    if (!configured) return [];
    try {
      const offerings = await Purchases.getOfferings();
      const offers: ProOffer[] = [];
      packagesById.clear();
      for (const pkg of offerings.current?.availablePackages || []) {
        const kind = kindFor(pkg);
        if (!kind) continue;
        packagesById.set(pkg.identifier, pkg);
        offers.push({ id: pkg.identifier, kind, priceLabel: pkg.product.priceString });
      }
      return offers;
    } catch (error) {
      console.error('revenueCatService: getOfferings failed', error);
      return [];
    }
  },

  async purchase(offer): Promise<PurchaseOutcome> {
    const pkg = packagesById.get(offer.id);
    if (!configured || !pkg) return { kind: 'error', reason: 'store_error' };
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (!hasPro(customerInfo)) return { kind: 'error', reason: 'store_error' };
      return { kind: 'success', proToken: await Purchases.getAppUserID() };
    } catch (error) {
      if (isCancel(error)) return { kind: 'cancelled' };
      console.error('revenueCatService: purchase failed', error);
      return { kind: 'error', reason: 'store_error' };
    }
  },

  async restore(): Promise<PurchaseOutcome> {
    if (!configured) return { kind: 'error', reason: 'store_error' };
    try {
      const info = await Purchases.restorePurchases();
      if (!hasPro(info)) return { kind: 'nothing_to_restore' };
      return { kind: 'success', proToken: await Purchases.getAppUserID() };
    } catch (error) {
      console.error('revenueCatService: restore failed', error);
      return { kind: 'error', reason: 'store_error' };
    }
  },
};
