/**
 * Server-side "is this person really Pro?" check, shared by
 * /api/pro-status (the app confirming a purchase) and /api/groq
 * (unlimited AI for Pro).
 *
 * Lives outside /api on purpose: every file under /api becomes its own
 * Vercel Serverless Function, and this is a helper, not an endpoint.
 *
 * Two interchangeable providers, chosen with PURCHASE_PROVIDER:
 *
 *   revenuecat (default)
 *     The app sends its RevenueCat App User ID as the "pro token".
 *     We ask RevenueCat: GET https://api.revenuecat.com/v1/subscribers/{id}
 *     with the SECRET key, and look at subscriber.entitlements[<id>].
 *     Active when expires_date is null (lifetime) or in the future, or
 *     grace_period_expires_date is in the future.
 *
 *   apple
 *     The app sends the purchase's original transaction ID as the token.
 *     We ask Apple's App Store Server API directly (official
 *     @apple/app-store-server-library), verify Apple's signature on the
 *     transaction, then:
 *       - lifetime product: valid unless refunded (revocationDate)
 *       - subscription: valid while status is ACTIVE or BILLING_GRACE_PERIOD
 *     Production is tried first, then Sandbox (TestFlight and test
 *     purchases live in Sandbox), as Apple recommends.
 *
 * Every verdict is one of:
 *   { valid: true }
 *   { valid: false, reason }   definitely not Pro
 *   { valid: null,  reason }   couldn't decide (not configured / outage); don't revoke
 */

const fs = require('fs');
const path = require('path');

function readConfig(env = process.env) {
  return {
    provider: (env.PURCHASE_PROVIDER || 'revenuecat').trim().toLowerCase(),
    revenueCatSecretKey: (env.REVENUECAT_SECRET_KEY || '').trim(),
    revenueCatEntitlementId: (env.REVENUECAT_ENTITLEMENT_ID || 'pro').trim(),
    appleBundleId: (env.APPLE_BUNDLE_ID || '').trim(),
    appleAppId: Number.parseInt(env.APPLE_APP_ID || '', 10),
    appleKeyId: (env.APPLE_IAP_KEY_ID || '').trim(),
    appleIssuerId: (env.APPLE_IAP_ISSUER_ID || '').trim(),
    // The .p8 file's contents. Vercel env vars can hold real newlines; "\n" escapes also work.
    applePrivateKey: (env.APPLE_IAP_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim(),
    appleLifetimeProductId: (env.APPLE_LIFETIME_PRODUCT_ID || 'aviva_pro_lifetime').trim(),
  };
}

/** Tokens are App User IDs ($RCAnonymousID:hex) or numeric Apple transaction IDs. Anything else is rejected before any network call. */
function looksLikeProToken(token) {
  return typeof token === 'string' && token.length >= 6 && token.length <= 200 && /^[A-Za-z0-9$:_.-]+$/.test(token);
}

// ---------- RevenueCat ----------

function entitlementIsActive(entitlement, nowMs) {
  if (!entitlement) return false;
  const expires = entitlement.expires_date ? Date.parse(entitlement.expires_date) : null;
  const grace = entitlement.grace_period_expires_date ? Date.parse(entitlement.grace_period_expires_date) : null;
  if (entitlement.expires_date === null || entitlement.expires_date === undefined) return true; // lifetime
  if (Number.isFinite(expires) && expires > nowMs) return true;
  if (Number.isFinite(grace) && grace > nowMs) return true;
  return false;
}

async function verifyWithRevenueCat(token, cfg, fetchImpl, nowMs) {
  if (!cfg.revenueCatSecretKey) return { valid: null, reason: 'not_configured' };
  let response;
  try {
    response = await fetchImpl(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cfg.revenueCatSecretKey}`, Accept: 'application/json' },
    });
  } catch (error) {
    console.error('proEntitlement: RevenueCat network error', error);
    return { valid: null, reason: 'unavailable' };
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !data.subscriber) {
    console.error('proEntitlement: RevenueCat unexpected response', response.status);
    return { valid: null, reason: 'unavailable' };
  }
  const entitlement = (data.subscriber.entitlements || {})[cfg.revenueCatEntitlementId];
  if (!entitlement) return { valid: false, reason: 'not_found' };
  return entitlementIsActive(entitlement, nowMs) ? { valid: true } : { valid: false, reason: 'ended' };
}

// ---------- Apple App Store Server API ----------

let appleLib = null;
function loadAppleLib() {
  if (!appleLib) appleLib = require('@apple/app-store-server-library');
  return appleLib;
}

let rootCerts = null;
function loadRootCerts() {
  if (!rootCerts) {
    // Apple Root CA G3 signs App Store data today; G2 is kept in case Apple moves to it.
    // Downloaded from https://www.apple.com/certificateauthority/ (vercel.json includeFiles ships them).
    rootCerts = ['AppleRootCA-G3.cer', 'AppleRootCA-G2.cer'].map((f) => fs.readFileSync(path.join(__dirname, 'apple-certs', f)));
  }
  return rootCerts;
}

const ACTIVE_SUB_STATUSES = new Set([1, 4]); // ACTIVE, BILLING_GRACE_PERIOD

async function checkAppleInEnvironment(token, cfg, environment, deps) {
  const lib = deps.lib;
  const client = deps.makeClient(cfg, environment);
  const verifier = deps.makeVerifier(cfg, environment);

  const info = await client.getTransactionInfo(token);
  if (!info || !info.signedTransactionInfo) return { valid: false, reason: 'not_found' };
  const tx = await verifier.verifyAndDecodeTransaction(info.signedTransactionInfo);
  if (tx.bundleId !== cfg.appleBundleId) return { valid: false, reason: 'not_found' };

  if (tx.productId === cfg.appleLifetimeProductId) {
    return tx.revocationDate ? { valid: false, reason: 'refunded' } : { valid: true };
  }

  const statuses = await client.getAllSubscriptionStatuses(token);
  const items = [];
  for (const group of (statuses && statuses.data) || []) items.push(...(group.lastTransactions || []));
  if (items.some((item) => ACTIVE_SUB_STATUSES.has(Number(item.status)))) return { valid: true };
  if (items.some((item) => Number(item.status) === lib.Status.REVOKED)) return { valid: false, reason: 'refunded' };
  if (items.some((item) => Number(item.status) === lib.Status.BILLING_RETRY)) return { valid: false, reason: 'payment_failed' };
  return { valid: false, reason: 'ended' };
}

function defaultAppleDeps() {
  const lib = loadAppleLib();
  return {
    lib,
    makeClient: (cfg, environment) => new lib.AppStoreServerAPIClient(cfg.applePrivateKey, cfg.appleKeyId, cfg.appleIssuerId, cfg.appleBundleId, environment),
    makeVerifier: (cfg, environment) => new lib.SignedDataVerifier(
      loadRootCerts(), false, environment, cfg.appleBundleId, // false = no online revocation (OCSP) lookup; signatures are still checked
      environment === lib.Environment.PRODUCTION ? cfg.appleAppId : undefined,
    ),
  };
}

async function verifyWithApple(token, cfg, deps) {
  if (!cfg.appleBundleId || !cfg.appleKeyId || !cfg.appleIssuerId || !cfg.applePrivateKey || !Number.isFinite(cfg.appleAppId)) {
    return { valid: null, reason: 'not_configured' };
  }
  if (!/^\d{1,30}$/.test(token)) return { valid: false, reason: 'invalid_format' };
  const d = deps || defaultAppleDeps();
  const environments = [d.lib.Environment.PRODUCTION, d.lib.Environment.SANDBOX];
  for (const environment of environments) {
    try {
      // eslint-disable-next-line no-await-in-loop -- sandbox is only tried if production says "not found"
      return await checkAppleInEnvironment(token, cfg, environment, d);
    } catch (error) {
      const status = error && error.httpStatusCode;
      if (status === 404) continue; // not in this environment; try the next
      console.error('proEntitlement: Apple check failed', environment, status || error);
      if (status === 400) return { valid: false, reason: 'not_found' };
      return { valid: null, reason: 'unavailable' };
    }
  }
  return { valid: false, reason: 'not_found' };
}

// ---------- shared ----------

async function verifyProToken(token, { env = process.env, fetchImpl = fetch, appleDeps, nowMs = Date.now() } = {}) {
  const cfg = readConfig(env);
  if (!looksLikeProToken(token)) return { valid: false, reason: 'invalid_format' };
  if (cfg.provider === 'apple') return verifyWithApple(token, cfg, appleDeps);
  if (cfg.provider === 'revenuecat') return verifyWithRevenueCat(token, cfg, fetchImpl, nowMs);
  console.error(`proEntitlement: unknown PURCHASE_PROVIDER "${cfg.provider}" (use "revenuecat" or "apple")`);
  return { valid: null, reason: 'not_configured' };
}

// Cache so /api/groq doesn't call RevenueCat/Apple on every AI request.
// Per warm serverless instance only; a miss just means one extra check.
const VALID_TTL_MS = 60 * 60 * 1000;
const INVALID_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

async function isProCached(token, options) {
  if (!looksLikeProToken(token)) return false;
  const hit = cache.get(token);
  if (hit && hit.expiresAt > Date.now()) return hit.valid;
  const result = await verifyProToken(token, options);
  // During an outage, give a paying customer the benefit of the doubt for a few minutes.
  const valid = result.valid === true || result.reason === 'unavailable';
  cache.set(token, { valid, expiresAt: Date.now() + (result.valid === true ? VALID_TTL_MS : INVALID_TTL_MS) });
  if (cache.size > 5000) cache.delete(cache.keys().next().value);
  return valid;
}

function _clearCacheForTests() {
  cache.clear();
}

module.exports = { verifyProToken, isProCached, entitlementIsActive, looksLikeProToken, readConfig, _clearCacheForTests };
