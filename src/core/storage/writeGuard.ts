/**
 * Every store slice persists its full domain state to disk after each
 * mutation (see the `persist()` helper at the top of each slice file).
 * Those writes are async, and nothing serializes them: two mutations
 * fired close together (a fast double-tap, a loop of sequential
 * `await`ed actions from different call sites racing each other, etc.)
 * can have their disk writes resolve out of order — whichever `save()`
 * call happens to finish last wins, even if it was started first and
 * carries stale data. In-memory Zustand state is always correct; only
 * the on-disk snapshot (and anything hydrated from it after a reload)
 * can silently regress to an older value.
 *
 * `createWriteGuard` fixes this two ways:
 *  1. Chains writes onto a single promise so they always execute (and
 *     therefore resolve) in call order, not whatever order the
 *     underlying storage API happens to finish them in.
 *  2. Skips a write entirely if a newer one was queued behind it before
 *     its turn came up — no point serializing a stale write to disk
 *     right before an already-known newer one overwrites it anyway.
 *
 * The most recently *called* write is always the one that ends up on
 * disk, matching the most recently *set* in-memory state.
 */
export function createWriteGuard<T>(save: (data: T) => Promise<void>): (data: T) => Promise<void> {
  let seq = 0;
  let chain: Promise<void> = Promise.resolve();

  return (data: T) => {
    const mySeq = ++seq;
    const run = chain.then(async () => {
      if (mySeq !== seq) return; // a newer write was queued behind us — skip, it'll persist instead
      await save(data);
    });
    // Keep the shared queue alive even if one write rejects, while still
    // returning `run` so the caller can observe its own failure.
    chain = run.catch(() => {});
    return run;
  };
}
