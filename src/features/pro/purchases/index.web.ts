import type { PurchaseService } from './types';

// Web: no payments yet (planned: a web checkout added as another
// PurchaseService here). Web users see "Get Pro in the iPhone app".
export function getPurchaseService(): PurchaseService {
  return {
    available: false,
    init: async () => {},
    getOffers: async () => [],
    purchase: async () => ({ kind: 'error', reason: 'not_available' }),
    restore: async () => ({ kind: 'error', reason: 'not_available' }),
  };
}
