import { Platform } from 'react-native';
import { PURCHASE_PROVIDER } from '../proConfig';
import type { PurchaseService } from './types';
import { revenueCatService } from './revenueCatService';
import { appleService } from './appleService';
import { getPurchaseService as getWebService } from './index.web';

/**
 * Native entry point (Metro picks index.web.ts for web builds). Only
 * iOS is wired up; Android would need Google Play products first.
 * Switching providers is one setting: EXPO_PUBLIC_PURCHASE_PROVIDER
 * (and PURCHASE_PROVIDER on the server).
 */
export function getPurchaseService(): PurchaseService {
  if (Platform.OS !== 'ios') return getWebService();
  return PURCHASE_PROVIDER === 'apple' ? appleService : revenueCatService;
}
