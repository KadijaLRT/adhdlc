import type { EnergyLevel } from '@/store/index';

export interface MealSuggestion {
  id: string; title: string; ingredients: string[];
  suitableEnergyLevels: EnergyLevel[]; prepMinutes: number;
}

// Deliberately small and low-friction. Low energy days get near-zero-prep
// options; the list never grows to the point of choice paralysis.
export const MEAL_SUGGESTIONS: MealSuggestion[] = [
  { id: 'toast-eggs', title: 'Eggs and toast', ingredients: ['egg', 'wheat'], suitableEnergyLevels: ['low', 'medium'], prepMinutes: 5 },
  { id: 'salmon-veg', title: 'Salmon with roasted vegetables', ingredients: ['salmon', 'broccoli', 'olive oil'], suitableEnergyLevels: ['medium', 'high'], prepMinutes: 25 },
  { id: 'tofu-stirfry', title: 'Tofu and vegetable stir fry', ingredients: ['tofu', 'spinach', 'rice', 'olive oil'], suitableEnergyLevels: ['medium', 'high'], prepMinutes: 20 },
  { id: 'yogurt-bowl', title: 'Yogurt and fruit bowl', ingredients: ['dairy', 'fruits', 'walnut'], suitableEnergyLevels: ['low'], prepMinutes: 3 },
  { id: 'lamb-potato', title: 'Lamb with roasted potato', ingredients: ['lamb', 'potato', 'leafy green'], suitableEnergyLevels: ['medium', 'high'], prepMinutes: 30 },
];

// Energy level always filters (hard constraint).
export function getMealSuggestions(energyLevel: EnergyLevel): MealSuggestion[] {
  return (MEAL_SUGGESTIONS || []).filter((m) => (m.suitableEnergyLevels || []).includes(energyLevel));
}
