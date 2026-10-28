import type { Restriction } from './restrictions';

/**
 * The second half of the injuries and weak spots list. Same rules as
 * restrictions.ts: every corrective and avoid id must be a real exercise, and
 * every entry carries conservative, general guidance only. Warm-ups and
 * stretches for each entry live in restrictionCare.ts.
 */

const NO_DEEP_LOWER = ['pistol-squat', 'cossack-squat', 'bulgarian-split-squat', 'smith-machine-bulgarian-split-squat'] as const;
const SIT_UPS = ['sit-up', 'jackknife-sit-up', 'hanging-sit-up', 'v-up'] as const;
const SPINE_FLEXION = ['sit-up', 'crunch', 'jackknife-sit-up', 'v-up', 'hanging-sit-up', 'cable-crunch', 'machine-crunch', 'hollow-body-crunch', 'jefferson-curl'] as const;
const TWISTING = ['russian-twist', 'core-twist', 'bicycle-crunch', 'oblique-crunch', 'oblique-sit-up', 'lying-windshield-wiper', 'lying-windshield-wiper-with-bent-knees'] as const;
const BAR_HANGS = ['bar-hang', 'one-handed-bar-hang'] as const;
const DIPS = ['bar-dip', 'ring-dip', 'assisted-dip', 'bench-dip'] as const;
const BEHIND_NECK = ['behind-the-neck-press', 'snatch-grip-behind-the-neck-press'] as const;
const JERKS = ['jerk', 'power-jerk', 'split-jerk', 'squat-jerk', 'push-press', 'kettlebell-push-press'] as const;
/** Moves most likely to make the belly dome or bulge. Guidelines say to avoid whatever causes doming, so these are held back by default. */
const DOMING_MOVES = ['sit-up', 'jackknife-sit-up', 'v-up', 'hanging-sit-up', 'hanging-leg-raise', 'captains-chair-leg-raise', 'lying-leg-raise', 'dragon-flag', 'kneeling-ab-wheel-roll-out', 'hollow-body-crunch', 'crunch'] as const;
const CORE_PRESSURE = ['plank', 'weighted-plank', 'dragon-flag', 'kneeling-ab-wheel-roll-out', 'hollow-hold', 'hollow-body-crunch', 'lying-leg-raise', 'hanging-leg-raise', 'captains-chair-leg-raise'] as const;

export const MORE_RESTRICTIONS: readonly Restriction[] = [
  // Knees
  {
    id: 'knee_arthritis', label: 'Knee arthritis or stiff knees', section: 'knee',
    summary: 'Achy, stiff knees, worse after sitting or first thing in the morning, with some grinding.',
    why: 'The RACGP guideline strongly recommends walking and muscle strengthening for knee arthritis, and cycling conditionally. Strong thighs and hips act like shock absorbers. The work is low impact.',
    corrective: ['quad-set', 'straight-leg-raise', 'heel-slide', 'glute-bridge', 'chair-squat', 'clamshells', 'side-lying-leg-raise', 'terminal-knee-extension', 'stationary-bike', 'treadmill'],
    avoid: { kinds: ['plyo'], ids: [...NO_DEEP_LOWER, 'prisoner-get-up', 'reverse-nordic', 'barbell-hack-squat'] },
    caution: 'Some discomfort while exercising is common and usually not harmful. Pain that sharpens or lingers is a reason to ease off. A knee that is hot, swollen or locks should be looked at by a doctor.',
  },
  {
    id: 'meniscus_irritation', label: 'Meniscus or catching knee', section: 'knee',
    summary: 'Pain along the joint line, clicking or catching, or a knee that feels like it locks.',
    why: 'Deep bending under load and twisting on a planted foot irritate the meniscus, so the work builds the thigh and hip in shallow, straight-line ranges.',
    corrective: ['quad-set', 'straight-leg-raise', 'heel-slide', 'glute-bridge', 'clamshells', 'side-lying-leg-raise', 'terminal-knee-extension', 'single-leg-balance', 'stationary-bike'],
    avoid: { kinds: ['plyo'], ids: [...NO_DEEP_LOWER, 'curtsy-lunge', 'side-lunges-bodyweight', 'prisoner-get-up', 'zombie-squat'] },
    caution: 'A knee that truly locks, gives way, or swells after activity needs a doctor or physical therapist.',
  },
  {
    id: 'acl_recovery', label: 'Recovering from a knee ligament injury', section: 'knee',
    summary: 'Rebuilding after an ACL, MCL or similar knee ligament injury or repair.',
    why: 'Early rebuilding is about thigh control, hip strength and balance in safe ranges. Your surgeon or therapist sets the stages, so this only supports that plan.',
    corrective: ['quad-set', 'straight-leg-raise', 'heel-slide', 'glute-bridge', 'clamshells', 'side-lying-leg-raise', 'single-leg-balance', 'terminal-knee-extension', 'chair-squat', 'lateral-walk-with-band'],
    avoid: { kinds: ['plyo'], ids: [...NO_DEEP_LOWER, 'leg-extension', 'one-legged-leg-extension', 'standing-cable-leg-extension', 'curtsy-lunge', 'side-lunges-bodyweight'] },
    caution: 'Follow your surgeon or physical therapist for what is allowed at your stage. This list is general and does not replace their plan.',
  },
  {
    id: 'knee_valgus', label: 'Knees cave inward', section: 'knee',
    summary: 'Your knees drift toward each other when you squat, step or land.',
    why: 'Caving usually means the outer hips and glutes are not holding the thigh in line, so the work trains those and balance.',
    corrective: ['lateral-walk-with-band', 'clamshells', 'glute-bridge', 'side-step', 'hip-abduction-against-band', 'banded-side-kicks', 'single-leg-balance', 'chair-squat', 'hip-thrust-with-band-around-knees'],
    avoid: { kinds: [], ids: [] },
    caution: 'In squats and steps, picture pushing your knees gently out over your middle toes.',
  },

  // Lower legs, ankles and feet
  {
    id: 'calf_strain', label: 'Calf strain or tight calves', section: 'leg',
    summary: 'A pulling or tight feeling in the calf, worse when pushing off or on tiptoe.',
    why: 'Slow, controlled calf loading rebuilds the muscle, while sudden push-offs and sprints are paused until it settles.',
    corrective: ['heel-raise', 'eccentric-heel-drop', 'seated-calf-raise', 'standing-calf-raise', 'tibialis-raise', 'single-leg-balance', 'short-foot', 'ankle-circles'],
    avoid: { kinds: ['plyo'], ids: ['high-knees', 'butt-kicks', 'sled-push', 'stair-climber', 'mountain-climbers'] },
    caution: 'Sudden sharp calf pain with swelling, or one calf that is red and warm, needs a doctor the same day.',
  },
  {
    id: 'flat_feet', label: 'Flat feet or fallen arches', section: 'leg',
    summary: 'Arches that flatten, with tired feet or knees that roll inward.',
    why: 'Strong foot muscles and calves support the arch from the ground up.',
    corrective: ['short-foot', 'towel-scrunch', 'heel-raise', 'single-leg-balance', 'tibialis-raise', 'clamshells', 'glute-bridge', 'ankle-circles'],
    avoid: { kinds: [], ids: [] },
    caution: 'Foot pain that lasts is worth a visit to a podiatrist or physical therapist.',
  },
  {
    id: 'ankle_stiffness', label: 'Stiff ankles', section: 'leg',
    summary: 'Your heels lift in squats or your ankles feel locked up.',
    why: 'Mobility and strength at the front of the shin and calf let the knee travel forward in a squat.',
    corrective: ['ankle-circles', 'tibialis-raise', 'heel-walk', 'heel-raise', 'eccentric-heel-drop', 'half-air-squat', 'chair-squat', 'short-foot'],
    avoid: { kinds: [], ids: [] },
    caution: 'A stiff ankle after a sprain that is not improving should be checked.',
  },
  {
    id: 'bone_stress', label: 'Stress fracture or bone stress', section: 'leg',
    summary: 'Pinpoint bone pain that builds with impact, or a diagnosed stress fracture that is healing.',
    why: 'Healing bone needs impact kept low while the muscles around it stay strong, so the work is low impact and impact moves are paused.',
    corrective: ['glute-bridge', 'clamshells', 'single-leg-balance', 'dead-bug', 'bird-dog', 'tibialis-raise', 'wall-sit', 'stationary-bike', 'side-lying-leg-raise'],
    avoid: { kinds: ['plyo'], ids: ['high-knees', 'butt-kicks', 'treadmill', 'stair-climber', 'sled-push', 'mountain-climbers', 'kettlebell-swing', 'one-handed-kettlebell-swing'] },
    caution: 'Bone pain needs a diagnosis. Return to impact only when your doctor says so.',
  },

  // Hips, pelvis and thighs
  {
    id: 'hip_flexor_tight', label: 'Tight hip flexors', section: 'hip',
    summary: 'A tight front of the hip, often from long sitting, with an arched low back.',
    why: 'Strong glutes and deep core let the front of the hip relax, and sit-up style moves that lean on the hip flexors are paused.',
    corrective: ['glute-bridge', 'dead-bug', 'pelvic-tilt', 'banded-hip-march', 'one-legged-glute-bridge', 'hip-thrust', 'bird-dog', 'side-lying-leg-raise'],
    avoid: { kinds: [], ids: [...SIT_UPS] },
    caution: 'Stretch gently. A stretch should feel like a pull, not a pinch.',
  },
  {
    id: 'hip_impingement', label: 'Hip pinching (impingement)', section: 'hip',
    summary: 'A pinch at the front or side of the hip in deep bends, or a hip that clicks.',
    why: 'Strong glutes and core support the joint, while very deep hip bends that cause the pinch are kept out.',
    corrective: ['glute-bridge', 'clamshells', 'side-lying-leg-raise', 'dead-bug', 'bird-dog', 'lateral-walk-with-band', 'adductor-squeeze', 'banded-hip-march'],
    avoid: { kinds: [], ids: ['pistol-squat', 'cossack-squat', 'hanging-knee-raise', 'hanging-leg-raise', 'captains-chair-knee-raise', 'deficit-deadlift', 'jefferson-curl'] },
    caution: 'Keep squats and hinges in the range that feels free of pinching. Hip pain that lasts should be checked.',
  },
  {
    id: 'hip_bursitis', label: 'Outer hip pain (bursitis or tendon)', section: 'hip',
    summary: 'Pain on the side of the hip that is worse lying on that side, on stairs or crossing your legs.',
    why: 'Gentle glute strengthening helps the tendon, and moves that squeeze the tendon over the bone, such as crossing the midline, are paused.',
    corrective: ['glute-bridge', 'one-legged-glute-bridge', 'bird-dog', 'chair-squat', 'step-up', 'single-leg-balance', 'lateral-walk-with-band', 'hip-abduction-against-band'],
    avoid: { kinds: [], ids: ['cable-machine-hip-adduction', 'hip-adduction-machine', 'hip-adduction-against-band', 'curtsy-lunge', 'cossack-squat', 'copenhagen-plank', 'side-lunges-bodyweight'] },
    caution: 'Avoid lying on the sore side, crossing your legs, and standing with your weight dropped into one hip.',
  },
  {
    id: 'groin_strain', label: 'Groin or inner thigh strain', section: 'hip',
    summary: 'Pulling or pain high on the inner thigh, worse with kicking, sprinting or wide stances.',
    why: 'The inner thigh is rebuilt gradually with gentle squeezes and balance, and wide-stance and cutting moves are paused.',
    corrective: ['adductor-squeeze', 'glute-bridge', 'dead-bug', 'bird-dog', 'single-leg-balance', 'clamshells', 'side-lying-leg-raise', 'pelvic-tilt'],
    avoid: { kinds: ['plyo'], ids: ['cossack-squat', 'side-lunges-bodyweight', 'curtsy-lunge', 'copenhagen-plank', 'wide-squat', 'sumo-squat', 'sumo-deadlift'] },
    caution: 'The Copenhagen plank is a later-stage move often used to prevent groin strains, so it is held out for now. Add it back with your clinician\'s okay. Pain in the groin that is deep, or comes with a bulge, needs a doctor.',
  },
  {
    id: 'sciatica', label: 'Sciatica or buttock nerve pain', section: 'hip',
    summary: 'Pain, tingling or numbness running from the buttock down the back of the leg.',
    why: 'Gentle core and glute control calms the area, and heavy bending forward and sit-ups that can aggravate the nerve are paused.',
    corrective: ['glute-bridge', 'bird-dog', 'dead-bug', 'pelvic-tilt', 'clamshells', 'cat-cow', 'diaphragmatic-breathing', 'side-lying-leg-raise'],
    avoid: { kinds: [], ids: [...SPINE_FLEXION, 'good-morning', 'stiff-legged-deadlift', 'deadlift', 'deficit-deadlift', 'sumo-deadlift'] },
    caution: 'Leg weakness, numbness in the groin or saddle area, or new bladder or bowel changes need urgent medical care.',
  },
  {
    id: 'si_joint', label: 'Sacroiliac (SI) joint pain', section: 'hip',
    summary: 'Pain on one side of the low back by the dimple above the buttock, worse on stairs or turning in bed.',
    why: 'Even, stable hip and core strength supports the SI joint, and lopsided one-leg loading is paused.',
    corrective: ['glute-bridge', 'bird-dog', 'dead-bug', 'clamshells', 'adductor-squeeze', 'pelvic-tilt', 'side-lying-leg-raise', 'single-leg-balance'],
    avoid: { kinds: [], ids: [...NO_DEEP_LOWER, 'single-leg-deadlift-with-kettlebell', 'single-leg-romanian-deadlift', 'one-legged-hip-thrust', 'curtsy-lunge'] },
    caution: 'Keep steps and stances even, and avoid long single-leg standing.',
  },
  {
    id: 'tight_hamstrings', label: 'Tight hamstrings', section: 'hip',
    summary: 'Hamstrings that feel short or tight, making it hard to bend forward or sit tall.',
    why: 'Slow strength through a bigger range plus regular gentle stretching improves flexibility better than stretching alone.',
    corrective: ['hip-hinge-drill', 'glute-bridge', 'bodyweight-leg-curl', 'dead-bug', 'romanian-deadlift', 'lying-leg-curl', 'bird-dog', 'pelvic-tilt'],
    avoid: { kinds: [], ids: [] },
    caution: 'Stretch to a mild pull only. Sharp pain behind the thigh means ease off.',
  },
  {
    id: 'hip_arthritis', label: 'Hip arthritis or stiff hips', section: 'hip',
    summary: 'A stiff, achy hip or groin, worse after sitting or in the morning.',
    why: 'Strong hips support the joint and gentle regular movement keeps it moving. The work is low impact.',
    corrective: ['glute-bridge', 'clamshells', 'side-lying-leg-raise', 'chair-squat', 'stationary-bike', 'adductor-squeeze', 'banded-hip-march', 'lateral-walk-with-band'],
    avoid: { kinds: ['plyo'], ids: [...NO_DEEP_LOWER, 'curtsy-lunge'] },
    caution: 'Hip pain that wakes you at night, or a hip that is getting steadily worse, should be checked.',
  },

  // Pelvic floor, pregnancy and postpartum
  {
    id: 'tight_pelvic_floor', label: 'Tight or overactive pelvic floor', section: 'pelvic',
    summary: 'Pelvic pain or tightness, pain with sitting or intimacy, or trouble relaxing the pelvic muscles.',
    why: 'Here the goal is relaxing and lengthening, not squeezing, so the work is breathing, release and gentle movement, and squeezing and hard core work are paused.',
    corrective: ['pelvic-floor-drop', 'diaphragmatic-breathing', 'cat-cow', 'pelvic-tilt', 'glute-bridge', 'bird-dog', 'dead-bug'],
    avoid: { kinds: [], ids: ['pelvic-floor-contraction', 'adductor-squeeze', ...CORE_PRESSURE] },
    caution: 'Persistent pelvic pain is best treated with a pelvic health physical therapist.',
  },
  {
    id: 'pregnancy', label: 'Pregnancy', section: 'pelvic',
    summary: 'Exercising while pregnant, with your provider\'s agreement.',
    why: 'The 2019 Canadian guideline recommends a mix of aerobic and resistance work plus daily pelvic floor training. Crunching, twisting, lying on your belly and impact are held out by default as a cautious choice.',
    corrective: ['diaphragmatic-breathing', 'pelvic-floor-contraction', 'pelvic-floor-drop', 'cat-cow', 'bird-dog', 'chair-squat', 'side-lying-leg-raise', 'clamshells', 'wall-slide', 'lateral-walk-with-band'],
    avoid: {
      kinds: ['plyo', 'olympic'],
      ids: [...SPINE_FLEXION, ...TWISTING, 'superman-raise', 'floor-back-extension', 'lying-leg-raise', 'dragon-flag', 'kneeling-ab-wheel-roll-out', 'mountain-climbers'],
    },
    caution: 'Check with your doctor or midwife first. If lying flat on your back makes you lightheaded, sick or unwell, switch to side-lying or an incline. Stop and call them for bleeding, dizziness, chest pain, fluid leaking, or a headache that will not go.',
  },
  {
    id: 'postpartum', label: 'Postpartum recovery', section: 'pelvic',
    summary: 'Returning to exercise after giving birth.',
    why: 'The 2025 Canadian guideline recommends daily pelvic floor training and early, gradual core retraining, and says to avoid moves that make the belly dome. Impact is held back until pelvic floor symptoms and bleeding allow.',
    corrective: ['diaphragmatic-breathing', 'pelvic-floor-contraction', 'pelvic-tilt', 'glute-bridge', 'bird-dog', 'clamshells', 'chair-squat', 'side-lying-leg-raise', 'wall-slide'],
    avoid: { kinds: ['plyo'], ids: [...DOMING_MOVES, 'kettlebell-swing', 'one-handed-kettlebell-swing'] },
    caution: 'Progress by how you feel, not a fixed date: bleeding has not increased, any wound has healed and pain is manageable. Your provider can confirm. Stop any move that makes your belly dome or bulge, or that brings leaking or heaviness.',
  },
  {
    id: 'diastasis_recti', label: 'Abdominal separation (diastasis recti)', section: 'pelvic',
    summary: 'A gap or doming down the middle of the belly, often after pregnancy.',
    why: 'Deep core and breathing work rebuild tension across the belly, while crunches and moves that make it dome are paused.',
    corrective: ['diaphragmatic-breathing', 'pelvic-tilt', 'bird-dog', 'dead-bug', 'glute-bridge', 'clamshells', 'side-lying-leg-raise', 'wall-slide'],
    avoid: { kinds: [], ids: [...DOMING_MOVES, 'cable-crunch', 'machine-crunch'] },
    caution: 'If your belly domes or cones during a move, stop that move and ask a pelvic health physical therapist.',
  },
  {
    id: 'prolapse_leaking', label: 'Prolapse or bladder leaking', section: 'pelvic',
    summary: 'A feeling of bulging or heaviness in the pelvis, or leaking with effort.',
    why: 'Low-pressure strength, breathing out on effort and pelvic floor work help. Straining, high impact and heavy bracing are paused.',
    corrective: ['diaphragmatic-breathing', 'pelvic-floor-contraction', 'glute-bridge', 'bird-dog', 'clamshells', 'chair-squat', 'adductor-squeeze', 'side-lying-leg-raise'],
    avoid: { kinds: ['plyo'], ids: [...SIT_UPS, 'hanging-leg-raise', 'hanging-knee-raise', 'captains-chair-leg-raise', 'kettlebell-swing', 'one-handed-kettlebell-swing', 'high-knees', 'butt-kicks', 'mountain-climbers', 'sled-push'] },
    caution: 'Breathe out on the effort and never hold your breath. A pelvic health physical therapist can tailor this.',
  },

  // Back and core
  {
    id: 'disc_issue', label: 'Bulging or herniated disc', section: 'back',
    summary: 'Back or leg pain that is worse with bending forward, sitting or coughing.',
    why: 'Stable, neutral-spine core work protects the disc, and loaded bending forward, sit-ups and twisting are paused.',
    corrective: ['bird-dog', 'dead-bug', 'pelvic-tilt', 'glute-bridge', 'cat-cow', 'kneeling-side-plank', 'diaphragmatic-breathing', 'hip-hinge-drill'],
    avoid: { kinds: [], ids: [...SPINE_FLEXION, ...TWISTING, 'good-morning', 'stiff-legged-deadlift', 'deadlift', 'deficit-deadlift', 'sumo-deadlift'] },
    caution: 'Some people with disc pain feel worse with forward-bending stretches, so none are included here. Leg weakness, numbness, or loss of bladder or bowel control needs urgent care.',
  },
  {
    id: 'spinal_stenosis', label: 'Spinal stenosis or back pain when standing', section: 'back',
    summary: 'Back or leg pain when standing or walking that eases when you sit or lean forward.',
    why: 'Leaning into flexion and strong core and hips help, while arching the back under load is paused.',
    corrective: ['pelvic-tilt', 'dead-bug', 'glute-bridge', 'bird-dog', 'chair-squat', 'stationary-bike', 'diaphragmatic-breathing', 'side-lying-leg-raise'],
    avoid: { kinds: [], ids: ['back-extension', 'floor-back-extension', 'superman-raise', 'reverse-hyperextension', 'cobra-push-up', 'handstand-push-up', 'wall-walk', ...BEHIND_NECK] },
    caution: 'A stationary bike or reclined position often feels better than standing. Follow what eases the pain.',
  },
  {
    id: 'scoliosis', label: 'Scoliosis', section: 'back',
    summary: 'A sideways curve in the spine, with an uneven back or shoulders.',
    why: 'Balanced core, back and breathing work keeps the muscles around the spine strong on both sides.',
    corrective: ['side-plank', 'kneeling-side-plank', 'bird-dog', 'dead-bug', 'diaphragmatic-breathing', 'prone-t-raise', 'scapular-squeeze', 'cat-cow', 'glute-bridge', 'pallof-press'],
    avoid: { kinds: [], ids: [] },
    caution: 'Scoliosis is individual. A physical therapist trained in it can tailor the best moves for your curve.',
  },
  {
    id: 'stiff_mid_back', label: 'Stiff mid back', section: 'back',
    summary: 'A locked-up upper or middle back, hard to rotate or stand tall.',
    why: 'Rotation and extension mobility for the mid back plus shoulder blade strength unlock the area.',
    corrective: ['open-book-rotation', 'cat-cow', 'wall-slide', 'prone-t-raise', 'prone-y-raise', 'scapular-squeeze', 'face-pull', 'band-pull-apart'],
    avoid: { kinds: [], ids: [] },
    caution: 'Sharp chest or rib pain, or pain with breathing, is not a stiffness problem. See a doctor.',
  },

  // Shoulders, arms, wrists and neck
  {
    id: 'rotator_cuff', label: 'Rotator cuff irritation', section: 'upper',
    summary: 'A deep ache in the shoulder, worse reaching overhead or lying on that side.',
    why: 'Gentle rotator cuff and shoulder blade strength helps, while heavy overhead pressing, dips and upright rows are paused.',
    corrective: ['isometric-shoulder-external-rotation', 'band-external-shoulder-rotation', 'scapular-squeeze', 'wall-slide', 'serratus-wall-push', 'prone-t-raise', 'face-pull', 'band-pull-apart', 'lying-dumbbell-external-shoulder-rotation'],
    avoid: { kinds: ['plyo'], ids: [...BEHIND_NECK, ...DIPS, ...JERKS, 'barbell-upright-row', 'handstand-push-up', 'overhead-press', 'seated-barbell-overhead-press', 'muscle-up-bar', 'muscle-up-rings'] },
    caution: 'Pain at night, a sudden loss of strength, or being unable to lift the arm should be checked.',
  },
  {
    id: 'shoulder_impingement', label: 'Shoulder pinching when lifting the arm', section: 'upper',
    summary: 'A pinch when raising the arm out to the side or overhead.',
    why: 'Shoulder blade control and cuff strength make space in the joint, and moves that pinch it, like upright rows and behind-the-neck presses, are paused.',
    corrective: ['wall-slide', 'serratus-wall-push', 'scapular-squeeze', 'band-external-shoulder-rotation', 'face-pull', 'prone-t-raise', 'prone-y-raise', 'isometric-shoulder-external-rotation'],
    avoid: { kinds: [], ids: [...BEHIND_NECK, 'barbell-upright-row', 'handstand-push-up', 'wall-walk', 'bar-dip', 'ring-dip', 'bench-dip'] },
    caution: 'Keep arm raises below the point where it pinches, and stop if it sharpens.',
  },
  {
    id: 'shoulder_instability', label: 'Loose or slipping shoulder', section: 'upper',
    summary: 'A shoulder that feels like it slips, clunks or goes out, or that has dislocated before.',
    why: 'Control through the rotator cuff and shoulder blade holds the joint steady, while deep stretches, dips and hanging are paused.',
    corrective: ['isometric-shoulder-external-rotation', 'band-external-shoulder-rotation', 'band-internal-shoulder-rotation', 'scapular-squeeze', 'serratus-wall-push', 'face-pull', 'prone-t-raise', 'kneeling-plank'],
    avoid: { kinds: [], ids: [...BEHIND_NECK, ...DIPS, ...BAR_HANGS, 'dumbbell-chest-fly', 'dumbbell-pullover', 'muscle-up-bar', 'muscle-up-rings', 'handstand-push-up'] },
    caution: 'A shoulder that has dislocated more than once should be assessed by a doctor or physical therapist.',
  },
  {
    id: 'frozen_shoulder', label: 'Stiff or frozen shoulder', section: 'upper',
    summary: 'A shoulder that has gradually lost movement, with pain reaching up or behind you.',
    why: 'Gentle, frequent, pain-free movement keeps the shoulder moving, while heavy overhead and hanging work is paused.',
    corrective: ['arm-pendulum', 'wall-slide', 'scapular-squeeze', 'isometric-shoulder-external-rotation', 'diaphragmatic-breathing', 'prone-t-raise', 'serratus-wall-push'],
    avoid: { kinds: [], ids: [...BEHIND_NECK, ...BAR_HANGS, 'overhead-press', 'seated-barbell-overhead-press', 'handstand-push-up', 'wall-walk', 'pull-up', 'chin-up'] },
    caution: 'This tends to recover slowly. Never force a stretch, and ask a physical therapist about your stage.',
  },
  {
    id: 'wrist_pain', label: 'Wrist pain or stiffness', section: 'upper',
    summary: 'Wrist pain when bearing weight or gripping, such as in push-ups or planks.',
    why: 'Light forearm strength helps the wrist, and moves that load a bent-back wrist, such as push-ups and the rack position, are paused.',
    corrective: ['isometric-wrist-extension', 'isometric-wrist-flexion', 'tendon-glides', 'dumbbell-wrist-extension', 'dumbbell-wrist-curl', 'scapular-squeeze'],
    avoid: { kinds: ['olympic', 'plyo'], ids: ['push-up', 'plank-to-push-up', 'cobra-push-up', 'decline-push-up', 'close-grip-push-up', 'plank', 'weighted-plank', 'plank-with-shoulder-taps', 'handstand-push-up', 'wall-walk', 'front-squat', 'kettlebell-front-squat', 'barbell-wrist-curl-behind-the-back'] },
    caution: 'If you can, use fists or handles to keep your wrist straight. Wrist pain after a fall needs checking.',
  },
  {
    id: 'carpal_tunnel', label: 'Carpal tunnel or numb hands', section: 'upper',
    summary: 'Tingling or numbness in the thumb, index and middle fingers, often worse at night or while typing.',
    why: 'Nerve glides, posture and shoulder strength reduce pressure along the arm, while heavy gripping and wrist curls are paused.',
    corrective: ['tendon-glides', 'scapular-squeeze', 'chin-tuck', 'wall-slide', 'open-book-rotation', 'isometric-wrist-extension'],
    avoid: { kinds: [], ids: ['gripper', 'wrist-roller', 'barbell-wrist-curl', 'dumbbell-wrist-curl', 'plate-wrist-curl', 'barbell-wrist-curl-behind-the-back', 'farmers-walk', 'plate-pinch', ...BAR_HANGS, 'towel-pull-up', 'towel-row'] },
    caution: 'Numbness that is constant, weakness in the hand, or dropping things should be checked by a doctor.',
  },
  {
    id: 'weak_grip', label: 'Weak grip', section: 'upper',
    summary: 'Your grip gives out before your muscles do on pulls and carries.',
    why: 'Grip and forearm strength is built with short, gradual holds and squeezes.',
    corrective: ['towel-grip-squeeze', 'gripper', 'plate-pinch', 'farmers-walk', 'bar-hang', 'dumbbell-wrist-extension', 'dumbbell-wrist-curl', 'isometric-wrist-flexion'],
    avoid: { kinds: [], ids: [] },
    caution: 'Build slowly. Forearm or elbow pain means cut back.',
  },

  // Whole body and life stages
  {
    id: 'hypermobility', label: 'Hypermobile joints (bendy joints, EDS)', section: 'general',
    summary: 'Joints that bend past normal, that sublux or feel unstable, or frequent sprains.',
    why: 'Strength and control inside the normal range protect loose joints, so the work is slow and stable and end-range stretching is paused.',
    corrective: ['single-leg-balance', 'tandem-stance', 'glute-bridge', 'dead-bug', 'bird-dog', 'scapular-squeeze', 'isometric-shoulder-external-rotation', 'wall-sit', 'short-foot', 'serratus-wall-push'],
    avoid: { kinds: [], ids: ['dumbbell-chest-fly', 'dumbbell-pullover', 'cossack-squat', 'jefferson-curl', ...BEHIND_NECK, ...BAR_HANGS, 'dragon-flag', 'front-lever', 'back-lever', 'planche'] },
    caution: 'Stop before the end of any range and never push into a stretch. A physical therapist who knows hypermobility can tailor this.',
  },
  {
    id: 'osteoporosis', label: 'Osteoporosis or low bone density', section: 'general',
    summary: 'Thin or weaker bones that are more at risk of fracture.',
    why: 'The UK consensus statement recommends resistance, balance and spinal extension work, and avoiding high spinal flexion. It also recommends impact for bone, but jumping moves are held out here because we do not know your fracture history.',
    corrective: ['chair-squat', 'glute-bridge', 'bird-dog', 'wall-slide', 'prone-t-raise', 'superman-raise', 'floor-back-extension', 'single-leg-balance', 'tandem-stance', 'heel-raise', 'goblet-squat', 'chest-supported-dumbbell-row'],
    avoid: { kinds: ['plyo', 'olympic'], ids: [...SPINE_FLEXION, 'good-morning'] },
    caution: 'Ask your doctor whether light impact is right for you: it helps bone, but people with a spinal fracture usually keep impact to about brisk-walking level. New sudden back pain after lifting or a small fall needs a check.',
  },
  {
    id: 'high_blood_pressure', label: 'High blood pressure', section: 'general',
    summary: 'Diagnosed high blood pressure.',
    why: 'Steady, moderate exercise helps. The work avoids heavy straining, breath holding and head-down positions.',
    corrective: ['stationary-bike', 'diaphragmatic-breathing', 'chair-squat', 'glute-bridge', 'wall-sit', 'bird-dog', 'heel-raise', 'dumbbell-row'],
    avoid: { kinds: ['olympic'], ids: ['handstand-push-up', 'wall-walk', 'dragon-flag', 'planche'] },
    caution: 'Check with your doctor. Breathe out on the effort, never hold your breath, and stop for chest pain, severe headache or dizziness.',
  },
  {
    id: 'dizziness_pots', label: 'Dizziness on standing (POTS, low blood pressure)', section: 'general',
    summary: 'Lightheaded, a racing heart or fading vision when you stand up or stand for long.',
    why: 'Programs for POTS typically start with horizontal cardio such as a rowing machine or recumbent bike, and seated or lying strength work before progressing to standing. Fast get-ups are paused.',
    corrective: ['seated-march', 'ankle-pumps', 'rowing-machine', 'heel-raise', 'glute-bridge', 'diaphragmatic-breathing', 'adductor-squeeze', 'seated-calf-raise', 'chair-squat', 'stationary-bike'],
    avoid: { kinds: ['plyo'], ids: ['prisoner-get-up', 'turkish-get-up', 'devils-press', 'ground-to-overhead', 'kettlebell-thrusters', 'mountain-climbers'] },
    caution: 'Drink fluids, stand up slowly, keep support nearby, and sit or lie down if lightheaded. Typical programs avoid strength work on back-to-back days and exercising in heat. Follow your clinician\'s plan for POTS.',
  },
  {
    id: 'balance_falls', label: 'Balance problems or fall risk', section: 'general',
    summary: 'Unsteady on your feet, or worried about falling.',
    why: 'Balance, leg strength and quick-reaction ability can all be trained, and moves that are unstable or one-legged under load are paused.',
    corrective: ['single-leg-balance', 'tandem-stance', 'chair-squat', 'heel-raise', 'tibialis-raise', 'side-step', 'glute-bridge', 'clamshells', 'wall-sit', 'step-up'],
    avoid: { kinds: ['plyo'], ids: [...NO_DEEP_LOWER, 'single-leg-deadlift-with-kettlebell', 'single-leg-romanian-deadlift', 'curtsy-lunge', 'kettlebell-windmill', 'turkish-get-up', 'prisoner-get-up', 'mountain-climbers'] },
    caution: 'Always practice next to a counter or sturdy support, and have someone nearby for the harder balance work.',
  },
  {
    id: 'fatigue_pain', label: 'Chronic fatigue or widespread pain (fibromyalgia)', section: 'general',
    summary: 'Long-lasting fatigue or body-wide pain, where overdoing it can cause a crash.',
    why: 'Short, gentle, well-paced sessions build tolerance without a crash, and high-intensity and heavy work is paused.',
    corrective: ['diaphragmatic-breathing', 'chair-squat', 'glute-bridge', 'seated-march', 'wall-slide', 'cat-cow', 'ankle-pumps', 'stationary-bike'],
    avoid: { kinds: ['plyo', 'olympic'], ids: ['devils-press', 'kettlebell-swing', 'one-handed-kettlebell-swing', 'sled-push', 'high-knees', 'butt-kicks', 'mountain-climbers', 'ground-to-overhead', 'kettlebell-thrusters'] },
    caution: 'Stay well inside your comfort zone and stop early. If a session leaves you worse for a day or more, do less next time.',
  },
  {
    id: 'post_surgery', label: 'Recovering after surgery or injury', section: 'general',
    summary: 'Returning to exercise after a surgery or injury that you have been cleared to move after.',
    why: 'Gentle movement, balance and low-load strength help you rebuild, while impact and explosive lifts are paused.',
    corrective: ['diaphragmatic-breathing', 'glute-bridge', 'chair-squat', 'single-leg-balance', 'bird-dog', 'wall-slide', 'scapular-squeeze', 'ankle-pumps', 'stationary-bike'],
    avoid: { kinds: ['plyo', 'olympic'], ids: [] },
    caution: 'Only start when your surgeon or clinician has cleared you, and follow their limits first. They know your procedure.',
  },
];
