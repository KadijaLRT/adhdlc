import { expandLegacyGroups } from '@/content/bodyGroups';
/**
 * Round-robins a filtered exercise pool across muscle groups instead of
 * leaving it in raw insertion order, optionally weighting the round
 * toward a person's stated focus areas.
 *
 * Why this exists: `WORKOUT_EXERCISES` lists every exercise for one
 * muscle group in a single block before moving to the next (all glute
 * exercises together, then all hamstring exercises, etc). Any program
 * whose `targetGroups` spans more than one group — but especially one
 * with only two, like a glutes+hamstrings program — filters that block
 * order but doesn't reshuffle it. Chunking a blocked list into fixed-size
 * days then means whole days come out as a single muscle group purely
 * by data-ordering accident (e.g. Day A, B, and C are 100% glutes before
 * a hamstring exercise is ever reached), even though the program was
 * meant to train both. Interleaving first means every day-sized chunk
 * gets a proportional mix of each targeted group instead.
 *
 * `priorityGroups` (a person's `focusAreas` preference) pulls extra
 * exercises from those groups each round — twice as many as every other
 * group — so programs actually lean toward what someone said they care
 * about (e.g. more core/arms work) without ever dropping the other
 * groups a program covers to zero; every group still gets visited every
 * round, just in a different ratio.
 */
export function interleaveByGroup<T extends [string, { group: string }]>(
  entries: T[],
  priorityGroups?: string[] | null
): T[] {
  const priority = new Set(expandLegacyGroups(priorityGroups));
  const buckets = new Map<string, T[]>();
  for (const entry of entries) {
    const group = entry[1].group;
    const bucket = buckets.get(group);
    if (bucket) bucket.push(entry);
    else buckets.set(group, [entry]);
  }

  const bucketEntries = Array.from(buckets.entries());
  const cursors = new Map<string, number>(bucketEntries.map(([group]) => [group, 0]));
  const result: T[] = [];
  let remaining = entries.length;
  while (remaining > 0) {
    for (const [group, bucket] of bucketEntries) {
      const pullCount = priority.has(group) ? 2 : 1;
      for (let p = 0; p < pullCount && remaining > 0; p++) {
        const cursor = cursors.get(group) ?? 0;
        const item = bucket[cursor];
        if (!item) break;
        result.push(item);
        cursors.set(group, cursor + 1);
        remaining--;
      }
    }
  }
  return result;
}
