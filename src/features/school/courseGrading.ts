import type { Assignment, GradeCategory } from '@/store/slices/schoolSlice';

export interface CourseGradeBreakdown {
  overallPercent: number;
  byCategory: { categoryId: string; name: string; pointsEarned: number; totalPointsPossible: number; percent: number; gradedCount: number }[];
}

/**
 * Weighted-by-category cumulative grade, computed in raw points per
 * category (matching how a real syllabus states it — e.g. "Quizzes: 60
 * points total") rather than averaging 0-100 percentages. Within a
 * category, pointsEarned is summed across graded assignments and
 * divided by the category's own declared totalPointsPossible — not the
 * sum of each assignment's individual max, since the syllabus total is
 * the authority and may include items not yet entered. Across
 * categories, those percentages combine using each category's weight,
 * renormalized to only the categories that actually have at least one
 * graded assignment so far — without renormalizing, an Exams category
 * worth 50% with nothing graded yet would silently cap the visible
 * grade near 50%, misrepresenting "not graded yet" as "failing that
 * portion." Returns null when nothing is gradeable yet, so the caller
 * can distinguish "no data" from "a real 0%."
 */
export function computeCourseGrade(
  categories: GradeCategory[] | undefined,
  assignments: Assignment[]
): CourseGradeBreakdown | null {
  if (!categories?.length) return null;

  const byCategory = categories.map((cat) => {
    const graded = assignments.filter((a) => a.categoryId === cat.id && typeof a.pointsEarned === 'number');
    const pointsEarned = graded.reduce((sum, a) => sum + (a.pointsEarned as number), 0);
    const percent = cat.totalPointsPossible > 0 ? (pointsEarned / cat.totalPointsPossible) * 100 : 0;
    return { categoryId: cat.id, name: cat.name, pointsEarned, totalPointsPossible: cat.totalPointsPossible, percent, gradedCount: graded.length, weightPercent: cat.weightPercent };
  });

  const gradedCategories = byCategory.filter((c) => c.gradedCount > 0);
  if (!gradedCategories.length) return null;

  const totalWeight = gradedCategories.reduce((sum, c) => sum + (c.weightPercent || 0), 0);
  // If every graded category was somehow weighted 0, fall back to an
  // equal split across them rather than dividing by zero.
  const overallPercent = totalWeight > 0
    ? gradedCategories.reduce((sum, c) => sum + c.percent * (c.weightPercent || 0), 0) / totalWeight
    : gradedCategories.reduce((sum, c) => sum + c.percent, 0) / gradedCategories.length;

  return {
    overallPercent: Math.round(overallPercent * 10) / 10,
    byCategory: byCategory.map(({ categoryId, name, pointsEarned, totalPointsPossible, percent, gradedCount }) => ({
      categoryId, name, pointsEarned, totalPointsPossible, percent: Math.round(percent * 10) / 10, gradedCount,
    })),
  };
}

/** Sum of category weights — shown as a soft warning if it drifts far from 100, never enforced. */
export function totalCategoryWeight(categories: GradeCategory[] | undefined): number {
  return (categories || []).reduce((sum, c) => sum + (c.weightPercent || 0), 0);
}
