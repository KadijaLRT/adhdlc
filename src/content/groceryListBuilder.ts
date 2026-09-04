import { GROCERY_CATEGORIES } from './groceryCategories';

export interface GroceryListItem {
  ingredient: string;
  category: string;
}

/**
 * Groups a flat ingredient list (usually pulled from one or more
 * recipes' `g` field) under the same category headers used elsewhere,
 * so a meal plan can become a shoppable, organized list in one step.
 */
export function buildGroceryList(ingredients: string[]): GroceryListItem[] {
  const seen = new Set<string>();
  const result: GroceryListItem[] = [];

  for (const raw of ingredients || []) {
    const ingredient = (raw || '').toLowerCase().trim();
    if (!ingredient || seen.has(ingredient)) continue;
    seen.add(ingredient);

    let category = 'Other';
    for (const [categoryLabel, keywords] of Object.entries(GROCERY_CATEGORIES || {})) {
      if ((keywords || []).some((kw) => ingredient.includes(kw))) {
        category = categoryLabel;
        break;
      }
    }
    result.push({ ingredient, category });
  }

  return result.sort((a, b) => a.category.localeCompare(b.category));
}

export interface MergedGroceryItem {
  ingredient: string;
  category: string;
  usedFor: string[];
}

/**
 * Aggregates ingredients across multiple recipes into one shopping list:
 * same ingredient mentioned in several recipes becomes one line with a
 * "used for" list, rather than duplicate entries. Anything already in
 * the pantry is excluded entirely, since the whole point of a pantry
 * list is not re-buying what's already owned.
 */
export function buildMergedGroceryList(
  recipes: { n: string; g: string[] }[],
  pantryItems: string[]
): MergedGroceryItem[] {
  const pantryLower = (pantryItems || []).map((p) => p.toLowerCase().trim()).filter(Boolean);
  // Bug fix: this used to be an exact-string Set membership check —
  // a pantry item typed as "eggs" never matched a recipe ingredient
  // like "2 large eggs, beaten", since they're not byte-identical
  // strings. That silently defeated the entire point of the pantry
  // feature: the grocery list kept listing things the person had
  // already explicitly said they own. Switched to the same
  // substring-inclusion matching matchScore (GroceryScreen.tsx)
  // already uses for recipe suggestions, so pantry matching behaves
  // consistently everywhere it's used in this app.
  const isInPantry = (ingredient: string) => pantryLower.some((p) => ingredient.includes(p));
  const merged = new Map<string, MergedGroceryItem>();

  for (const recipe of recipes || []) {
    for (const rawIngredient of recipe.g || []) {
      const ingredient = (rawIngredient || '').toLowerCase().trim();
      if (!ingredient || isInPantry(ingredient)) continue;

      const existing = merged.get(ingredient);
      if (existing) {
        if (!existing.usedFor.includes(recipe.n)) existing.usedFor.push(recipe.n);
      } else {
        let category = 'Other';
        for (const [categoryLabel, keywords] of Object.entries(GROCERY_CATEGORIES || {})) {
          if ((keywords as string[]).some((kw) => ingredient.includes(kw))) {
            category = categoryLabel;
            break;
          }
        }
        merged.set(ingredient, { ingredient, category, usedFor: [recipe.n] });
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.category.localeCompare(b.category));
}
