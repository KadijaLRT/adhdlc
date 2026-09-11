import type { FoodItem } from '@/content/foodDatabase';

/**
 * Open Food Facts (openfoodfacts.org) — a free, open, collaboratively
 * maintained product database with no API key required and full CORS
 * support for client-side use. Chosen specifically because it's
 * barcode-native: the same API and the same response shape power both
 * text search and barcode lookup, so one integration covers both.
 *
 * This is real third-party data, not guaranteed lab-verified for every
 * single product (it's community-maintained, similar in spirit to
 * Wikipedia) — generally reliable for well-known packaged products,
 * less complete for less common or regional items. The local curated
 * database still exists as an instant, always-available fallback.
 */

const BASE_URL = 'https://world.openfoodfacts.org';

interface OffNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal_serving'?: number;
  proteins_100g?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: OffNutriments;
}

function productToFoodItem(product: OffProduct): FoodItem | null {
  const name = product.product_name_en || product.product_name;
  if (!name) return null;

  const n = product.nutriments || {};
  // Prefer per-serving values when the product actually defines a
  // serving size; otherwise fall back to per-100g, which every product
  // in the database has.
  const usingServing = !!product.serving_size && n['energy-kcal_serving'] !== undefined;
  const calories = usingServing ? n['energy-kcal_serving'] : n['energy-kcal_100g'];
  if (calories === undefined) return null; // no usable calorie data — skip rather than show a broken entry

  const protein = (usingServing ? n.proteins_serving : n.proteins_100g) || 0;
  const carbs = (usingServing ? n.carbohydrates_serving : n.carbohydrates_100g) || 0;
  const fat = (usingServing ? n.fat_serving : n.fat_100g) || 0;

  return {
    id: `off-${product.code || name}`,
    name: product.brands ? `${name} (${product.brands})` : name,
    servingLabel: usingServing ? (product.serving_size as string) : '100g',
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

/** Live text search against Open Food Facts. Returns [] on any failure — never throws, since this always has the local database as a fallback. */
export async function searchOpenFoodFacts(query: string): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const products: OffProduct[] = data?.products || [];
    return products.map(productToFoodItem).filter((item): item is FoodItem => item !== null).slice(0, 15);
  } catch (error) {
    console.error('openFoodFactsApi: search failed', error);
    return [];
  }
}

/** Barcode lookup. Returns null if not found or on any failure. */
export async function lookupBarcodeProduct(barcode: string): Promise<FoodItem | null> {
  // Bug fix: barcode.trim() with no fallback threw on any undefined
  // input — outside this function's own try/catch, so any caller
  // passing a bad value produced an unhandled rejection instead of the
  // graceful "not found" this function is documented to always return.
  const code = (barcode || '').trim();
  if (!code) return null;
  try {
    const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(code)}.json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.status !== 1 || !data?.product) return null;
    return productToFoodItem(data.product);
  } catch (error) {
    console.error('openFoodFactsApi: barcode lookup failed', error);
    return null;
  }
}
