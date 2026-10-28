import { Text } from 'react-native';
import { restrictionsAvoiding, restrictionsHelpedBy, type EquipmentContext } from './exerciseAvailability';

/**
 * One quiet line under an exercise: a warning when a saved restriction says it
 * often bothers that area, or a note when it is targeted work for one. Renders
 * nothing when the person has no restrictions or this move is unrelated.
 */
export default function RestrictionFitNote({ exerciseId, ctx }: { exerciseId: string; ctx: EquipmentContext }) {
  if (!ctx.plan) return null;
  const avoiding = restrictionsAvoiding(exerciseId, ctx);
  if (avoiding.length > 0) {
    return (
      <Text className="text-amber-700 dark:text-amber-400 text-[11px] mt-0.5">
        ⚠️ Often bothers: {avoiding.map((r) => r.label).join(', ')}
      </Text>
    );
  }
  const helps = restrictionsHelpedBy(exerciseId, ctx);
  if (helps.length > 0) {
    return (
      <Text className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-0.5">
        🩹 Helps: {helps.map((r) => r.label).join(', ')}
      </Text>
    );
  }
  return null;
}
