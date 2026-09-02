import type { Exercise } from './exercises';

export interface MuscleInvolvement {
  primary: string[];
  secondary: string[];
}

/**
 * Splits the existing `muscle` field (e.g. "Glutes + Hamstrings") into
 * primary/secondary rather than adding a new field to hand-populate —
 * that field already encodes exactly this by convention across all 186
 * exercises (the first-listed muscle is always the one the exercise is
 * filed under/named for), so re-deriving it here means new exercises
 * automatically get correct muscle involvement with zero extra upkeep.
 */
export function deriveMuscleInvolvement(exercise: Pick<Exercise, 'muscle'>): MuscleInvolvement {
  const parts = (exercise.muscle || '').split('+').map((s) => s.trim()).filter(Boolean);
  const [first, ...rest] = parts;
  if (!first) return { primary: [], secondary: [] };
  return { primary: [first], secondary: rest };
}

/**
 * A closed set of movement patterns, not a free-text description —
 * common faults (below) key off this enum rather than off the
 * free-text jointAction strings, because two exercises can have
 * slightly different jointAction wording ("Hip extension" vs "Hip
 * extension (hip hinge)") while sharing the exact same fault list.
 * Matching faults against free text would mean either duplicating
 * fault entries per wording variant or fragile substring matching;
 * this keeps one single source of truth per pattern.
 */
export type MovementPattern =
  | 'hip_hinge' | 'squat' | 'hip_extension' | 'hip_abduction'
  | 'knee_flexion' | 'knee_extension' | 'ankle_plantarflexion' | 'ankle_dorsiflexion'
  | 'horizontal_press' | 'vertical_press' | 'horizontal_pull' | 'vertical_pull' | 'shoulder_raise'
  | 'elbow_flexion' | 'elbow_extension' | 'scapular_elevation'
  | 'core_flexion' | 'core_rotation' | 'core_anti_movement'
  | 'full_body_power';

export interface JointActionInfo {
  pattern: MovementPattern;
  jointAction: string;
  plane: string;
}

const GROUP_FALLBACK: Record<string, JointActionInfo> = {
  glutes: { pattern: 'hip_extension', jointAction: 'Hip extension', plane: 'Sagittal plane' },
  hamstrings: { pattern: 'hip_extension', jointAction: 'Hip extension / knee flexion', plane: 'Sagittal plane' },
  quads: { pattern: 'knee_extension', jointAction: 'Knee extension', plane: 'Sagittal plane' },
  back: { pattern: 'horizontal_pull', jointAction: 'Shoulder extension / scapular retraction', plane: 'Sagittal plane' },
  chest: { pattern: 'horizontal_press', jointAction: 'Horizontal shoulder adduction', plane: 'Transverse plane' },
  shoulders: { pattern: 'shoulder_raise', jointAction: 'Shoulder flexion / abduction', plane: 'Sagittal / frontal plane' },
  arms: { pattern: 'elbow_flexion', jointAction: 'Elbow flexion / extension', plane: 'Sagittal plane' },
  core: { pattern: 'core_anti_movement', jointAction: 'Spinal stabilization', plane: 'Multi-planar (isometric)' },
  calves: { pattern: 'ankle_plantarflexion', jointAction: 'Ankle plantarflexion', plane: 'Sagittal plane' },
  fullbody: { pattern: 'full_body_power', jointAction: 'Multi-joint compound movement', plane: 'Multi-planar' },
};

/**
 * Ordered keyword rules, checked top to bottom — first match wins. Most
 * specific patterns (e.g. "leg curl" → knee flexion) are checked before
 * generic ones (e.g. bare "curl" → elbow flexion) so a name containing
 * both a specific and a generic keyword resolves to the specific,
 * kinesiologically-correct one rather than whichever happens to appear
 * first in the string. Falls back to GROUP_FALLBACK by exercise.group
 * when no keyword matches, so every exercise always gets a real answer.
 */
const KEYWORD_RULES: { test: (name: string, group: string) => boolean; info: JointActionInfo }[] = [
  // Core / trunk — most specific first
  { test: (n) => /leg raise|toes to bar|v-up|crunch|sit-up/.test(n), info: { pattern: 'core_flexion', jointAction: 'Spinal / hip flexion', plane: 'Sagittal plane' } },
  { test: (n) => /twist|woodchopper|wood chopper/.test(n), info: { pattern: 'core_rotation', jointAction: 'Spinal rotation', plane: 'Transverse plane' } },
  { test: (n) => /side plank/.test(n), info: { pattern: 'core_anti_movement', jointAction: 'Anti-lateral flexion (stabilization)', plane: 'Frontal plane (isometric)' } },
  { test: (n) => /pallof|plank|dead bug|bird dog|hollow body|ab wheel/.test(n), info: { pattern: 'core_anti_movement', jointAction: 'Anti-extension / anti-rotation (stabilization)', plane: 'Multi-planar (isometric)' } },

  // Hip hinge / hip extension pattern — \bthrust\b (word boundary) so
  // it matches "Hip Thrust" but not the substring inside "Thruster",
  // which is a squat-to-press compound handled by the squat bucket
  // below, not a hip-hinge/bridge movement.
  { test: (n) => /\bthrust\b|bridge|pull-through|pull through|glute-ham|kickback|hip extension/.test(n), info: { pattern: 'hip_extension', jointAction: 'Hip extension', plane: 'Sagittal plane' } },
  { test: (n) => /deadlift|\brdl\b|good morning|hyperextension|back extension/.test(n), info: { pattern: 'hip_hinge', jointAction: 'Hip extension (hip hinge)', plane: 'Sagittal plane' } },

  // Squat / lunge / step pattern (compound hip + knee)
  { test: (n) => /squat|lunge|step-up|step up|step-down|pistol|thruster/.test(n), info: { pattern: 'squat', jointAction: 'Hip + knee extension (squat pattern)', plane: 'Sagittal plane' } },

  // Leg isolation
  { test: (n) => /leg curl|nordic/.test(n), info: { pattern: 'knee_flexion', jointAction: 'Knee flexion', plane: 'Sagittal plane' } },
  { test: (n) => /leg extension|terminal knee extension/.test(n), info: { pattern: 'knee_extension', jointAction: 'Knee extension', plane: 'Sagittal plane' } },
  { test: (n) => /leg press|hack squat/.test(n), info: { pattern: 'squat', jointAction: 'Hip + knee extension', plane: 'Sagittal plane' } },
  { test: (n) => /tibialis raise/.test(n), info: { pattern: 'ankle_dorsiflexion', jointAction: 'Ankle dorsiflexion', plane: 'Sagittal plane' } },
  { test: (n) => /calf raise/.test(n), info: { pattern: 'ankle_plantarflexion', jointAction: 'Ankle plantarflexion', plane: 'Sagittal plane' } },

  // Hip abduction/adduction
  { test: (n) => /abductor|lateral walk|monster walk|clamshell/.test(n), info: { pattern: 'hip_abduction', jointAction: 'Hip abduction', plane: 'Frontal plane' } },
  { test: (n) => /adductor/.test(n), info: { pattern: 'hip_abduction', jointAction: 'Hip adduction', plane: 'Frontal plane' } },

  // Upper body press — horizontal (chest-dominant). "rear delt" is
  // checked and excluded first — a reverse/rear-delt fly moves in the
  // opposite direction (pulling the arms apart) from a chest fly
  // (bringing them together), so it belongs in the raise/abduction
  // bucket below, not here, even though its name also contains "fly".
  { test: (n) => !/rear delt/.test(n) && /bench press|chest press|floor press|push-up|push up|\bfly\b|\bflye\b|svend|pec deck/.test(n), info: { pattern: 'horizontal_press', jointAction: 'Horizontal shoulder adduction (press)', plane: 'Transverse plane' } },

  // Upper body press — vertical (shoulder-dominant)
  { test: (n) => /overhead press|shoulder press|arnold press|landmine press|pike push-up|clean and press|devil|cuban press|jm press/.test(n), info: { pattern: 'vertical_press', jointAction: 'Shoulder flexion (vertical press)', plane: 'Sagittal plane' } },

  // Pulling / rowing — upright row excluded and checked separately
  // below, since pulling straight up along the body (shoulder
  // abduction) is a different joint action from a horizontal row
  // (shoulder extension / scapular retraction), even though both
  // contain "row".
  { test: (n) => !/upright row/.test(n) && /row|pulldown|pull-up|pullup|face pull/.test(n), info: { pattern: 'horizontal_pull', jointAction: 'Shoulder extension + elbow flexion (pull)', plane: 'Sagittal plane' } },

  // Shoulder raises (includes rear delt fly and upright row, both
  // genuinely shoulder-abduction-pattern movements despite their names)
  { test: (n) => /lateral raise|front raise|rear delt|upright row|bus driver/.test(n), info: { pattern: 'shoulder_raise', jointAction: 'Shoulder abduction / flexion', plane: 'Frontal / sagittal plane' } },

  // Arm isolation
  { test: (n, g) => g === 'arms' && /curl/.test(n), info: { pattern: 'elbow_flexion', jointAction: 'Elbow flexion', plane: 'Sagittal plane' } },
  { test: (n) => /tricep|skull crusher|pushdown/.test(n), info: { pattern: 'elbow_extension', jointAction: 'Elbow extension', plane: 'Sagittal plane' } },
  { test: (n) => /shrug/.test(n), info: { pattern: 'scapular_elevation', jointAction: 'Scapular elevation', plane: 'Frontal plane' } },
  { test: (n) => /pullover/.test(n), info: { pattern: 'vertical_pull', jointAction: 'Shoulder extension', plane: 'Sagittal plane' } },

  // Full-body / conditioning
  { test: (n) => /burpee|man maker|mountain climber|battle ropes|bear crawl|medicine ball slam|wall ball|kettlebell swing|box jump|jump rope|sled push|farmers carry|turkish get-up|renegade row/.test(n), info: { pattern: 'full_body_power', jointAction: 'Multi-joint / full-body power', plane: 'Multi-planar' } },
];

export function getJointAction(exercise: Pick<Exercise, 'name' | 'group'>): JointActionInfo {
  const name = (exercise.name || '').toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.test(name, exercise.group)) return rule.info;
  }
  return GROUP_FALLBACK[exercise.group] || { pattern: 'full_body_power', jointAction: 'Compound movement', plane: 'Multi-planar' };
}

/**
 * Common faults per movement pattern — the mistakes that actually show
 * up across real people doing that pattern, not exercise-specific
 * trivia. Kept as a separate, additive layer rather than rewritten
 * into the 184 existing `cues`/`points` entries: faults cluster by
 * movement pattern (a caved-in knee is the same fault whether it's a
 * goblet squat or a leg press), so one fault list per pattern is both
 * more accurate and far less error-prone than hand-editing 184
 * individual entries — and it composes with whatever's already in
 * `cues`/`points` instead of replacing it.
 */
export interface CommonFault {
  fault: string;
  fix: string;
}

export const COMMON_FAULTS_BY_PATTERN: Record<MovementPattern, CommonFault[]> = {
  hip_hinge: [
    { fault: 'Rounding the lower back instead of hinging at the hips', fix: 'Push hips back like closing a car door with them — keep the bar/weight close to your legs the whole way down' },
    { fault: 'Bending the knees too much, turning it into a squat', fix: 'Knees stay soft, not bent — the movement is hips going back, not knees going forward' },
  ],
  squat: [
    { fault: 'Knees caving inward', fix: 'Actively push knees out over your toes throughout the movement' },
    { fault: 'Heels lifting off the ground', fix: 'Keep weight balanced through the whole foot — widen your stance slightly if ankle mobility is limiting depth' },
    { fault: 'Losing the neutral spine, rounding the lower back at the bottom', fix: 'Brace your core before descending and only go as deep as you can keep your back flat' },
  ],
  hip_extension: [
    { fault: 'Hyperextending the lower back at the top instead of squeezing the glutes', fix: 'Stop the movement when hips are fully extended and in line with your torso — squeeze glutes, don\'t arch further' },
    { fault: 'Using momentum instead of a controlled squeeze', fix: 'Pause and squeeze for a full second at the top of every rep' },
  ],
  hip_abduction: [
    { fault: 'Rocking the torso side to side instead of isolating the hip', fix: 'Keep your torso still — the movement should come entirely from the hip joint' },
  ],
  knee_flexion: [
    { fault: 'Using momentum to swing the weight up', fix: 'Slow the concentric down and control the full range every rep' },
    { fault: 'Hips lifting off the pad/bench', fix: 'Keep hips pinned down so the hamstrings do the work, not the lower back' },
  ],
  knee_extension: [
    { fault: 'Locking out the knee hard at the top', fix: 'Stop just short of full lockout to keep tension on the muscle, not the joint' },
  ],
  ankle_plantarflexion: [
    { fault: 'Bouncing at the bottom instead of a full stretch and controlled rise', fix: 'Pause briefly at the bottom stretch, then rise under control' },
  ],
  ankle_dorsiflexion: [
    { fault: 'Rushing through a small range of motion', fix: 'Slow down and go through the full available ankle range' },
  ],
  horizontal_press: [
    { fault: 'Flaring the elbows out to 90°', fix: 'Keep elbows at roughly a 45° angle from your torso to protect the shoulders' },
    { fault: 'Bouncing the weight off the chest', fix: 'Lower under control and pause briefly before pressing back up' },
  ],
  vertical_press: [
    { fault: 'Arching the lower back excessively to press overhead', fix: 'Brace your core and keep ribs down — if you can\'t press without arching, reduce the weight' },
  ],
  horizontal_pull: [
    { fault: 'Using momentum/body swing to move the weight', fix: 'Keep your torso still and let your back muscles do the pulling' },
    { fault: 'Shrugging the shoulders up toward the ears instead of pulling with the back', fix: 'Think "elbows back," not "shoulders up" — lead with the elbows' },
  ],
  vertical_pull: [
    { fault: 'Pulling with the arms only instead of the lats', fix: 'Think about pulling your elbows down toward your hips, not just bending your arms' },
  ],
  shoulder_raise: [
    { fault: 'Using momentum to swing the weight up', fix: 'Slow down and control both the lift and the lowering — no swinging' },
    { fault: 'Shrugging the traps instead of isolating the shoulder', fix: 'Keep shoulders down away from your ears throughout the movement' },
  ],
  elbow_flexion: [
    { fault: 'Swinging the whole body to generate momentum', fix: 'Keep elbows pinned to your sides and let only the forearm move' },
  ],
  elbow_extension: [
    { fault: 'Flaring the elbows out during the movement', fix: 'Keep elbows tucked close and stationary — only the forearm should move' },
  ],
  scapular_elevation: [
    { fault: 'Rolling the shoulders instead of a straight up-and-down shrug', fix: 'Move straight up and down — rolling doesn\'t add benefit and can irritate the shoulder joint' },
  ],
  core_flexion: [
    { fault: 'Pulling on the neck instead of using the abs', fix: 'Keep a fist-sized gap between your chin and chest — the movement should come from your core, not your neck' },
  ],
  core_rotation: [
    { fault: 'Rotating only the arms instead of the torso', fix: 'Let the rotation come from your ribcage and core, not just your arms swinging' },
  ],
  core_anti_movement: [
    { fault: 'Letting the hips sag or the lower back arch', fix: 'Keep a straight line from shoulders to hips — squeeze glutes and brace your core to hold it' },
  ],
  full_body_power: [
    { fault: 'Rushing the technique to go faster', fix: 'Slow down enough to keep good form on every rep — speed comes after the pattern is solid' },
  ],
};

export function getCommonFaults(exercise: Pick<Exercise, 'name' | 'group'>): CommonFault[] {
  const { pattern } = getJointAction(exercise);
  return COMMON_FAULTS_BY_PATTERN[pattern] || [];
}
