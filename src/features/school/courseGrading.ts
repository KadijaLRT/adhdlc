import type { Assignment, GradeCategory } from '@/store/slices/schoolSlice';

export interface CourseGradeBreakdown {
  overallPercent: number;
  byCategory: { categoryId: string; name: string; pointsEarned: number; totalPointsPossible: number; percent: number; gradedCount: number }[];
}

/**
 * Points-based cumulative grade — no separate weight% input, since in
 * a points-graded course (like a syllabus stating "Quizzes: 60 points,
 * Exams: 400 points") each category's own point total already IS its
 * weight relative to the others; a category worth 400 points
 * naturally counts for more than one worth 60, with no extra
 * percentage needed on top.
 *
 * Within a category, pointsEarned is summed across graded assignments
 * and divided by the category's own declared totalPointsPossible — not
 * the sum of each assignment's individual max, since the syllabus
 * total is the authority and may include items not yet entered.
 * Overall percent = total points earned across ALL categories ÷ total
 * points possible across only the categories that have at least one
 * graded assignment so far — excluding wholly-ungraded categories from
 * the denominator the same way the old weight-renormalization did,
 * since an Exams category worth 400 points with nothing graded yet
 * shouldn't make the visible grade look artificially low just because
 * those points haven't happened yet.
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
    return { categoryId: cat.id, name: cat.name, pointsEarned, totalPointsPossible: cat.totalPointsPossible, percent, gradedCount: graded.length };
  });

  const gradedCategories = byCategory.filter((c) => c.gradedCount > 0);
  if (!gradedCategories.length) return null;

  const totalEarned = gradedCategories.reduce((sum, c) => sum + c.pointsEarned, 0);
  const totalPossible = gradedCategories.reduce((sum, c) => sum + c.totalPointsPossible, 0);
  const overallPercent = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

  return {
    overallPercent: Math.round(overallPercent * 10) / 10,
    byCategory: byCategory.map(({ categoryId, name, pointsEarned, totalPointsPossible, percent, gradedCount }) => ({
      categoryId, name, pointsEarned, totalPointsPossible, percent: Math.round(percent * 10) / 10, gradedCount,
    })),
  };
}
