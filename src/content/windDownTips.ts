export interface WindDownTip {
  struggle: string; // matches a sleepStruggles id from onboarding/sleep.tsx
  tip: string;
}

/**
 * Bug fix: onboarding's sleep screen collects sleepStruggles and its
 * own copy says "Shapes your wind-down and Evening check-in" — nothing
 * downstream ever read it before this. One concrete, non-clinical tip
 * per struggle, shown above the evening reflection so the answer
 * actually does something rather than sitting unused in storage.
 */
export const WIND_DOWN_TIPS: WindDownTip[] = [
  { struggle: 'falling_asleep', tip: 'Dim screens and lights for the last 20 minutes before bed — it signals your brain to start winding down.' },
  { struggle: 'staying_asleep', tip: 'Keep the room cool and dark. If you wake up, avoid checking the time or your phone — it makes falling back asleep harder.' },
  { struggle: 'waking_up', tip: 'Try keeping wake-up time consistent, even on weekends — it steadies your body\'s clock more than bedtime does.' },
  { struggle: 'bedtime_routine', tip: 'Pick one small, repeatable cue (same song, same tea, same two minutes of stretching) to signal "bedtime starts now."' },
];

export function getWindDownTip(sleepStruggles: string[] | undefined): string | null {
  if (!sleepStruggles?.length) return null;
  const matching = WIND_DOWN_TIPS.filter((t) => sleepStruggles.includes(t.struggle));
  if (!matching.length) return null;
  // Stable per-day pick (not re-randomized on every render) so the tip
  // doesn't change every time the Home screen re-renders during the
  // same evening.
  const dayIndex = new Date().getDate();
  return matching[dayIndex % matching.length]?.tip || null;
}
