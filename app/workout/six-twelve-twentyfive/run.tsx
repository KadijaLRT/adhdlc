import { useLocalSearchParams } from 'expo-router';
import SixTwelveTwentyFiveRunner from '@/features/workout/SixTwelveTwentyFiveRunner';
import type { SixTwelveTwentyFiveSlot } from '@/content/sixTwelveTwentyFive';

// Slot roles/rep targets are reconstructed from position, matching the
// fixed order pickSixTwelveTwentyFiveTemplate always returns them in
// (heavy, moderate, light) — only the exerciseIds themselves need to
// travel through the route params.
const ROLE_ORDER: SixTwelveTwentyFiveSlot['role'][] = ['heavy', 'moderate', 'light'];
const TARGET_REPS: Record<SixTwelveTwentyFiveSlot['role'], number> = { heavy: 6, moderate: 12, light: 25 };

export default function SixTwelveTwentyFiveRunRoute() {
  const { group, exerciseIds } = useLocalSearchParams<{ group?: string; exerciseIds?: string }>();
  const ids = (exerciseIds || '').split(',').filter(Boolean);
  const slots: SixTwelveTwentyFiveSlot[] = ids.map((exerciseId, i) => ({
    role: ROLE_ORDER[i] || 'light',
    targetReps: TARGET_REPS[ROLE_ORDER[i] || 'light'],
    exerciseId,
  }));

  return <SixTwelveTwentyFiveRunner group={group || undefined} slots={slots} />;
}
