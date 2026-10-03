import { CARDIO_MACHINE_IDS, EQUIPMENT_FORMAT_MARKER } from './equipment';

/**
 * Starting equipment lists for common gyms. These are TYPICAL, not exact:
 * equipment differs by location, even within one chain, so picking a preset
 * only fills the checklist and the person can tick or untick anything.
 *
 * `basis` says how each list was put together:
 * - 'published': built from the equipment the chain or public guides to it describe
 * - 'typical': a standard list for that kind of gym, not checked against that chain's own list
 */

export type GymPresetCategory = 'budget' | 'big_box' | 'convenience' | 'community' | 'studio';

export interface GymPreset {
  id: string;
  name: string;
  category: GymPresetCategory;
  basis: 'published' | 'typical';
  equipment: string[];
  note?: string;
}

export const GYM_PRESET_CATEGORIES: { id: GymPresetCategory; label: string }[] = [
  { id: 'budget', label: 'Budget gyms' },
  { id: 'big_box', label: 'Full-service gyms' },
  { id: 'convenience', label: '24-hour and convenience gyms' },
  { id: 'community', label: 'Community centers' },
  { id: 'studio', label: 'Studios' },
];

const CARDIO_CORE = ['treadmill', 'elliptical', 'stationary_bike', 'stair_climber', 'rower'];

const SELECTORIZED_CORE = [
  'chest_press', 'pec_deck', 'shoulder_press_machine', 'lat_pulldown', 'row_machine', 'assisted_pullup',
  'leg_press', 'leg_extension', 'leg_curl_seated', 'leg_curl_lying', 'hip_abductor', 'hip_adductor',
  'calf_standing', 'back_extension', 'crunch_machine', 'cable',
];

const FREE_WEIGHTS_FULL = ['dumbbell', 'bench', 'barbell', 'weight_plate', 'ez_bar', 'smith', 'kettlebell', 'medicine_ball'];

const FULL_SERVICE = [
  ...CARDIO_CORE, 'arc_trainer',
  ...SELECTORIZED_CORE, 'bicep_curl_machine', 'tricep_extension_machine', 'calf_seated', 'glute_kickback_machine',
  'hack_squat', 't_bar_row', 'preacher_bench', 'captains_chair',
  ...FREE_WEIGHTS_FULL, 'pullup_bar', 'dip_bars', 'resistance_band', 'stability_ball', 'box',
];

const CONVENIENCE = [
  ...CARDIO_CORE,
  'chest_press', 'pec_deck', 'shoulder_press_machine', 'lat_pulldown', 'row_machine',
  'leg_press', 'leg_extension', 'leg_curl_lying', 'calf_standing', 'back_extension', 'cable',
  'dumbbell', 'bench', 'barbell', 'weight_plate', 'ez_bar', 'smith', 'pullup_bar',
];

function make(preset: Omit<GymPreset, 'equipment'> & { equipment: string[] }): GymPreset {
  return { ...preset, equipment: Array.from(new Set(preset.equipment)) };
}

export const GYM_PRESETS: GymPreset[] = [
  make({
    id: 'planet-fitness', name: 'Planet Fitness', category: 'budget', basis: 'published',
    note: 'Dumbbells, Smith machines and machines, but no barbell and rack setups, kettlebells or deadlift platforms.',
    equipment: [
      ...CARDIO_CORE, 'arc_trainer',
      'chest_press', 'pec_deck', 'shoulder_press_machine', 'lat_pulldown', 'row_machine', 'assisted_pullup',
      'bicep_curl_machine', 'tricep_extension_machine', 'lateral_raise_machine', 'leg_press', 'leg_extension',
      'leg_curl_seated', 'leg_curl_lying', 'hip_abductor', 'hip_adductor', 'calf_standing', 'glute_kickback_machine',
      'back_extension', 'crunch_machine', 'captains_chair', 'cable', 'dumbbell', 'bench', 'smith',
    ],
  }),
  make({
    id: 'blink-fitness', name: 'Blink Fitness', category: 'budget', basis: 'typical',
    equipment: [...CARDIO_CORE, ...SELECTORIZED_CORE, 'dumbbell', 'bench', 'smith'],
  }),
  make({
    id: 'la-fitness', name: 'LA Fitness', category: 'big_box', basis: 'published',
    note: 'Free weights, barbells, benches and selectorized machines.',
    equipment: [...CARDIO_CORE, ...SELECTORIZED_CORE, 'bicep_curl_machine', 'tricep_extension_machine', 'calf_seated', ...FREE_WEIGHTS_FULL, 'pullup_bar'],
  }),
  make({
    id: 'golds-gym', name: "Gold's Gym", category: 'big_box', basis: 'published',
    note: 'Free weights, Olympic lifting platforms, selectorized and plate-loaded machines, cables, plus a turf area with sleds and kettlebells.',
    equipment: [...FULL_SERVICE, 'sled', 'landmine'],
  }),
  make({ id: '24-hour-fitness', name: '24 Hour Fitness', category: 'big_box', basis: 'typical', equipment: FULL_SERVICE }),
  make({ id: 'life-time', name: 'Life Time', category: 'big_box', basis: 'typical', equipment: [...FULL_SERVICE, 'sled', 'landmine', 'trap_bar'] }),
  make({ id: 'equinox', name: 'Equinox', category: 'big_box', basis: 'typical', equipment: [...FULL_SERVICE, 'sled', 'landmine', 'trap_bar'] }),
  make({ id: 'crunch-fitness', name: 'Crunch Fitness', category: 'big_box', basis: 'typical', equipment: FULL_SERVICE }),
  make({ id: 'eos-fitness', name: 'EoS Fitness', category: 'big_box', basis: 'typical', equipment: FULL_SERVICE }),
  make({ id: 'chuze-fitness', name: 'Chuze Fitness', category: 'big_box', basis: 'typical', equipment: FULL_SERVICE }),
  make({ id: 'ufc-gym', name: 'UFC Gym', category: 'big_box', basis: 'typical', equipment: FULL_SERVICE }),
  make({
    id: 'anytime-fitness', name: 'Anytime Fitness', category: 'convenience', basis: 'published',
    note: 'Locations are franchised and vary a lot. Deadlift platforms are only at some.',
    equipment: [
      ...CARDIO_CORE, 'chest_press', 'pec_deck', 'shoulder_press_machine', 'lat_pulldown', 'row_machine', 't_bar_row',
      'leg_press', 'leg_extension', 'leg_curl_lying', 'calf_standing', 'back_extension', 'preacher_bench', 'cable',
      'dumbbell', 'bench', 'barbell', 'weight_plate', 'ez_bar', 'smith', 'kettlebell', 'medicine_ball', 'box',
    ],
  }),
  make({ id: 'snap-fitness', name: 'Snap Fitness', category: 'convenience', basis: 'typical', equipment: CONVENIENCE }),
  make({ id: 'workout-anytime', name: 'Workout Anytime', category: 'convenience', basis: 'typical', equipment: CONVENIENCE }),
  make({ id: 'retro-fitness', name: 'Retro Fitness', category: 'convenience', basis: 'typical', equipment: CONVENIENCE }),
  make({ id: 'fitness-19', name: 'Fitness 19', category: 'convenience', basis: 'typical', equipment: CONVENIENCE }),
  make({
    id: 'ymca', name: 'YMCA', category: 'community', basis: 'published',
    note: 'Varies a lot between branches. Many have pin-loaded and plate-loaded machines, squat racks, kettlebells and a turf sled area.',
    equipment: [
      ...CARDIO_CORE, 'chest_press', 'pec_deck', 'shoulder_press_machine', 'lat_pulldown', 'row_machine',
      'leg_press', 'leg_extension', 'leg_curl_seated', 'leg_curl_lying', 'calf_standing', 'back_extension', 'cable',
      'dumbbell', 'bench', 'barbell', 'weight_plate', 'kettlebell', 'medicine_ball', 'sled', 'smith', 'resistance_band',
    ],
  }),
  make({
    id: 'orangetheory', name: 'Orangetheory Fitness', category: 'studio', basis: 'typical',
    note: 'Class based: treadmills, rowers and a dumbbell floor.',
    equipment: ['treadmill', 'rower', 'dumbbell', 'bench', 'medicine_ball', 'resistance_band'],
  }),
];

export function getGymPreset(id: string | null | undefined): GymPreset | undefined {
  return GYM_PRESETS.find((p) => p.id === id);
}

/** Equipment list in the saved format (explicit, marker included). */
export function presetEquipment(preset: GymPreset): string[] {
  return [...preset.equipment, EQUIPMENT_FORMAT_MARKER];
}

/** What "Other gym" starts with: just the cardio machines every gym has. */
export const CUSTOM_GYM_EQUIPMENT: string[] = [...CARDIO_MACHINE_IDS, EQUIPMENT_FORMAT_MARKER];

export function searchGymPresets(query: string): GymPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return GYM_PRESETS;
  return GYM_PRESETS.filter((p) => p.name.toLowerCase().includes(q));
}
