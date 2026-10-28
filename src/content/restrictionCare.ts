import type { StretchRoutine, StretchStep } from './recoveryContent';

/**
 * Warm-ups and stretches for each injury or weak spot. They are built from a
 * shared library of short, low-risk moves, so the same well-checked move is
 * worded once and reused. Each restriction picks the moves that suit it.
 *
 * "Each side" moves are stored as a pair of steps (right, then left) so the
 * guided timer walks through each side, the same way STRETCH_ROUTINES does.
 *
 * General guidance only. It is never diagnosis or treatment.
 */

type Unit = StretchStep[];

const one = (text: string, holdSeconds: number): Unit => [{ text, holdSeconds }];
const sides = (text: string, holdSeconds: number): Unit => [
  { text: `${text}, right side`, holdSeconds },
  { text: `${text}, left side`, holdSeconds },
];

/** Dynamic moves for the start of a session. Short, easy and well inside comfort. */
const WARMUP_LIBRARY: Record<string, Unit> = {
  march: one('Marching in place (20 easy steps)', 30),
  hipCircles: sides('Standing hip circles (8 each direction, hold a support)', 20),
  legSwings: sides('Gentle leg swings forward and back (10 swings, hold a support)', 20),
  ankleCircles: sides('Ankle circles (10 each way)', 20),
  chairSquat: one('Slow chair squats in a comfortable range (8 reps)', 30),
  bridge: one('Glute bridges (10 slow reps)', 30),
  clamshell: sides('Clamshells (10 reps)', 25),
  catCow: one('Cat-cow on hands and knees (8 slow rounds)', 30),
  birdDog: one('Bird dog, slow (4 reps each side)', 40),
  pelvicTilt: one('Pelvic tilts lying down (10 slow reps)', 30),
  breath: one('Slow belly breathing (6 breaths, long breath out)', 30),
  heelRaise: one('Slow heel raises holding a counter (10 reps)', 30),
  toeRaise: one('Toe raises with heels on the floor (10 reps)', 30),
  balance: sides('Single-leg balance beside a counter (20 seconds)', 20),
  hinge: one('Wall hip hinge, hips back with a flat back (8 reps)', 30),
  sideSteps: one('Small side steps (10 each way, knees over toes)', 30),
  heelSlides: sides('Heel slides lying down (8 reps, pain-free range)', 25),
  quadSets: sides('Quad sets: tighten the thigh and hold 5 seconds (5 reps)', 30),
  armCircles: one('Small arm circles, both directions (10 each)', 30),
  shoulderRolls: one('Slow shoulder rolls (10 each way)', 20),
  wallSlides: one('Wall slides (8 slow reps)', 30),
  scapSqueeze: one('Shoulder blade squeezes, hold 3 seconds (8 reps)', 30),
  wristCircles: one('Wrist circles, both directions (10 each)', 25),
  tendonGlide: one('Hand tendon glides, through each fist shape (6 reps)', 30),
  neckTurns: one('Slow neck turns, side to side (5 each way)', 30),
  chinTuck: one('Chin tucks (8 slow reps)', 30),
  openBook: sides('Open book rotation lying on your side (6 reps)', 25),
  seatedMarch: one('Seated marching (20 easy steps)', 30),
  anklePumps: one('Ankle pumps, toes up and down (20 reps)', 30),
  towelScrunch: sides('Towel scrunches with your toes (10 reps)', 20),
  pelvicDrop: one('Pelvic floor release: soften and let go on each breath in (6 breaths)', 40),
  pendulum: sides('Arm pendulum: let the arm hang and swing in small circles', 25),
};

/** Easy static stretches for the end of a session or any time. A mild pull, never a pain. */
const STRETCH_LIBRARY: Record<string, Unit> = {
  calf: sides('Calf stretch against a wall (back knee straight, heel down)', 30),
  soleus: sides('Bent-knee calf stretch (back knee soft, heel down)', 30),
  quad: sides('Standing quad stretch (knees together, hold a support)', 30),
  hamstring: sides('Seated hamstring stretch (leg out, tall back, hinge from the hips)', 30),
  hipFlexor: sides('Half-kneeling hip flexor stretch (tuck the tailbone, ease forward)', 30),
  glute: sides('Figure-4 glute stretch lying on your back', 30),
  adductor: one('Butterfly stretch seated (sit tall, no bouncing)', 30),
  itBand: sides('Standing crossed-leg side bend (lean away from the back leg)', 30),
  childs: one("Child's pose (hips back toward your heels, breathe slowly)", 30),
  kneeToChest: sides('Single knee to chest lying down (gentle, relaxed)', 25),
  lumbarTwist: sides('Lying knee drop twist (small range, shoulders stay down)', 25),
  chest: sides('Doorway chest stretch (forearm on the frame, gentle lean)', 25),
  upperTrap: sides('Upper trap stretch (ear toward shoulder, other hand relaxed)', 20),
  levator: sides('Neck turn and tilt stretch (nose toward the armpit, very gentle)', 20),
  crossBody: sides('Cross-body shoulder stretch (arm across the chest)', 20),
  tricep: sides('Overhead triceps stretch (elbow up, gentle pull)', 20),
  wristExt: sides('Wrist extensor stretch (arm out, palm down, gently pull the fingers down)', 20),
  wristFlex: sides('Wrist flexor stretch (arm out, palm up, gently pull the fingers down)', 20),
  plantar: sides('Plantar stretch seated (pull the toes back toward your shin)', 30),
  ankleDF: sides('Knee-to-wall ankle stretch (heel stays down)', 30),
  thoracic: one('Upper back extension over a chair back (arms crossed, breathe)', 30),
  lat: sides('Kneeling lat stretch (hands on a chair, sink the hips back)', 25),
  breathLong: one('Slow breathing, long breath out (6 breaths)', 40),
};

interface CareSpec {
  /** Keys into WARMUP_LIBRARY, most important first. */
  w: string[];
  /** Keys into STRETCH_LIBRARY, most important first. */
  t: string[];
  /** Shorter holds and extra-easy effort (hypermobile, fatigue, recovering). */
  gentle?: boolean;
}

const CARE: Record<string, CareSpec> = {
  // Knees
  runners_knee: { w: ['march', 'bridge', 'clamshell', 'sideSteps'], t: ['quad', 'hipFlexor', 'itBand', 'calf'] },
  patellar_tendinopathy: { w: ['march', 'bridge', 'balance', 'chairSquat'], t: ['calf', 'hamstring', 'hipFlexor', 'glute'] },
  it_band_pain: { w: ['hipCircles', 'clamshell', 'sideSteps', 'bridge'], t: ['itBand', 'glute', 'hipFlexor', 'quad'] },
  knee_arthritis: { w: ['heelSlides', 'quadSets', 'march', 'bridge'], t: ['hamstring', 'calf', 'hipFlexor', 'quad'] },
  meniscus_irritation: { w: ['heelSlides', 'quadSets', 'bridge', 'balance'], t: ['hamstring', 'calf', 'hipFlexor'] },
  acl_recovery: { w: ['heelSlides', 'quadSets', 'bridge', 'balance'], t: ['hamstring', 'calf', 'quad'], gentle: true },
  knee_valgus: { w: ['sideSteps', 'clamshell', 'bridge', 'balance'], t: ['adductor', 'hipFlexor', 'itBand', 'calf'] },
  // Lower legs, ankles and feet
  shin_splints: { w: ['ankleCircles', 'toeRaise', 'heelRaise', 'march'], t: ['calf', 'soleus', 'ankleDF', 'plantar'] },
  achilles_pain: { w: ['ankleCircles', 'heelRaise', 'balance', 'march'], t: ['calf', 'soleus', 'hamstring'] },
  plantar_fasciitis: { w: ['ankleCircles', 'towelScrunch', 'heelRaise', 'march'], t: ['plantar', 'calf', 'soleus', 'glute'] },
  ankle_instability: { w: ['ankleCircles', 'balance', 'heelRaise', 'sideSteps'], t: ['calf', 'ankleDF', 'soleus'] },
  calf_strain: { w: ['anklePumps', 'ankleCircles', 'heelRaise', 'march'], t: ['calf', 'soleus', 'ankleDF'] },
  flat_feet: { w: ['towelScrunch', 'ankleCircles', 'heelRaise', 'balance'], t: ['plantar', 'calf', 'soleus', 'ankleDF'] },
  ankle_stiffness: { w: ['ankleCircles', 'toeRaise', 'heelRaise', 'chairSquat'], t: ['ankleDF', 'calf', 'soleus'] },
  bone_stress: { w: ['anklePumps', 'ankleCircles', 'bridge', 'balance'], t: ['calf', 'soleus', 'hamstring'], gentle: true },
  // Hips and thighs
  weak_hips: { w: ['hipCircles', 'bridge', 'clamshell', 'sideSteps'], t: ['hipFlexor', 'glute', 'adductor', 'hamstring'] },
  weak_glutes: { w: ['bridge', 'clamshell', 'hipCircles', 'birdDog'], t: ['hipFlexor', 'glute', 'quad', 'hamstring'] },
  hamstring_strain: { w: ['march', 'hinge', 'bridge', 'legSwings'], t: ['hamstring', 'calf', 'hipFlexor', 'glute'] },
  hip_flexor_tight: { w: ['hipCircles', 'bridge', 'pelvicTilt', 'march'], t: ['hipFlexor', 'quad', 'glute', 'kneeToChest'] },
  hip_impingement: { w: ['hipCircles', 'bridge', 'clamshell', 'birdDog'], t: ['glute', 'hamstring', 'hipFlexor'] },
  hip_bursitis: { w: ['bridge', 'march', 'balance', 'birdDog'], t: ['hipFlexor', 'hamstring', 'calf'] },
  groin_strain: { w: ['hipCircles', 'bridge', 'pelvicTilt', 'march'], t: ['adductor', 'hipFlexor', 'hamstring'] },
  sciatica: { w: ['catCow', 'pelvicTilt', 'bridge', 'breath'], t: ['glute', 'hipFlexor', 'breathLong'], gentle: true },
  si_joint: { w: ['pelvicTilt', 'bridge', 'birdDog', 'catCow'], t: ['kneeToChest', 'glute', 'hipFlexor', 'lumbarTwist'] },
  tight_hamstrings: { w: ['march', 'hinge', 'legSwings', 'bridge'], t: ['hamstring', 'calf', 'glute', 'hipFlexor'] },
  hip_arthritis: { w: ['march', 'hipCircles', 'bridge', 'clamshell'], t: ['hipFlexor', 'hamstring', 'glute', 'adductor'] },
  // Pelvic floor, pregnancy and postpartum
  weak_pelvic_floor: { w: ['breath', 'pelvicTilt', 'bridge', 'catCow'], t: ['childs', 'adductor', 'kneeToChest', 'breathLong'] },
  tight_pelvic_floor: { w: ['breath', 'pelvicDrop', 'catCow', 'pelvicTilt'], t: ['childs', 'adductor', 'kneeToChest', 'breathLong'], gentle: true },
  pregnancy: { w: ['breath', 'catCow', 'march', 'sideSteps'], t: ['calf', 'chest', 'thoracic', 'adductor', 'upperTrap'], gentle: true },
  postpartum: { w: ['breath', 'pelvicTilt', 'bridge', 'catCow'], t: ['childs', 'chest', 'upperTrap', 'hipFlexor'], gentle: true },
  diastasis_recti: { w: ['breath', 'pelvicTilt', 'birdDog', 'bridge'], t: ['childs', 'chest', 'thoracic', 'hipFlexor'], gentle: true },
  prolapse_leaking: { w: ['breath', 'pelvicDrop', 'bridge', 'birdDog'], t: ['childs', 'adductor', 'kneeToChest', 'breathLong'], gentle: true },
  // Back and core
  low_back_pain: { w: ['catCow', 'pelvicTilt', 'birdDog', 'bridge'], t: ['kneeToChest', 'childs', 'lumbarTwist', 'glute', 'hipFlexor'] },
  weak_core: { w: ['breath', 'pelvicTilt', 'birdDog', 'bridge'], t: ['childs', 'hipFlexor', 'lat', 'thoracic'] },
  disc_issue: { w: ['catCow', 'pelvicTilt', 'birdDog', 'breath'], t: ['hipFlexor', 'glute', 'breathLong'], gentle: true },
  spinal_stenosis: { w: ['pelvicTilt', 'seatedMarch', 'bridge', 'breath'], t: ['kneeToChest', 'childs', 'hamstring', 'hipFlexor'], gentle: true },
  scoliosis: { w: ['breath', 'catCow', 'birdDog', 'scapSqueeze'], t: ['childs', 'thoracic', 'lat', 'hipFlexor'] },
  stiff_mid_back: { w: ['catCow', 'openBook', 'wallSlides', 'scapSqueeze'], t: ['thoracic', 'lat', 'chest', 'childs'] },
  // Shoulders, arms, wrists and neck
  shoulder_pain: { w: ['armCircles', 'scapSqueeze', 'wallSlides', 'shoulderRolls'], t: ['crossBody', 'chest', 'upperTrap', 'thoracic'] },
  rotator_cuff: { w: ['shoulderRolls', 'scapSqueeze', 'wallSlides', 'armCircles'], t: ['chest', 'thoracic', 'upperTrap', 'lat'] },
  shoulder_impingement: { w: ['scapSqueeze', 'wallSlides', 'shoulderRolls', 'armCircles'], t: ['chest', 'thoracic', 'upperTrap', 'lat'] },
  shoulder_instability: { w: ['scapSqueeze', 'shoulderRolls', 'wallSlides'], t: ['thoracic', 'upperTrap', 'lat'], gentle: true },
  frozen_shoulder: { w: ['pendulum', 'shoulderRolls', 'scapSqueeze', 'wallSlides'], t: ['crossBody', 'chest', 'thoracic', 'upperTrap'], gentle: true },
  elbow_tendon_pain: { w: ['wristCircles', 'shoulderRolls', 'scapSqueeze', 'tendonGlide'], t: ['wristExt', 'wristFlex', 'tricep', 'chest'] },
  wrist_pain: { w: ['wristCircles', 'tendonGlide', 'shoulderRolls'], t: ['wristExt', 'wristFlex', 'tricep', 'chest'], gentle: true },
  carpal_tunnel: { w: ['tendonGlide', 'wristCircles', 'chinTuck', 'shoulderRolls'], t: ['wristFlex', 'wristExt', 'upperTrap', 'chest'], gentle: true },
  weak_grip: { w: ['wristCircles', 'tendonGlide', 'shoulderRolls'], t: ['wristFlex', 'wristExt', 'tricep'] },
  posture_upper: { w: ['scapSqueeze', 'wallSlides', 'chinTuck', 'openBook'], t: ['chest', 'upperTrap', 'thoracic', 'lat'] },
  neck_tension: { w: ['neckTurns', 'chinTuck', 'shoulderRolls', 'scapSqueeze'], t: ['upperTrap', 'levator', 'chest', 'thoracic'], gentle: true },
  // Whole body and health conditions
  hypermobility: { w: ['balance', 'scapSqueeze', 'bridge', 'birdDog'], t: ['breathLong', 'childs', 'thoracic'], gentle: true },
  osteoporosis: { w: ['march', 'scapSqueeze', 'bridge', 'balance'], t: ['chest', 'hipFlexor', 'calf', 'upperTrap'], gentle: true },
  high_blood_pressure: { w: ['march', 'breath', 'armCircles', 'heelRaise'], t: ['calf', 'hamstring', 'chest', 'breathLong'], gentle: true },
  dizziness_pots: { w: ['anklePumps', 'seatedMarch', 'breath', 'heelRaise'], t: ['calf', 'upperTrap', 'breathLong'], gentle: true },
  balance_falls: { w: ['march', 'balance', 'sideSteps', 'heelRaise'], t: ['calf', 'hamstring', 'hipFlexor', 'chest'], gentle: true },
  fatigue_pain: { w: ['breath', 'seatedMarch', 'anklePumps', 'shoulderRolls'], t: ['childs', 'upperTrap', 'breathLong', 'hamstring'], gentle: true },
  post_surgery: { w: ['breath', 'anklePumps', 'seatedMarch', 'shoulderRolls'], t: ['breathLong', 'upperTrap', 'calf'], gentle: true },
};

export type CareKind = 'warmup' | 'stretch';

const GENTLE_MAX_HOLD = 15;

function resolveUnits(spec: CareSpec, kind: CareKind): Unit[] {
  const lib = kind === 'warmup' ? WARMUP_LIBRARY : STRETCH_LIBRARY;
  const keys = kind === 'warmup' ? spec.w : spec.t;
  const units: Unit[] = [];
  for (const key of keys) {
    const unit = lib[key];
    if (!unit) continue;
    units.push(unit.map((s) => ({ text: s.text, holdSeconds: spec.gentle ? Math.min(s.holdSeconds, GENTLE_MAX_HOLD) : s.holdSeconds })));
  }
  return units;
}

/** Restriction ids that have care routines. */
export const CARE_RESTRICTION_IDS: readonly string[] = Object.keys(CARE);

/** The warm-up and stretch steps for one restriction, in order. Empty for an unknown id. */
export function getRestrictionCare(id: string): { warmup: StretchStep[]; stretches: StretchStep[] } {
  const spec = CARE[id];
  if (!spec) return { warmup: [], stretches: [] };
  return {
    warmup: resolveUnits(spec, 'warmup').flat(),
    stretches: resolveUnits(spec, 'stretch').flat(),
  };
}

const KIND_PREFIX: Record<CareKind, string> = { warmup: 'rx-warmup:', stretch: 'rx-stretch:' };
const KIND_TITLE: Record<CareKind, string> = { warmup: 'Targeted warm-up', stretch: 'Targeted stretches' };
// Keeps a combined routine short enough to actually do: about 4 minutes of warm-up, 7 of stretching.
const MAX_SECONDS: Record<CareKind, number> = { warmup: 240, stretch: 420 };

function cleanIds(ids: readonly string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids || []) {
    if (CARE[id] && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** The id the stretch runner uses to find a combined routine again. Unknown restrictions are dropped. */
export function careRoutineId(kind: CareKind, ids: readonly string[] | null | undefined): string {
  return `${KIND_PREFIX[kind]}${cleanIds(ids).join(',')}`;
}

/**
 * One routine covering all the given restrictions. Moves are taken in turn from
 * each restriction (best first), so every area gets its top moves before any
 * gets a second, repeats are dropped, and a routine stops growing once it hits
 * its time limit. Returns null when nothing applies.
 */
export function buildCareRoutine(kind: CareKind, ids: readonly string[] | null | undefined): StretchRoutine | null {
  const clean = cleanIds(ids);
  if (clean.length === 0) return null;

  const lists = clean.map((id) => resolveUnits(CARE[id]!, kind));
  const longest = Math.max(...lists.map((l) => l.length));
  const steps: StretchStep[] = [];
  const seen = new Set<string>();
  let total = 0;

  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const unit = list[i];
      if (!unit) continue;
      const key = unit.map((s) => s.text).join('|');
      if (seen.has(key)) continue;
      const seconds = unit.reduce((sum, s) => sum + s.holdSeconds, 0);
      if (steps.length > 0 && total + seconds > MAX_SECONDS[kind]) continue;
      seen.add(key);
      steps.push(...unit);
      total += seconds;
    }
  }
  if (steps.length === 0) return null;

  return {
    id: careRoutineId(kind, clean),
    title: KIND_TITLE[kind],
    durationMinutes: Math.max(1, Math.round(total / 60)),
    category: 'stretch',
    steps,
  };
}

/** Finds a combined routine from the id the stretch runner was given. Null if it is not one. */
export function resolveCareRoutine(routineId: string | null | undefined): StretchRoutine | null {
  if (!routineId) return null;
  for (const kind of ['warmup', 'stretch'] as const) {
    const prefix = KIND_PREFIX[kind];
    if (routineId.startsWith(prefix)) {
      return buildCareRoutine(kind, routineId.slice(prefix.length).split(','));
    }
  }
  return null;
}
