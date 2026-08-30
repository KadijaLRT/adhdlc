import type { Assignment, GradeCategory } from '@/store/slices/schoolSlice';

export interface CourseGradeBreakdown {
  overallPercent: number;
  byCategory: { categoryId: string; name: string; averagePercent: number; gradedCount: number }[];
}

/**
 * Weighted-by-category cumulative grade: within a category, assignment
 * scores are simple-averaged; across categories, those averages are
 * combined using each category's weight — but renormalized to only the
 * categories that actually have at least one graded assignment so far.
 * Without renormalizing, an Exams category worth 50% with no exam
 * graded yet would silently cap the visible grade near 50%, which
 * misrepresents "not graded yet" as "failing that portion." Returns
 * null when nothing is gradeable yet (no categories, or no assignment
 * in any category has a score), so the caller can distinguish "no data"
 * from "a real 0%."
 */
export function computeCourseGrade(
  categories: GradeCategory[] | undefined,
  assignments: Assignment[]
): CourseGradeBreakdown | null {
  if (!categories?.length) return null;

  const byCategory = categories.map((cat) => {
    const graded = assignments.filter((a) => a.categoryId === cat.id && typeof a.score === 'number');
    const averagePercent = graded.length
      ? graded.reduce((sum, a) => sum + (a.score as number), 0) / graded.length
      : 0;
    return { categoryId: cat.id, name: cat.name, averagePercent, gradedCount: graded.length, weightPercent: cat.weightPercent };
  });

  const gradedCategories = byCategory.filter((c) => c.gradedCount > 0);
  if (!gradedCategories.length) return null;

  const totalWeight = gradedCategories.reduce((sum, c) => sum + (c.weightPercent || 0), 0);
  // If every graded category was somehow weighted 0, fall back to an
  // equal split across them rather than dividing by zero.
  const overallPercent = totalWeight > 0
    ? gradedCategories.reduce((sum, c) => sum + c.averagePercent * (c.weightPercent || 0), 0) / totalWeight
    : gradedCategories.reduce((sum, c) => sum + c.averagePercent, 0) / gradedCategories.length;

  return {
    overallPercent: Math.round(overallPercent * 10) / 10,
    byCategory: byCategory.map(({ categoryId, name, averagePercent, gradedCount }) => ({
      categoryId, name, averagePercent: Math.round(averagePercent * 10) / 10, gradedCount,
    })),
  };
}

/** Sum of category weights — shown as a soft warning if it drifts far from 100, never enforced. */
export function totalCategoryWeight(categories: GradeCategory[] | undefined): number {
  return (categories || []).reduce((sum, c) => sum + (c.weightPercent || 0), 0);
}
