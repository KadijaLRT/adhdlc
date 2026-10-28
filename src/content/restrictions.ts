import type { ExerciseKind } from './exerciseCatalog';
import { MORE_RESTRICTIONS } from './restrictionsMore';

/**
 * Physical limits and weak spots a person can tell the app about, and what the
 * app does with them:
 *  - `corrective`: commonly used strengthening and control work for the area,
 *    in priority order (most useful and gentlest first). Every id must exist in
 *    the exercise list; a test checks that.
 *  - `avoid`: moves that often bother this area. They are left out of anything
 *    the app picks on its own, but are never hidden when browsing, searching or
 *    swapping, where they carry a warning instead.
 *
 * This is general guidance, not a diagnosis or treatment plan. The wording in
 * RESTRICTIONS_DISCLAIMER is shown wherever restrictions are chosen.
 */

export type RestrictionSection = 'knee' | 'leg' | 'hip' | 'pelvic' | 'back' | 'upper' | 'general';

export interface AvoidRule {
  /** Exercise ids to keep out of automatic picks. */
  ids: readonly string[];
  /** Whole movement kinds to keep out (for example every jumping move). */
  kinds: readonly ExerciseKind[];
}

export interface Restriction {
  id: string;
  label: string;
  section: RestrictionSection;
  /** One plain-language line describing what this usually feels like. */
  summary: string;
  /** Why the strengthening list looks the way it does. */
  why: string;
  corrective: readonly string[];
  avoid: AvoidRule;
  /** Extra safety note shown on the detail line, when one matters. */
  caution?: string;
}

export const RESTRICTION_SECTIONS: { id: RestrictionSection; label: string }[] = [
  { id: 'knee', label: 'Knees' },
  { id: 'leg', label: 'Lower legs, ankles and feet' },
  { id: 'hip', label: 'Hips and thighs' },
  { id: 'pelvic', label: 'Pelvic floor, pregnancy and postpartum' },
  { id: 'back', label: 'Back and core' },
  { id: 'upper', label: 'Shoulders, arms, wrists and neck' },
  { id: 'general', label: 'Whole body and health conditions' },
];

export const RESTRICTIONS_DISCLAIMER =
  'General guidance, not medical advice. This picks gentle, commonly used strengthening and steers away from moves that often bother these areas. It cannot diagnose anything. Stop if something hurts sharply or gets worse, and see a doctor or physical therapist for pain that lasts, swelling, numbness, or anything after an injury.';

/** Impact work that loads the lower leg, shin, heel and knee. */
const RUNNING_STYLE_CARDIO = ['high-knees', 'butt-kicks'] as const;

const CORE_RESTRICTIONS: readonly Restriction[] = [
  // Knees
  {
    id: 'runners_knee',
    label: "Runner's knee",
    section: 'knee',
    summary: 'Aching around or behind the kneecap, worse with stairs, running or deep squats.',
    why: 'The main physical therapy guideline recommends combined hip and thigh strengthening, such as squats, step-downs, lunges and band hip work, so the work centers on those. Running-style impact is paused to lower the load.',
    corrective: [
      'clamshells', 'lateral-walk-with-band', 'glute-bridge', 'terminal-knee-extension',
      'chair-squat', 'standing-hip-abduction-against-band', 'step-up', 'shallow-body-weight-lunge', 'reverse-body-weight-lunge',
    ],
    avoid: {
      kinds: ['plyo'],
      ids: ['stair-climber', ...RUNNING_STYLE_CARDIO],
    },
    caution: 'Guidelines favor many light repetitions, up to 3 sets of 30, three times a week, as tolerated. Start well below that. Keep the work pain-free or mild, and ease off if pain sharpens.',
  },
  {
    id: 'patellar_tendinopathy',
    label: "Jumper's knee",
    section: 'knee',
    summary: 'Pain just below the kneecap that flares with jumping, sprinting or after sitting.',
    why: 'Slow, steady loading of the thigh and calf helps the tendon cope, while jumping and fast knee extension are paused.',
    corrective: ['wall-sit', 'terminal-knee-extension', 'half-air-squat', 'leg-press', 'glute-bridge', 'heel-raise'],
    avoid: {
      kinds: ['plyo'],
      ids: ['leg-extension', 'one-legged-leg-extension', 'standing-cable-leg-extension', ...RUNNING_STYLE_CARDIO],
    },
    caution: 'Go slowly: three seconds down, three seconds up. A mild ache that settles within a day is usually fine.',
  },
  {
    id: 'it_band_pain',
    label: 'IT band pain',
    section: 'knee',
    summary: 'Pain on the outside of the knee or thigh, often building during a run.',
    why: 'Weak outer hip muscles are a common partner to this pain, so the work builds hip abductors, glutes and side core.',
    corrective: [
      'clamshells', 'side-plank', 'standing-hip-abduction-against-band', 'lateral-walk-with-band',
      'glute-bridge', 'banded-side-kicks', 'hip-abduction-machine',
    ],
    avoid: { kinds: [], ids: [] },
    caution: 'Running volume and hills often drive this. Nothing in this app changes your running, so ease that back too if it flares.',
  },

  // Lower legs, ankles and feet
  {
    id: 'shin_splints',
    label: 'Shin splints',
    section: 'leg',
    summary: 'Aching along the inner or front edge of the shin during or after impact work.',
    why: 'Stronger calves and shin muscles absorb impact better, and impact moves are paused while it settles.',
    corrective: [
      'tibialis-raise', 'tibialis-band-pull', 'heel-raise', 'eccentric-heel-drop',
      'heel-walk', 'standing-calf-raise', 'short-foot', 'glute-bridge',
    ],
    avoid: { kinds: ['plyo'], ids: [...RUNNING_STYLE_CARDIO] },
    caution: 'Pain at one exact spot on the bone, or pain at rest, deserves a check for a stress injury.',
  },
  {
    id: 'achilles_pain',
    label: 'Achilles pain',
    section: 'leg',
    summary: 'Stiffness or pain at the back of the heel or just above it, often worst first thing in the morning.',
    why: 'The 2024 physical therapy guideline gives gradually loaded calf work (heavy and slow, at least three times a week) its top recommendation. Stretching is only an extra, mainly for stiff ankles. Jumping and sprinting are paused as a later step.',
    corrective: [
      'eccentric-heel-drop', 'heel-raise', 'standing-calf-raise', 'seated-calf-raise',
      'tibialis-raise', 'single-leg-balance', 'glute-bridge',
    ],
    avoid: { kinds: ['plyo'], ids: [...RUNNING_STYLE_CARDIO] },
    caution: 'Stay within tolerable pain and build the load gradually. If the pain sits low, right where the tendon meets the heel bone, lower your heel only to flat, not below the step.',
  },
  {
    id: 'plantar_fasciitis',
    label: 'Plantar fasciitis',
    section: 'leg',
    summary: 'Heel or arch pain, usually sharpest with the first steps after rest.',
    why: 'Strong calves and foot muscles help share the load that the plantar fascia carries.',
    corrective: [
      'heel-raise', 'standing-calf-raise', 'seated-calf-raise', 'short-foot',
      'tibialis-raise', 'single-leg-balance',
    ],
    avoid: { kinds: ['plyo'], ids: [...RUNNING_STYLE_CARDIO] },
  },
  {
    id: 'ankle_instability',
    label: 'Weak or rolled ankles',
    section: 'leg',
    summary: 'Ankles that roll easily or feel wobbly on one leg.',
    why: 'Balance and lower-leg strength teach the ankle to stay steady, and cutting or jumping moves are paused.',
    corrective: [
      'single-leg-balance', 'heel-raise', 'tibialis-raise', 'tibialis-band-pull',
      'short-foot', 'eccentric-heel-drop', 'heel-walk',
    ],
    avoid: { kinds: ['plyo'], ids: [] },
    caution: 'Stand next to something you can grab while you work on balance.',
  },

  // Hips, pelvis and thighs
  {
    id: 'weak_hips',
    label: 'Weak hips',
    section: 'hip',
    summary: 'Hips drop or knees cave in when you stand on one leg, squat or step.',
    why: 'Outer hip and glute strength keeps the pelvis and knees steady, so the work builds those muscles and side core.',
    corrective: [
      'clamshells', 'lateral-walk-with-band', 'standing-hip-abduction-against-band', 'side-plank',
      'glute-bridge', 'hip-abduction-machine', 'banded-hip-march', 'fire-hydrants',
    ],
    avoid: { kinds: [], ids: [] },
  },
  {
    id: 'weak_glutes',
    label: 'Weak or sleepy glutes',
    section: 'hip',
    summary: 'Hard to feel your glutes working, with the lower back or hamstrings taking over.',
    why: 'Simple, well-controlled glute work first, then heavier hip extension once you can feel the right muscles.',
    corrective: [
      'glute-bridge', 'clamshells', 'banded-side-kicks', 'donkey-kicks', 'fire-hydrants',
      'one-legged-glute-bridge', 'hip-thrust', 'cable-glute-kickback', 'hip-thrust-machine',
    ],
    avoid: { kinds: [], ids: [] },
  },
  {
    id: 'weak_pelvic_floor',
    label: 'Weak pelvic floor',
    section: 'pelvic',
    summary: 'Leaking with coughing, laughing or jumping, or a feeling of heaviness or pressure.',
    why: 'Breathing, gentle pelvic floor contractions and low-pressure core and hip work come first, and impact moves are paused.',
    corrective: [
      'diaphragmatic-breathing', 'pelvic-floor-contraction', 'glute-bridge', 'dead-bug',
      'bird-dog', 'adductor-squeeze', 'clamshells', 'chair-squat',
    ],
    avoid: { kinds: ['plyo'], ids: [...RUNNING_STYLE_CARDIO] },
    caution: 'Breathe out on effort and never hold your breath or bear down. Leaking, heaviness, or pain are worth seeing a pelvic floor physical therapist about, and these moves do not replace that.',
  },
  {
    id: 'hamstring_strain',
    label: 'Hamstring strains that return',
    section: 'hip',
    summary: 'Pulls or tightness at the back of the thigh that keep coming back.',
    why: 'Gradual hamstring and glute strength, ending with slow lowering work, helps the muscle handle load.',
    corrective: [
      'glute-bridge', 'one-legged-glute-bridge', 'seated-leg-curl', 'lying-leg-curl',
      'dumbbell-romanian-deadlift', 'single-leg-romanian-deadlift', 'nordic-hamstring-eccentric',
    ],
    avoid: { kinds: ['plyo'], ids: [] },
    caution: 'Add the harder moves only once a recent strain has healed and you can walk and jog without pain.',
  },

  // Back and core
  {
    id: 'low_back_pain',
    label: 'Lower back pain or stiffness',
    section: 'back',
    summary: 'Ache or stiffness in the lower back without pain shooting down the leg.',
    why: 'Core endurance that holds the spine steady (bracing, side plank, bird dog) plus glute strength, with repeated spine bending paused.',
    corrective: [
      'bird-dog', 'dead-bug', 'side-plank', 'glute-bridge', 'plank', 'pallof-press', 'kneeling-plank',
    ],
    avoid: {
      kinds: [],
      ids: [
        'good-morning', 'sit-up', 'jackknife-sit-up', 'hanging-sit-up', 'v-up', 'russian-twist',
        'core-twist', 'hanging-windshield-wiper', 'jefferson-curl',
      ],
    },
    caution: 'Numbness, leg weakness, or any change in bladder or bowel control needs urgent medical care.',
  },
  {
    id: 'weak_core',
    label: 'Weak core',
    section: 'back',
    summary: 'Trouble keeping your middle steady during lifts, planks or carrying.',
    why: 'Holding positions steady and resisting movement builds the core control other lifts depend on.',
    corrective: [
      'plank', 'dead-bug', 'bird-dog', 'side-plank', 'pallof-press', 'kneeling-plank', 'hollow-hold',
    ],
    avoid: { kinds: [], ids: [] },
  },

  // Shoulders, arms and neck
  {
    id: 'shoulder_pain',
    label: 'Shoulder pain with overhead or pressing work',
    section: 'upper',
    summary: 'Pinching or pain when lifting your arm overhead or pressing.',
    why: 'Rotator cuff and upper back control keep the shoulder centered, and heavy overhead pressing is paused.',
    corrective: [
      'band-external-shoulder-rotation', 'face-pull', 'band-pull-apart', 'lying-dumbbell-external-shoulder-rotation',
      'cable-external-shoulder-rotation', 'banded-face-pull', 'dumbbell-horizontal-external-shoulder-rotation',
      'wall-slide', 'prone-t-raise',
    ],
    avoid: {
      kinds: [],
      ids: [
        'overhead-press', 'seated-barbell-overhead-press', 'push-press', 'kettlebell-push-press',
        'dumbbell-shoulder-press', 'seated-dumbbell-shoulder-press', 'arnold-press', 'machine-shoulder-press',
        'seated-smith-machine-shoulder-press', 'kettlebell-press', 'seated-kettlebell-press', 'z-press',
        'barbell-upright-row', 'bar-dip', 'assisted-dip',
      ],
    },
    caution: 'Keep the weight very light on rotation work; it should feel like a muscle working, not a pinch.',
  },
  {
    id: 'elbow_tendon_pain',
    label: "Tennis or golfer's elbow",
    section: 'upper',
    summary: 'Pain on the outer or inner elbow, worse with gripping, lifting or twisting.',
    why: 'Slow, light wrist and forearm strengthening helps the tendon, and heavy gripping is paused.',
    corrective: [
      'dumbbell-wrist-extension', 'dumbbell-wrist-curl', 'barbell-wrist-extension', 'barbell-wrist-curl', 'plate-wrist-curl',
      'isometric-wrist-extension', 'isometric-wrist-flexion',
    ],
    avoid: {
      kinds: [],
      ids: [
        'bar-hang', 'one-handed-bar-hang', 'plate-pinch', 'gripper', 'wrist-roller',
        'towel-pull-up', 'fat-bar-deadlift', 'farmers-walk', 'towel-row',
      ],
    },
    caution: 'Research supports slow holds, lifts and lowering for this tendon. Use a light weight, take three seconds to lower each rep, and stop if the pain becomes disabling. Holding back heavy gripping is a cautious choice, not a requirement.',
  },
  {
    id: 'posture_upper',
    label: 'Rounded shoulders or desk posture',
    section: 'upper',
    summary: 'Shoulders that roll forward and an upper back that feels tight or tired.',
    why: 'Strengthening the upper back and rear shoulders balances out a lot of time spent reaching forward.',
    corrective: [
      'face-pull', 'band-pull-apart', 'banded-face-pull', 'band-external-shoulder-rotation',
      'chin-tuck', 'reverse-dumbbell-flyes', 'superman-raise', 'chest-supported-dumbbell-row',
      'wall-slide', 'prone-t-raise',
    ],
    avoid: { kinds: [], ids: [] },
  },
  {
    id: 'neck_tension',
    label: 'Neck tension',
    section: 'upper',
    summary: 'A tight neck, or a head that drifts forward, especially after screen time.',
    why: 'Deep neck muscle control and upper back strength share the work that the neck is doing alone.',
    corrective: [
      'chin-tuck', 'face-pull', 'band-pull-apart', 'banded-face-pull', 'reverse-dumbbell-flyes', 'lying-neck-curl',
    ],
    avoid: { kinds: [], ids: [] },
    caution: 'Neck pain with arm numbness, headaches that are new, or dizziness should be checked by a doctor.',
  },
];

export const RESTRICTIONS: readonly Restriction[] = [...CORE_RESTRICTIONS, ...MORE_RESTRICTIONS];

export const RESTRICTION_IDS: readonly string[] = RESTRICTIONS.map((r) => r.id);

const BY_ID: Record<string, Restriction> = Object.fromEntries(RESTRICTIONS.map((r) => [r.id, r]));

export function getRestriction(id: string): Restriction | undefined {
  return BY_ID[id];
}

/** Turns saved ids into restrictions, dropping anything that no longer exists and any duplicates. */
export function resolveRestrictions(ids: readonly string[] | null | undefined): Restriction[] {
  const seen = new Set<string>();
  const out: Restriction[] = [];
  for (const id of ids || []) {
    const r = BY_ID[id];
    if (r && !seen.has(id)) {
      seen.add(id);
      out.push(r);
    }
  }
  return out;
}

export type CorrectiveMode = 'warmup' | 'mixed' | 'routine';

export const CORRECTIVE_MODES: { id: CorrectiveMode; label: string; hint: string }[] = [
  { id: 'warmup', label: 'Warm-up block', hint: 'A few targeted moves at the start of every workout' },
  { id: 'mixed', label: 'Mixed into workouts', hint: 'One targeted move takes a spot in each workout' },
  { id: 'routine', label: 'Separate routine', hint: 'A short routine you can start on its own' },
];

export const ALL_CORRECTIVE_MODES: readonly CorrectiveMode[] = CORRECTIVE_MODES.map((m) => m.id);
