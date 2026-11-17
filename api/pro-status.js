/**
 * Vercel serverless function: POST /api/pro-status
 * Body: { proToken: string }
 *   proToken = RevenueCat App User ID (PURCHASE_PROVIDER=revenuecat)
 *            or Apple original transaction ID (PURCHASE_PROVIDER=apple)
 *
 * Response 200: { valid: true }  or  { valid: false, reason }
 * Response 503: { valid: null, reason }  couldn't check right now; the app keeps what it had
 */

const { verifyProToken } = require('../lib/proEntitlement');

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  if (requestLog.size > 5000) requestLog.delete(requestLog.keys().next().value);
  return timestamps.length > MAX_REQUESTS;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (isRateLimited(getClientIp(req))) {
    res.status(429).json({ valid: null, reason: 'rate_limited' });
    return;
  }
  const body = req.body || {};
  const proToken = typeof body.proToken === 'string' ? body.proToken.trim() : '';
  const result = await verifyProToken(proToken);
  if (result.valid === null) {
    if (result.reason === 'not_configured') console.error('api/pro-status: purchase checking is not configured (see .env.example).');
    res.status(503).json({ valid: null, reason: result.reason });
    return;
  }
  res.status(200).json(result.valid ? { valid: true } : { valid: false, reason: result.reason });
};
