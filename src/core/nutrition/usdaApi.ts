import type { FoodItem } from '@/content/foodDatabase';

/**
 * USDA FoodData Central — the US government's verified nutrition
 * database, free and public. Requires an API key, but works
 * immediately with the shared DEMO_KEY (rate-limited: ~30 requests/
 * hour, 50/day, fine for occasional personal use). For anyone using
 * this regularly, get a free key in about 30 seconds at
 * https://api.data.gov/signup and set EXPO_PUBLIC_USDA_API_KEY — no
 * cost, no credit card, just removes the rate limit.
 */

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';

interface UsdaNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  foodNutrients?: UsdaNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

// USDA nutrient IDs for the four values this app tracks.
const NUTRIENT_IDS = { calories: 1008, protein: 1003, carbs: 1005, fat: 1004 };

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nutrientValue(nutrients: UsdaNutrient[] | undefined, id: number): number {
  const match = nutrients?.find((n) => n.nutrientId === id);
  return toFiniteNumber(match?.value, 0);
}

function foodToFoodItem(food: UsdaFood): FoodItem | null {
  if (!food?.description) return null;
  const rawCal = food.foodNutrients?.find((n) => n.nutrientId === NUTRIENT_IDS.calories)?.value;
  const calories = toFiniteNumber(rawCal, Number.NaN);
  if (!Number.isFinite(calories) || calories < 0) return null; // no usable calorie data — skip rather than show a broken entry

  const servingSize = toFiniteNumber(food.servingSize, 0);
  const servingLabel =
    servingSize > 0 && food.servingSizeUnit
      ? `${servingSize}${food.servingSizeUnit}`
      : '100g';

  return {
    id: `usda-${food.fdcId}`,
    name: food.description,
    servingLabel,
    calories: Math.round(calories),
    protein: Math.round(nutrientValue(food.foodNutrients, NUTRIENT_IDS.protein)),
    carbs: Math.round(nutrientValue(food.foodNutrients, NUTRIENT_IDS.carbs)),
    fat: Math.round(nutrientValue(food.foodNutrients, NUTRIENT_IDS.fat)),
  };
}

/** Live search against USDA FoodData Central. Returns [] on any failure — never throws. */
export async function searchUsdaFoods(query: string): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `${BASE_URL}/foods/search?api_key=${encodeURIComponent(API_KEY)}&query=${encodeURIComponent(q)}&pageSize=15&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) console.error('usdaApi: rate limit hit — consider setting EXPO_PUBLIC_USDA_API_KEY');
      return [];
    }
    const data = await response.json();
    const foods: UsdaFood[] = data?.foods || [];
    return foods.map(foodToFoodItem).filter((item): item is FoodItem => item !== null).slice(0, 15);
  } catch (error) {
    console.error('usdaApi: search failed', error);
    return [];
  }
}
