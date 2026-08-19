/**
 * Generates a locally-unique ID: a timestamp plus a random suffix.
 * Deliberately not a full UUID or crypto.randomUUID() — the latter's
 * actual availability in this app's real runtimes (Hermes on native,
 * every browser on web) wasn't something to assume without directly
 * verifying it, and adding a new dependency (expo-crypto) for this
 * felt like overkill for what's a purely local, offline-first app with
 * no need for cross-device-guaranteed uniqueness. This just needs to
 * make same-millisecond collisions vanishingly unlikely, not be
 * cryptographically unpredictable — two IDs created in the same
 * millisecond by two different Date.now()-only calls (the bug this
 * replaces) is a real, if rare, collision risk that duplicate React
 * keys and incorrect edits/deletes can result from; this closes that
 * gap with a random suffix that's astronomically unlikely to repeat
 * for the same millisecond.
 */
export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}
