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

export interface JointActionInfo {
  jointAction: string;
  plane: string;
}

const GROUP_FALLBACK: Record<string, JointActionInfo> = {
  glutes: { jointAction: 'Hip extension', plane: 'Sagittal plane' },
  hamstrings: { jointAction: 'Hip extension / knee flexion', plane: 'Sagittal plane' },
  quads: { jointAction: 'Knee extension', plane: 'Sagittal plane' },
  back: { jointAction: 'Shoulder extension / scapular retraction', plane: 'Sagittal plane' },
  chest: { jointAction: 'Horizontal shoulder adduction', plane: 'Transverse plane' },
  shoulders: { jointAction: 'Shoulder flexion / abduction', plane: 'Sagittal / frontal plane' },
  arms: { jointAction: 'Elbow flexion / extension', plane: 'Sagittal plane' },
  core: { jointAction: 'Spinal stabilization', plane: 'Multi-planar (isometric)' },
  calves: { jointAction: 'Ankle plantarflexion', plane: 'Sagittal plane' },
  fullbody: { jointAction: 'Multi-joint compound movement', plane: 'Multi-planar' },
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
  { test: (n) => /leg raise|toes to bar|v-up|crunch|sit-up/.test(n), info: { jointAction: 'Spinal / hip flexion', plane: 'Sagittal plane' } },
  { test: (n) => /twist|woodchopper|wood chopper/.test(n), info: { jointAction: 'Spinal rotation', plane: 'Transverse plane' } },
  { test: (n) => /side plank/.test(n), info: { jointAction: 'Anti-lateral flexion (stabilization)', plane: 'Frontal plane (isometric)' } },
  { test: (n) => /pallof|plank|dead bug|bird dog|hollow body|ab wheel/.test(n), info: { jointAction: 'Anti-extension / anti-rotation (stabilization)', plane: 'Multi-planar (isometric)' } },

  // Hip hinge / hip extension pattern — \bthrust\b (word boundary) so
  // it matches "Hip Thrust" but not the substring inside "Thruster",
  // which is a squat-to-press compound handled by the squat bucket
  // below, not a hip-hinge/bridge movement.
  { test: (n) => /\bthrust\b|bridge|pull-through|pull through|glute-ham|kickback|hip extension/.test(n), info: { jointAction: 'Hip extension', plane: 'Sagittal plane' } },
  { test: (n) => /deadlift|\brdl\b|good morning|hyperextension|back extension/.test(n), info: { jointAction: 'Hip extension (hip hinge)', plane: 'Sagittal plane' } },

  // Squat / lunge / step pattern (compound hip + knee)
  { test: (n) => /squat|lunge|step-up|step up|step-down|pistol|thruster/.test(n), info: { jointAction: 'Hip + knee extension (squat pattern)', plane: 'Sagittal plane' } },

  // Leg isolation
  { test: (n) => /leg curl|nordic/.test(n), info: { jointAction: 'Knee flexion', plane: 'Sagittal plane' } },
  { test: (n) => /leg extension|terminal knee extension/.test(n), info: { jointAction: 'Knee extension', plane: 'Sagittal plane' } },
  { test: (n) => /leg press|hack squat/.test(n), info: { jointAction: 'Hip + knee extension', plane: 'Sagittal plane' } },
  { test: (n) => /tibialis raise/.test(n), info: { jointAction: 'Ankle dorsiflexion', plane: 'Sagittal plane' } },
  { test: (n) => /calf raise/.test(n), info: { jointAction: 'Ankle plantarflexion', plane: 'Sagittal plane' } },

  // Hip abduction/adduction
  { test: (n) => /abductor|lateral walk|monster walk|clamshell/.test(n), info: { jointAction: 'Hip abduction', plane: 'Frontal plane' } },
  { test: (n) => /adductor/.test(n), info: { jointAction: 'Hip adduction', plane: 'Frontal plane' } },

  // Upper body press — horizontal (chest-dominant). "rear delt" is
  // checked and excluded first — a reverse/rear-delt fly moves in the
  // opposite direction (pulling the arms apart) from a chest fly
  // (bringing them together), so it belongs in the raise/abduction
  // bucket below, not here, even though its name also contains "fly".
  { test: (n) => !/rear delt/.test(n) && /bench press|chest press|floor press|push-up|push up|\bfly\b|\bflye\b|svend|pec deck/.test(n), info: { jointAction: 'Horizontal shoulder adduction (press)', plane: 'Transverse plane' } },

  // Upper body press — vertical (shoulder-dominant)
  { test: (n) => /overhead press|shoulder press|arnold press|landmine press|pike push-up|clean and press|devil|cuban press|jm press/.test(n), info: { jointAction: 'Shoulder flexion (vertical press)', plane: 'Sagittal plane' } },

  // Pulling / rowing — upright row excluded and checked separately
  // below, since pulling straight up along the body (shoulder
  // abduction) is a different joint action from a horizontal row
  // (shoulder extension / scapular retraction), even though both
  // contain "row".
  { test: (n) => !/upright row/.test(n) && /row|pulldown|pull-up|pullup|face pull/.test(n), info: { jointAction: 'Shoulder extension + elbow flexion (pull)', plane: 'Sagittal plane' } },

  // Shoulder raises (includes rear delt fly and upright row, both
  // genuinely shoulder-abduction-pattern movements despite their names)
  { test: (n) => /lateral raise|front raise|rear delt|upright row|bus driver/.test(n), info: { jointAction: 'Shoulder abduction / flexion', plane: 'Frontal / sagittal plane' } },

  // Arm isolation
  { test: (n, g) => g === 'arms' && /curl/.test(n), info: { jointAction: 'Elbow flexion', plane: 'Sagittal plane' } },
  { test: (n) => /tricep|skull crusher|pushdown/.test(n), info: { jointAction: 'Elbow extension', plane: 'Sagittal plane' } },
  { test: (n) => /shrug/.test(n), info: { jointAction: 'Scapular elevation', plane: 'Frontal plane' } },
  { test: (n) => /pullover/.test(n), info: { jointAction: 'Shoulder extension', plane: 'Sagittal plane' } },

  // Full-body / conditioning
  { test: (n) => /burpee|man maker|mountain climber|battle ropes|bear crawl|medicine ball slam|wall ball|kettlebell swing|box jump|jump rope|sled push|farmers carry|turkish get-up|renegade row/.test(n), info: { jointAction: 'Multi-joint / full-body power', plane: 'Multi-planar' } },
];

export function getJointAction(exercise: Pick<Exercise, 'name' | 'group'>): JointActionInfo {
  const name = (exercise.name || '').toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.test(name, exercise.group)) return rule.info;
  }
  return GROUP_FALLBACK[exercise.group] || { jointAction: 'Compound movement', plane: 'Multi-planar' };
}
