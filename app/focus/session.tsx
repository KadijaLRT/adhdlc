import { useLocalSearchParams } from 'expo-router';
import FocusSession from '@/features/focus/FocusSession';

export default function FocusSessionRoute() {
  const { taskId, taskTitle, durationMinutes } = useLocalSearchParams<{ taskId?: string; taskTitle?: string; durationMinutes?: string }>();
  return <FocusSession taskId={taskId || null} taskTitle={taskTitle || null} durationMinutes={Number(durationMinutes) || 15} />;
}
