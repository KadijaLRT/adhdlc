import { z } from 'zod';
import { callGroqJSON } from '@/core/ai/simpleGroqCall';
import type { Recipe } from '@/content/recipes';
import { generateId } from '@/shared/generateId';

const GeneratedRecipeSchema = z.object({
  name: z.string(),
  cuisine: z.string(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  protein: z.string(),
  carbs: z.string(),
  fat: z.string(),
  calories: z.number(),
  ingredients: z.array(z.string()).min(1),
  groceryKeywords: z.array(z.string()).min(1),
  prepTime: z.string(),
  cookTime: z.string(),
});

const DirectionsSchema = z.object({
  steps: z.array(z.string()).min(1),
});

function slugify(text: string): string {
  return (text || 'recipe').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}

/**
 * Generates step-by-step cooking directions for a recipe that doesn't
 * have any yet — built-in recipes ship with ingredients and macros but
 * not directions, since hand-writing real tested steps for 80+ recipes
 * isn't something to fabricate. This generates a realistic set of
 * steps from the recipe's own name and ingredient list, clearly framed
 * in the UI as AI-generated rather than a tested, verified recipe.
 * Cached once generated (see recipeInstructionsCache) so it only ever
 * runs once per recipe.
 */
export async function generateRecipeDirections(recipeName: string, ingredients: string[]): Promise<string[] | null> {
  const result = await callGroqJSON(
    'You are a cooking instructor writing clear, simple, numbered step-by-step directions for a home cook. ' +
    'Use the given recipe name and ingredient list. Keep each step short and concrete — one action per step. ' +
    'Do not include ingredient quantities not implied by the ingredient list. 4-10 steps.',
    { recipeName, ingredients },
    DirectionsSchema
  );
  return result?.steps || null;
}

/**
 * Generates one new recipe on demand when a search doesn't match
 * anything in the built-in database — e.g. someone searches "jollof
 * rice" and it isn't in RECIPES. Returns a Recipe in the exact same
 * shape as the built-in catalog so it can sit in the same list, be
 * saved, and feed the grocery list identically. Returns null on any
 * failure; the caller just doesn't show a result rather than crashing.
 */
export async function generateRecipeWithAI(query: string): Promise<Recipe | null> {
  const result = await callGroqJSON(
    'You are a recipe writer for an ADHD-friendly cooking app. Create one simple, realistic, ' +
    'home-cookable recipe matching the request. Keep ingredient lists short and practical.',
    { request: query },
    GeneratedRecipeSchema
  );
  if (!result) return null;

  return {
    id: `ai-${slugify(result.name)}-${generateId('r')}`,
    n: result.name,
    c: (result.cuisine || 'american').toLowerCase(),
    t: result.mealType,
    pro: result.protein,
    carb: result.carbs,
    fat: result.fat,
    cal: result.calories,
    ing: result.ingredients,
    g: result.groceryKeywords,
    prep: result.prepTime,
    cook: result.cookTime,
  };
}
