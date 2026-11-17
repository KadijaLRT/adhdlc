// Run with: npm run test:pro
// Covers the server-side Pro check for BOTH providers (RevenueCat and
// Apple direct), the /api/pro-status and /api/groq handlers, and the
// device-side free-limit logic. No network: RevenueCat, Apple and Groq are faked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pe = require('../lib/proEntitlement.js');
const logic = await import('../src/features/pro/proLogic.ts');

const NOW = Date.parse('2026-11-17T12:00:00Z');
const RC_ENV = { PURCHASE_PROVIDER: 'revenuecat', REVENUECAT_SECRET_KEY: 'sk_test', REVENUECAT_ENTITLEMENT_ID: 'pro' };
const RC_USER = '$RCAnonymousID:0123456789abcdef0123456789abcdef';

function rcFetch(entitlements, calls = [], status = 200) {
  return async (url, init) => {
    calls.push({ url, init });
    return { ok: status === 200 || status === 201, status, json: async () => ({ subscriber: { entitlements } }) };
  };
}

// ---------- RevenueCat ----------

test('RevenueCat: calls the subscriber endpoint with the secret key and URL-encodes the user id', async () => {
  const calls = [];
  const r = await pe.verifyProToken(RC_USER, { env: RC_ENV, nowMs: NOW, fetchImpl: rcFetch({ pro: { expires_date: '2026-12-17T12:00:00Z' } }, calls) });
  assert.deepEqual(r, { valid: true });
  assert.equal(calls[0].url, `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(RC_USER)}`);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer sk_test');
});

test('RevenueCat: lifetime (expires_date null) is valid; expired is not; grace period is valid', async () => {
  const run = (ent) => pe.verifyProToken(RC_USER, { env: RC_ENV, nowMs: NOW, fetchImpl: rcFetch({ pro: ent }) });
  assert.deepEqual(await run({ expires_date: null, product_identifier: 'aviva_pro_lifetime' }), { valid: true });
  assert.deepEqual(await run({ expires_date: '2026-11-01T00:00:00Z', grace_period_expires_date: null }), { valid: false, reason: 'ended' });
  assert.deepEqual(await run({ expires_date: '2026-11-01T00:00:00Z', grace_period_expires_date: '2026-11-20T00:00:00Z' }), { valid: true });
});

test('RevenueCat: no entitlement (e.g. a brand-new or random user, 201) is not Pro', async () => {
  const r = await pe.verifyProToken(RC_USER, { env: RC_ENV, nowMs: NOW, fetchImpl: rcFetch({}, [], 201) });
  assert.deepEqual(r, { valid: false, reason: 'not_found' });
});

test('RevenueCat: missing secret key or outage is "unknown", never a false revoke', async () => {
  assert.deepEqual(await pe.verifyProToken(RC_USER, { env: { PURCHASE_PROVIDER: 'revenuecat' }, fetchImpl: rcFetch({}) }), { valid: null, reason: 'not_configured' });
  assert.deepEqual(await pe.verifyProToken(RC_USER, { env: RC_ENV, fetchImpl: rcFetch({}, [], 500) }), { valid: null, reason: 'unavailable' });
  assert.deepEqual(await pe.verifyProToken(RC_USER, { env: RC_ENV, fetchImpl: async () => { throw new Error('offline'); } }), { valid: null, reason: 'unavailable' });
});

test('junk tokens are rejected without a network call', async () => {
  let called = false;
  const r = await pe.verifyProToken('<script>alert(1)</script>', { env: RC_ENV, fetchImpl: async () => { called = true; } });
  assert.deepEqual(r, { valid: false, reason: 'invalid_format' });
  assert.equal(called, false);
});

// ---------- Apple direct ----------

const APPLE_ENV = {
  PURCHASE_PROVIDER: 'apple', APPLE_BUNDLE_ID: 'com.example.aviva', APPLE_APP_ID: '1234567890',
  APPLE_IAP_KEY_ID: 'KEY123', APPLE_IAP_ISSUER_ID: 'issuer-uuid', APPLE_IAP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
};

class FakeApiError extends Error { constructor(code) { super('api ' + code); this.httpStatusCode = code; } }

/** Builds fake Apple deps. `byEnv` maps 'Production'/'Sandbox' to { tx, statuses } or an error code. */
function appleDeps(byEnv, seen = []) {
  const lib = { Environment: { PRODUCTION: 'Production', SANDBOX: 'Sandbox' }, Status: { ACTIVE: 1, EXPIRED: 2, BILLING_RETRY: 3, BILLING_GRACE_PERIOD: 4, REVOKED: 5 } };
  return {
    lib,
    makeClient: (cfg, environment) => ({
      getTransactionInfo: async (id) => {
        seen.push(`${environment}:${id}`);
        const e = byEnv[environment];
        if (typeof e === 'number') throw new FakeApiError(e);
        return { signedTransactionInfo: JSON.stringify(e.tx) };
      },
      getAllSubscriptionStatuses: async () => ({ data: [{ lastTransactions: byEnv[environment].statuses.map((status) => ({ status })) }] }),
    }),
    makeVerifier: () => ({ verifyAndDecodeTransaction: async (s) => JSON.parse(s) }),
  };
}

const SUB_TX = { bundleId: 'com.example.aviva', productId: 'aviva_pro_monthly' };
const LIFE_TX = { bundleId: 'com.example.aviva', productId: 'aviva_pro_lifetime' };

test('Apple: active and grace-period subscriptions are valid; expired, revoked, billing retry are not', async () => {
  const run = (statuses) => pe.verifyProToken('2000000123456789', { env: APPLE_ENV, appleDeps: appleDeps({ Production: { tx: SUB_TX, statuses } }) });
  assert.deepEqual(await run([1]), { valid: true });
  assert.deepEqual(await run([4]), { valid: true });
  assert.deepEqual(await run([2]), { valid: false, reason: 'ended' });
  assert.deepEqual(await run([5]), { valid: false, reason: 'refunded' });
  assert.deepEqual(await run([3]), { valid: false, reason: 'payment_failed' });
});

test('Apple: lifetime is valid unless refunded (revocationDate)', async () => {
  const ok = await pe.verifyProToken('2000000123456789', { env: APPLE_ENV, appleDeps: appleDeps({ Production: { tx: LIFE_TX, statuses: [] } }) });
  assert.deepEqual(ok, { valid: true });
  const refunded = await pe.verifyProToken('2000000123456789', { env: APPLE_ENV, appleDeps: appleDeps({ Production: { tx: { ...LIFE_TX, revocationDate: NOW }, statuses: [] } }) });
  assert.deepEqual(refunded, { valid: false, reason: 'refunded' });
});

test('Apple: falls back from Production to Sandbox on 404 (TestFlight purchases)', async () => {
  const seen = [];
  const r = await pe.verifyProToken('2000000123456789', { env: APPLE_ENV, appleDeps: appleDeps({ Production: 404, Sandbox: { tx: SUB_TX, statuses: [1] } }, seen) });
  assert.deepEqual(r, { valid: true });
  assert.deepEqual(seen, ['Production:2000000123456789', 'Sandbox:2000000123456789']);
});

test('Apple: unknown in both environments is not found; another app\'s purchase is rejected; outage is unknown', async () => {
  assert.deepEqual(await pe.verifyProToken('2000000123456789', { env: APPLE_ENV, appleDeps: appleDeps({ Production: 404, Sandbox: 404 }) }), { valid: false, reason: 'not_found' });
  const otherApp = { tx: { bundleId: 'com.someone.else', productId: 'aviva_pro_monthly' }, statuses: [1] };
  assert.deepEqual(await pe.verifyProToken('2000000123456789', { env: APPLE_ENV, appleDeps: appleDeps({ Production: otherApp }) }), { valid: false, reason: 'not_found' });
  assert.deepEqual(await pe.verifyProToken('2000000123456789', { env: APPLE_ENV, appleDeps: appleDeps({ Production: 503 }) }), { valid: null, reason: 'unavailable' });
});

test('Apple: missing settings is not_configured; non-numeric token is rejected', async () => {
  assert.deepEqual(await pe.verifyProToken('2000000123456789', { env: { PURCHASE_PROVIDER: 'apple' }, appleDeps: appleDeps({}) }), { valid: null, reason: 'not_configured' });
  assert.deepEqual(await pe.verifyProToken(RC_USER, { env: APPLE_ENV, appleDeps: appleDeps({}) }), { valid: false, reason: 'invalid_format' });
});

test('Apple: the real Apple library loads and the bundled root certificates parse', async () => {
  const lib = require('@apple/app-store-server-library');
  const { X509Certificate } = await import('node:crypto');
  const fs = await import('node:fs');
  for (const f of ['AppleRootCA-G3.cer', 'AppleRootCA-G2.cer']) {
    const cert = new X509Certificate(fs.readFileSync(new URL(`../lib/apple-certs/${f}`, import.meta.url)));
    assert.match(cert.subject, /Apple Root CA/);
  }
  assert.equal(typeof lib.SignedDataVerifier, 'function');
  assert.equal(typeof lib.AppStoreServerAPIClient, 'function');
});

// ---------- HTTP handlers ----------

function fakeRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

test('/api/pro-status returns valid / invalid / 503 / 405', async () => {
  Object.assign(process.env, RC_ENV);
  const handler = require('../api/pro-status.js');
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = rcFetch({ pro: { expires_date: null } });
    let res = fakeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '1.1.1.1' }, body: { proToken: RC_USER } }, res);
    assert.equal(res.statusCode, 200); assert.deepEqual(res.body, { valid: true });

    globalThis.fetch = rcFetch({});
    res = fakeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '1.1.1.2' }, body: { proToken: RC_USER } }, res);
    assert.deepEqual(res.body, { valid: false, reason: 'not_found' });

    globalThis.fetch = rcFetch({}, [], 500);
    res = fakeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '1.1.1.3' }, body: { proToken: RC_USER } }, res);
    assert.equal(res.statusCode, 503);

    res = fakeRes();
    await handler({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 405);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('/api/groq: free cap returns 402 pro_required; a valid Pro token skips it', async () => {
  Object.assign(process.env, RC_ENV, { GROQ_API_KEY: 'test', FREE_AI_PER_IP_PER_DAY: '1' });
  delete require.cache[require.resolve('../api/groq.js')];
  const handler = require('../api/groq.js');
  pe._clearCacheForTests();
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (String(url).includes('revenuecat')) return { ok: true, status: 200, json: async () => ({ subscriber: { entitlements: { pro: { expires_date: null } } } }) };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) };
    };
    const body = { messages: [{ role: 'user', content: 'hi' }] };
    let res = fakeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body }, res);
    assert.equal(res.statusCode, 200);
    res = fakeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body }, res);
    assert.equal(res.statusCode, 402);
    assert.equal(res.body.reason, 'pro_required');
    res = fakeRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9', 'x-pro-token': RC_USER }, body }, res);
    assert.equal(res.statusCode, 200);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.FREE_AI_PER_IP_PER_DAY;
  }
});

// ---------- device-side logic ----------

test('device free limit: counts per day, resets tomorrow, never blocks Pro or onboarding', () => {
  const day1 = new Date(2026, 10, 17, 10);
  const day2 = new Date(2026, 10, 18, 9);
  let s = logic.EMPTY_PRO_STATE;
  for (let i = 0; i < 5; i += 1) {
    assert.equal(logic.canUseAi(s, day1, 5, true), true);
    s = logic.withAiUseRecorded(s, day1, true);
  }
  assert.equal(logic.canUseAi(s, day1, 5, true), false);
  assert.equal(logic.remainingFreeToday(s, day1, 5), 0);
  assert.equal(logic.canUseAi(s, day2, 5, true), true);
  assert.equal(logic.canUseAi(s, day1, 5, false), true, 'onboarding is never blocked');
  assert.equal(logic.withAiUseRecorded(s, day1, false), s, 'onboarding use is not counted');
  const pro = { ...s, isPro: true, proToken: RC_USER };
  assert.equal(logic.canUseAi(pro, day1, 5, true), true);
  assert.equal(logic.withAiUseRecorded(pro, day1, true), pro);
});

test('re-check: refund turns Pro off; outage keeps Pro for the grace period only', () => {
  const DAY = 86_400_000;
  const base = { ...logic.EMPTY_PRO_STATE, proToken: RC_USER, isPro: true, lastVerifiedAt: 0 };
  assert.equal(logic.needsRevalidation(base, 2 * DAY, DAY), true);
  assert.equal(logic.needsRevalidation({ ...base, lastVerifiedAt: 2 * DAY }, 2.5 * DAY, DAY), false);
  assert.equal(logic.applyRevalidation(base, { kind: 'invalid', reason: 'refunded' }, DAY, 14 * DAY).isPro, false);
  assert.equal(logic.applyRevalidation(base, { kind: 'unknown', reason: 'unavailable' }, 10 * DAY, 14 * DAY).isPro, true);
  assert.equal(logic.applyRevalidation(base, { kind: 'unknown', reason: 'unavailable' }, 15 * DAY, 14 * DAY).isPro, false);
  const renewed = logic.applyRevalidation(base, { kind: 'valid' }, 15 * DAY, 14 * DAY);
  assert.equal(renewed.isPro, true);
  assert.equal(renewed.lastVerifiedAt, 15 * DAY);
});

test('every problem reason has a friendly message, and cancelling shows none', () => {
  assert.equal(logic.describeProProblem('cancelled'), '');
  for (const r of ['nothing_to_restore', 'not_found', 'refunded', 'ended', 'payment_failed', 'not_available', 'store_error', 'rate_limited', 'not_configured', 'unavailable']) {
    assert.ok(logic.describeProProblem(r).length > 10, r);
  }
});
