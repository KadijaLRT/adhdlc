/**
 * Standalone duplicate-exercise checker for src/content/exercises.ts.
 *
 * Runs two checks:
 *   1. Name collisions (hard failure) — the same movement added twice
 *      under a cosmetically different name (e.g. "Chest Supported Row"
 *      / "Chest-Supported Row", "Frog Pump" / "Frog Pumps", "Devil's
 *      Press" / "Devil Press", "Cable Pull-Through" / "Cable
 *      Pull-Through (heavy)"). Each was a distinct id, so nothing in
 *      TypeScript's type system or a duplicate-object-key lint rule
 *      could ever catch it — they were structurally valid, just
 *      redundant data.
 *   2. Matching muscle/equipment/rep-scheme signatures (warning only)
 *      — catches duplicates the name check misses entirely, like
 *      "Cable Kickback" / "Standing Cable Hip Extension" / "Cable
 *      Glute Kickback (standing)": three unrelated-looking names for
 *      the exact same movement. Warning, not failure, because two
 *      genuinely different isolation exercises can coincidentally
 *      share a rep scheme.
 *
 * Run this after adding any batch of new exercises, before shipping:
 *   npx tsx scripts/checkExerciseDuplicates.ts
 * (or `npx ts-node scripts/checkExerciseDuplicates.ts` if tsx isn't
 * installed). Exits non-zero only on check #1 (name collisions);
 * check #2's warnings print but don't fail the exit code, so this can
 * still be wired into a pre-commit hook or CI step without blocking on
 * a false positive.
 *
 * This intentionally reuses findDuplicateExerciseNames and
 * findSuspiciousParameterMatches from exercises.ts itself rather than
 * reimplementing the logic here — there is exactly one definition of
 * each check in the whole codebase, shared by this script and the
 * dev-time runtime assertion/warning in exercises.ts.
 */
import { WORKOUT_EXERCISES, findDuplicateExerciseNames, findSuspiciousParameterMatches } from '../src/content/exercises';

const duplicates = findDuplicateExerciseNames(WORKOUT_EXERCISES);
const suspicious = findSuspiciousParameterMatches(WORKOUT_EXERCISES);

let hasFailure = false;

if (duplicates.length === 0) {
  console.log(`✓ No duplicate exercise names found across ${Object.keys(WORKOUT_EXERCISES).length} entries.`);
} else {
  hasFailure = true;
  console.error(`✗ Found ${duplicates.length} duplicate exercise name group(s):\n`);
  for (const group of duplicates) {
    console.error(
      '  ' + group.map((e) => `${e.id} = "${e.name}"`).join('\n  vs. ')
    );
    console.error('');
  }
  console.error(
    'Each group above normalizes to the same name (case, punctuation, and\n' +
    'a trailing "s" are ignored) — meaning the same exercise was very\n' +
    'likely added twice under a different id. Remove or rename the\n' +
    'redundant entry, and check WGROUPS and COMPOUND_EXERCISE_IDS in\n' +
    'exercises.ts for any reference to the id you remove — those two\n' +
    'lists are not auto-derived and will silently keep pointing at a\n' +
    'deleted id otherwise.\n\n' +
    'If two entries in a group are genuinely different exercises that\n' +
    'happen to share a name after normalization, rename one to\n' +
    'disambiguate rather than ignoring this failure.\n'
  );
}

if (suspicious.length === 0) {
  console.log(`✓ No suspicious muscle/equipment/rep-scheme matches found (a weaker signal, checked separately from names).`);
} else {
  console.warn(`⚠ Found ${suspicious.length} group(s) of exercises sharing an identical muscle/equipment/rep/rest/set signature — not necessarily duplicates, but worth a manual look:\n`);
  for (const group of suspicious) {
    console.warn(
      '  ' + group.map((e) => `${e.id} = "${e.name}"`).join('\n  vs. ')
    );
    console.warn('');
  }
  console.warn(
    'This is the check that caught "Cable Kickback" / "Standing Cable Hip\n' +
    'Extension" / "Cable Glute Kickback (standing)" — three unrelated-\n' +
    'looking names for the same movement, missed by the name check above\n' +
    'because the names genuinely differ. A match here is a WARNING, not a\n' +
    'failure: two different isolation exercises can legitimately share a\n' +
    'rep scheme by coincidence. Read the cues for each listed pair — if\n' +
    'they describe the same movement, remove the redundant one (and clean\n' +
    'its id out of WGROUPS/COMPOUND_EXERCISE_IDS); if they are genuinely\n' +
    'different exercises, no action needed.\n'
  );
}

process.exit(hasFailure ? 1 : 0);
