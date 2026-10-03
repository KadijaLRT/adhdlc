/**
 * Equipment catalog for gym filtering.
 *
 * Ids are what gets stored in `Gym.equipment` (string[]). The first six ids
 * (`dumbbell`, `barbell`, `cable`, `resistance_band`, `bodyweight`, and the
 * legacy `machine`) already existed in saved data, so nothing needs migrating:
 * old values keep working and `machine` is expanded by `expandLegacyTokens`.
 */

export interface EquipmentItem {
  id: string;
  label: string;
}

export interface EquipmentGroup {
  id: string;
  label: string;
  items: EquipmentItem[];
}

export const EQUIPMENT_GROUPS: EquipmentGroup[] = [
  {
    id: 'free',
    label: 'Free weights and basics',
    items: [
      { id: 'dumbbell', label: 'Dumbbells' },
      { id: 'barbell', label: 'Barbell, plates and rack' },
      { id: 'bench', label: 'Bench' },
      { id: 'kettlebell', label: 'Kettlebells' },
      { id: 'ez_bar', label: 'EZ bar' },
      { id: 'trap_bar', label: 'Trap bar' },
      { id: 'safety_bar', label: 'Safety squat bar' },
      { id: 'weight_plate', label: 'Weight plates' },
      { id: 'landmine', label: 'Landmine / barbell corner' },
      { id: 'smith', label: 'Smith machine' },
      { id: 'resistance_band', label: 'Resistance bands' },
      { id: 'medicine_ball', label: 'Medicine ball' },
      { id: 'stability_ball', label: 'Stability ball' },
      { id: 'box', label: 'Plyo box' },
      { id: 'ab_wheel', label: 'Ab wheel' },
      { id: 'weight_vest', label: 'Weight vest' },
      { id: 'gripper', label: 'Grip trainer' },
      { id: 'wrist_roller', label: 'Wrist roller' },
    ],
  },
  {
    id: 'bars',
    label: 'Bars and rings',
    items: [
      { id: 'pullup_bar', label: 'Pull-up bar' },
      { id: 'dip_bars', label: 'Dip bars' },
      { id: 'rings', label: 'Gymnastic rings' },
      { id: 'preacher_bench', label: 'Preacher bench' },
    ],
  },
  {
    id: 'cable',
    label: 'Cables',
    items: [
      { id: 'cable', label: 'Cable station' },
      { id: 'lat_pulldown', label: 'Lat pulldown' },
    ],
  },
  {
    id: 'legs',
    label: 'Leg and glute machines',
    items: [
      { id: 'leg_press', label: 'Leg press' },
      { id: 'vertical_leg_press', label: 'Vertical leg press' },
      { id: 'leg_extension', label: 'Leg extension' },
      { id: 'leg_curl_lying', label: 'Lying leg curl' },
      { id: 'leg_curl_seated', label: 'Seated leg curl' },
      { id: 'leg_curl_standing', label: 'Standing leg curl' },
      { id: 'hack_squat', label: 'Hack squat' },
      { id: 'pendulum_squat', label: 'Pendulum squat' },
      { id: 'belt_squat', label: 'Belt squat' },
      { id: 'hip_abductor', label: 'Hip abductor' },
      { id: 'hip_adductor', label: 'Hip adductor' },
      { id: 'hip_thrust_machine', label: 'Hip thrust machine' },
      { id: 'glute_kickback_machine', label: 'Glute kickback machine' },
      { id: 'hip_flexor_machine', label: 'Standing hip flexor machine' },
      { id: 'calf_standing', label: 'Standing calf raise' },
      { id: 'calf_seated', label: 'Seated calf raise' },
      { id: 'donkey_calf', label: 'Donkey calf raise' },
      { id: 'ghr', label: 'Glute-ham raise bench' },
      { id: 'reverse_hyper', label: 'Reverse hyper' },
    ],
  },
  {
    id: 'upper',
    label: 'Upper body and core machines',
    items: [
      { id: 'chest_press', label: 'Chest press' },
      { id: 'pec_deck', label: 'Pec deck / rear delt fly' },
      { id: 'shoulder_press_machine', label: 'Shoulder press' },
      { id: 'lateral_raise_machine', label: 'Lateral raise machine' },
      { id: 'row_machine', label: 'Seated row machine' },
      { id: 't_bar_row', label: 'T-bar row' },
      { id: 'assisted_pullup', label: 'Assisted pull-up / dip' },
      { id: 'bicep_curl_machine', label: 'Bicep curl machine' },
      { id: 'tricep_extension_machine', label: 'Tricep extension machine' },
      { id: 'back_extension', label: 'Back extension bench' },
      { id: 'captains_chair', label: "Captain's chair" },
      { id: 'crunch_machine', label: 'Ab crunch machine' },
    ],
  },
  {
    id: 'cardio',
    label: 'Cardio and conditioning',
    items: [
      { id: 'treadmill', label: 'Treadmill' },
      { id: 'elliptical', label: 'Elliptical' },
      { id: 'stair_climber', label: 'Stair climber' },
      { id: 'arc_trainer', label: 'ARC trainer' },
      { id: 'rower', label: 'Rowing machine' },
      { id: 'stationary_bike', label: 'Stationary bike' },
      { id: 'sled', label: 'Sled' },
    ],
  },
];

/** Old coarse token that meant "some machines". Kept readable, never written again. */
export const LEGACY_MACHINE_TOKEN = 'machine';

export const EQUIPMENT_LABELS: Record<string, string> = Object.fromEntries(
  EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label] as const)),
);

/** Old coarse token that meant "some machines". Kept readable, never written again. */

/**
 * What old saved tokens expand to. Nothing is written back until the person
 * edits the gym, so no stored data is migrated or lost.
 * - machine: the machines almost every commercial gym has. Specialty gear
 *   (hack squat, hip thrust machine, sled, landmine, GHR, T-bar, etc.) is NOT assumed.
 * - dumbbell: dumbbells come with a bench almost everywhere.
 * - cable: cable stations come with a lat pulldown almost everywhere.
 */
/** Cardio machines nearly every gym has. New gyms start with these ticked, and old "machine" gyms get them. */
export const CARDIO_MACHINE_IDS: readonly string[] = ['treadmill', 'elliptical', 'stair_climber', 'arc_trainer', 'rower', 'stationary_bike'];

export const LEGACY_MACHINE_EXPANSION: readonly string[] = [
  'leg_press',
  'leg_extension',
  'leg_curl_lying',
  'leg_curl_seated',
  'hip_abductor',
  'hip_adductor',
  'calf_seated',
  'calf_standing',
  'chest_press',
  'pec_deck',
  'shoulder_press_machine',
  'row_machine',
  'assisted_pullup',
  'lat_pulldown',
  ...CARDIO_MACHINE_IDS,
];

const LEGACY_EXPANSIONS: Record<string, readonly string[]> = {
  [LEGACY_MACHINE_TOKEN]: LEGACY_MACHINE_EXPANSION,
  dumbbell: ['dumbbell', 'bench'],
  cable: ['cable', 'lat_pulldown'],
};

/**
 * Written by the equipment picker so a saved list is known to be explicit.
 * Without it, old lists get the implied extras above; with it, exactly what is
 * ticked is what the gym has (so someone can have dumbbells and no bench).
 */
export const EQUIPMENT_FORMAT_MARKER = 'v2';

/** Expands old coarse tokens into specific ids and strips the marker. Pure, de-duplicated, order-stable. */
export function expandLegacyTokens(tokens: readonly string[] | null | undefined): string[] {
  const list = (tokens || []).filter((t): t is string => typeof t === 'string');
  const explicit = list.includes(EQUIPMENT_FORMAT_MARKER);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  };
  for (const raw of list) {
    const t = raw.trim();
    if (!t || t === EQUIPMENT_FORMAT_MARKER) continue;
    if (explicit && t !== LEGACY_MACHINE_TOKEN) push(t);
    else (LEGACY_EXPANSIONS[t] || [t]).forEach(push);
  }
  return out;
}

/** True while a gym still holds the old coarse `machine` token and should be reviewed once. */
export function hasLegacyMachineToken(tokens: readonly string[] | null | undefined): boolean {
  return (tokens || []).includes(LEGACY_MACHINE_TOKEN);
}
