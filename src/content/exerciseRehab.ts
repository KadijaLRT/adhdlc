import type { CatalogRow } from './exerciseCatalog';

/**
 * A few gentle rehab and activation moves that the StrengthLog directory does
 * not list (the directory is about lifting). They exist so every restriction in
 * restrictions.ts has something sensible to point at. All of them are kind
 * 'prehab', which keeps them out of automatic picks: they only show up when a
 * restriction asks for them, or when someone browses, searches or swaps.
 *
 * Optional fields override the defaults for the kind (sets, reps, rest, cues),
 * because holds and breathing work do not fit a generic "light reps" template.
 */
export interface RehabRow extends CatalogRow {
  sets?: number;
  reps?: string;
  repsMin?: number;
  rest?: number;
  cues?: string;
  points?: string[];
}

const NONE: string[][] = [[]];

export const REHAB_CATALOG: RehabRow[] = [
  {
    id: 'bird-dog', name: 'Bird Dog', group: 'core', muscle: 'Abs', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '8-10 each', repsMin: 8, rest: 45,
    cues: 'On hands and knees, reach one arm and the opposite leg out until they line up with your back. Keep your hips level and your ribs down. Pause for 2 seconds, come back, then switch sides.',
    points: ['Hips stay level', 'Pause at the top', 'Move slowly'],
  },
  {
    id: 'pelvic-floor-contraction', name: 'Pelvic Floor Contraction', group: 'core', muscle: 'Pelvic floor', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10 slow holds', repsMin: 10, rest: 30,
    cues: 'Lie down or sit comfortably. Gently lift and draw in the muscles you would use to hold back gas. Hold for about 5 seconds, then let go completely for 5 seconds. Keep breathing, and keep your thighs, glutes and belly relaxed. Do not practice this while urinating.',
    points: ['Gentle, not a hard squeeze', 'Fully relax between holds', 'Keep breathing'],
  },
  {
    id: 'diaphragmatic-breathing', name: 'Diaphragmatic Breathing', group: 'core', muscle: 'Deep core', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '8-10 slow breaths', repsMin: 8, rest: 30,
    cues: 'Lie on your back with your knees bent. Breathe in slowly through your nose and let your lower ribs and belly widen in all directions. Breathe out slowly and feel your lower belly gently draw in. No forcing.',
    points: ['Ribs widen on the inhale', 'Slow exhale', 'No forcing'],
  },
  {
    id: 'terminal-knee-extension', name: 'Terminal Knee Extension', group: 'quads', muscle: 'Quads', requires: [['resistance_band']], kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '12-15 each', repsMin: 12, rest: 45,
    cues: 'Loop a band behind one knee and anchor it in front of you. Start with that knee slightly bent, then straighten it fully while squeezing the front of your thigh. Return slowly.',
    points: ['Squeeze the thigh at the top', 'Slow return', 'Knee in line with your toes'],
  },
  {
    id: 'wall-sit', name: 'Wall Sit', group: 'quads', muscle: 'Quads', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 3, reps: '20-30 sec', repsMin: 1, rest: 45,
    cues: 'Lean your back against a wall and slide down to a comfortable knee bend, well above parallel if your knees are sensitive. Keep your weight through your heels and breathe steadily.',
    points: ['Shallow bend is fine', 'Weight in your heels', 'Keep breathing'],
  },
  {
    id: 'single-leg-balance', name: 'Single-Leg Balance', group: 'calves', muscle: 'Ankles', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 3, reps: '30 sec each', repsMin: 1, rest: 30,
    cues: 'Stand on one foot near something you can grab. Keep your knee soft and your hips level. When that feels easy, try it with your eyes closed or on a pillow.',
    points: ['Soft knee', 'Hips level', 'Stay near support'],
  },
  {
    id: 'short-foot', name: 'Short Foot', group: 'calves', muscle: 'Foot arch', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10 slow holds each', repsMin: 10, rest: 30,
    cues: 'Stand or sit with your foot flat. Without curling your toes, draw the ball of your foot toward your heel so your arch lifts. Hold for 5 seconds, then relax.',
    points: ['Toes stay long', 'Arch lifts', 'Hold, then relax'],
  },
  {
    id: 'chin-tuck', name: 'Chin Tuck', group: 'neck', muscle: 'Deep neck', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10 slow holds', repsMin: 10, rest: 30,
    cues: 'Sit or stand tall. Glide your head straight back as if making a double chin, keeping your eyes level. Hold for 5 seconds, then relax.',
    points: ['Eyes stay level', 'Gentle, not forced', 'Hold, then relax'],
  },
  {
    id: 'adductor-squeeze', name: 'Adductor Squeeze', group: 'glutes', muscle: 'Inner thighs', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10 slow holds', repsMin: 10, rest: 30,
    cues: 'Lie on your back with your knees bent and a pillow or soft ball between your knees. Squeeze it gently for 5 seconds, then release. Breathe out as you squeeze.',
    points: ['Breathe out on the squeeze', 'Gentle effort', 'Fully release'],
  },
  {
    id: 'wall-slide', name: 'Wall Slide', group: 'shoulders', muscle: 'Shoulder blades', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10-12', repsMin: 10, rest: 45,
    cues: 'Stand with your back and forearms against a wall, elbows bent. Slide your arms up the wall as far as you can without your back arching or your ribs flaring, then slide down slowly.',
    points: ['Ribs stay down', 'Stop before it pinches', 'Slow and smooth'],
  },
  {
    id: 'prone-t-raise', name: 'Prone T Raise', group: 'upper_back', muscle: 'Rear shoulders', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10-12', repsMin: 10, rest: 45,
    cues: 'Lie face down with your arms out to the sides, thumbs up. Squeeze your shoulder blades together and lift your arms a few inches. Lower slowly. Keep your neck long.',
    points: ['Squeeze shoulder blades', 'Small lift is enough', 'Neck stays long'],
  },
  {
    id: 'isometric-wrist-extension', name: 'Isometric Wrist Extension', group: 'forearms', muscle: 'Forearms', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 3, reps: '30 sec each', repsMin: 1, rest: 30,
    cues: 'Rest your forearm palm down on a table with your wrist at the edge. Press the back of your hand up into your other hand, which resists so nothing moves. Build to a moderate effort and hold for 30 seconds. Switch sides after each hold.',
    points: ['No movement, just pressure', 'Moderate effort, no sharp pain', 'Keep breathing'],
  },
  {
    id: 'isometric-wrist-flexion', name: 'Isometric Wrist Flexion', group: 'forearms', muscle: 'Forearms', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 3, reps: '30 sec each', repsMin: 1, rest: 30,
    cues: 'Rest your forearm palm up on a table with your wrist at the edge. Press your palm up into your other hand, which resists so nothing moves. Build to a moderate effort and hold for 30 seconds. Switch sides after each hold.',
    points: ['No movement, just pressure', 'Moderate effort, no sharp pain', 'Keep breathing'],
  },
  // Knee and thigh
  {
    id: 'quad-set', name: 'Quad Set', group: 'quads', muscle: 'Quads', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10 slow holds each', repsMin: 10, rest: 30,
    cues: 'Sit or lie with one leg straight. Tighten the front of that thigh so your kneecap draws up and the back of the knee presses down. Hold for 5 seconds, then relax fully.',
    points: ['Kneecap draws up', 'Hold, then fully relax', 'No pain, just effort'],
  },
  {
    id: 'straight-leg-raise', name: 'Straight Leg Raise', group: 'quads', muscle: 'Quads and hip flexors', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10-12 each', repsMin: 10, rest: 30,
    cues: 'Lie on your back with one knee bent and the other leg straight. Tighten the straight leg thigh, lift it to the height of the bent knee, pause, and lower slowly.',
    points: ['Tighten the thigh first', 'Lift to knee height', 'Lower slowly'],
  },
  {
    id: 'heel-slide', name: 'Heel Slide', group: 'hamstrings', muscle: 'Knee mobility', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10-12 each', repsMin: 10, rest: 30,
    cues: 'Lie on your back with your legs straight. Slowly slide one heel toward your hips, bending the knee as far as is comfortable, then slide it back out. Keep it smooth and pain-free.',
    points: ['Only as far as comfortable', 'Smooth and slow', 'Keep the heel on the floor'],
  },
  {
    id: 'side-step', name: 'Side Step', group: 'glutes', muscle: 'Outer hips', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10 each way', repsMin: 10, rest: 30,
    cues: 'Stand tall with a soft bend in your knees and your feet hip-width apart. Take small, controlled steps to one side, then back. Keep your toes forward and your knees from caving in.',
    points: ['Small, controlled steps', 'Knees track over toes', 'Stay tall'],
  },
  // Hips, pelvis and core
  {
    id: 'side-lying-leg-raise', name: 'Side-Lying Leg Raise', group: 'glutes', muscle: 'Outer hips', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10-12 each', repsMin: 10, rest: 30,
    cues: 'Lie on your side with your bottom knee bent for balance. Keep your top leg straight, toes pointing forward, and lift it a little behind the line of your body. Lower slowly without rolling your hips back.',
    points: ['Hips stacked', 'Toes point forward', 'Small and controlled'],
  },
  {
    id: 'pelvic-tilt', name: 'Pelvic Tilt', group: 'core', muscle: 'Deep core', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10-12', repsMin: 10, rest: 30,
    cues: 'Lie on your back with your knees bent. Breathe out and gently flatten the small of your back toward the floor by tilting your pelvis. Breathe in and let it return to neutral. Small movements only.',
    points: ['Breathe out as you tilt', 'Small and slow', 'No pushing through your legs'],
  },
  {
    id: 'pelvic-floor-drop', name: 'Pelvic Floor Release', group: 'core', muscle: 'Pelvic floor', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '8 slow releases', repsMin: 8, rest: 30,
    cues: 'Lie on your back with your knees bent and a relaxed belly. As you breathe in, let the muscles between your sit bones soften and drop, like letting go. Breathe out and let them return on their own. The aim is relaxing, not squeezing.',
    points: ['Soften, do not squeeze', 'Breathe into your lower ribs', 'Keep glutes and thighs loose'],
  },
  {
    id: 'hip-hinge-drill', name: 'Wall Hip Hinge', group: 'hamstrings', muscle: 'Hips and hamstrings', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '8-10', repsMin: 8, rest: 45,
    cues: 'Stand a short step in front of a wall with your back to it. With soft knees, push your hips straight back until they touch the wall, keeping your back flat. Then squeeze your glutes to stand tall.',
    points: ['Hips go back, not down', 'Back stays flat', 'Squeeze glutes to stand'],
  },
  {
    id: 'cat-cow', name: 'Cat-Cow', group: 'lower_back', muscle: 'Spine mobility', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '8-10 slow rounds', repsMin: 8, rest: 30,
    cues: 'On hands and knees, breathe in and gently let your belly sink and your chest lift. Breathe out and round your back toward the ceiling. Move within a comfortable range.',
    points: ['Slow and smooth', 'Comfortable range only', 'Move with your breath'],
  },
  {
    id: 'open-book-rotation', name: 'Open Book Rotation', group: 'upper_back', muscle: 'Mid back', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '8 each', repsMin: 8, rest: 30,
    cues: 'Lie on your side with your knees bent and stacked and your arms straight in front of you. Open your top arm like a book, following your hand with your eyes, as far as is comfortable. Return slowly.',
    points: ['Knees stay together', 'Follow your hand with your eyes', 'Breathe out as you open'],
  },
  // Shoulder, neck and hand
  {
    id: 'scapular-squeeze', name: 'Shoulder Blade Squeeze', group: 'upper_back', muscle: 'Mid back', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10 slow holds', repsMin: 10, rest: 30,
    cues: 'Sit or stand tall with your arms relaxed. Gently draw your shoulder blades back and down, as if tucking them into your back pockets. Hold for 3 seconds, then relax. Do not shrug.',
    points: ['Down and back, no shrugging', 'Hold, then relax', 'Ribs stay down'],
  },
  {
    id: 'serratus-wall-push', name: 'Wall Push-Up Plus', group: 'shoulders', muscle: 'Shoulder blade control', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '10-12', repsMin: 10, rest: 45,
    cues: 'Stand facing a wall with your hands on it at shoulder height. Do a slow wall push-up, then at the top push a little further so your shoulder blades spread apart around your ribs. Return slowly.',
    points: ['Push a little extra at the top', 'Neck stays long', 'Slow return'],
  },
  {
    id: 'prone-y-raise', name: 'Prone Y Raise', group: 'upper_back', muscle: 'Lower traps', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '8-10', repsMin: 8, rest: 45,
    cues: 'Lie face down with your arms reaching overhead in a Y, thumbs up. Draw your shoulder blades down and lift your arms a few inches. Lower slowly. Keep your neck long.',
    points: ['Shoulder blades down first', 'Small lift is enough', 'Neck stays long'],
  },
  {
    id: 'arm-pendulum', name: 'Arm Pendulum', group: 'shoulders', muscle: 'Shoulder mobility', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10 each way', repsMin: 10, rest: 30,
    cues: 'Lean forward with one hand on a table and let the other arm hang loose. Use your body to gently swing the arm in small circles, then reverse. The arm stays relaxed and is moved by your body.',
    points: ['Arm stays relaxed', 'Small circles', 'Move from your body, not your shoulder'],
  },
  {
    id: 'isometric-shoulder-external-rotation', name: 'Isometric Shoulder Rotation', group: 'shoulders', muscle: 'Rotator cuff', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 3, reps: '20 sec each', repsMin: 1, rest: 30,
    cues: 'Stand beside a door frame with your elbow bent to 90 degrees and tucked at your side. Press the back of your hand gently outward into the frame so nothing moves. Build to a moderate effort and hold. Switch sides after each hold.',
    points: ['Elbow stays at your side', 'No movement, just pressure', 'Moderate effort, no sharp pain'],
  },
  {
    id: 'tendon-glides', name: 'Hand Tendon Glides', group: 'forearms', muscle: 'Hand and wrist', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '8-10', repsMin: 8, rest: 30,
    cues: 'Start with your fingers straight. Move slowly through a hook fist, a full fist, a flat fist and back to straight, pausing briefly at each shape. Keep the wrist neutral and stay pain-free.',
    points: ['Slow and smooth', 'Wrist stays neutral', 'Stay pain-free'],
  },
  {
    id: 'towel-grip-squeeze', name: 'Towel Grip Squeeze', group: 'forearms', muscle: 'Grip', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10 slow holds each', repsMin: 10, rest: 30,
    cues: 'Hold a rolled towel in one hand. Squeeze firmly for 5 seconds, then release fully. Keep your wrist straight and keep breathing.',
    points: ['Wrist stays straight', 'Squeeze, then fully release', 'Keep breathing'],
  },
  // Foot, ankle and balance
  {
    id: 'towel-scrunch', name: 'Towel Scrunch', group: 'calves', muscle: 'Foot muscles', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10-12 each', repsMin: 10, rest: 30,
    cues: 'Sit with your foot flat on a small towel. Use your toes to scrunch the towel toward you, then spread them to release. Keep your heel on the floor.',
    points: ['Heel stays down', 'Scrunch, then release', 'Slow and controlled'],
  },
  {
    id: 'ankle-circles', name: 'Ankle Circles', group: 'calves', muscle: 'Ankle mobility', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 2, reps: '10 each way', repsMin: 10, rest: 30,
    cues: 'Sit with one leg lifted. Slowly draw the biggest circle you can with your toes, keeping your leg still. Do both directions, then switch.',
    points: ['Leg stays still', 'Big, slow circles', 'Both directions'],
  },
  {
    id: 'ankle-pumps', name: 'Ankle Pumps', group: 'calves', muscle: 'Calf pump', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '20', repsMin: 20, rest: 30,
    cues: 'Sit or lie with your legs supported. Point your toes away, then pull them back toward you, moving through the full range. Keep a steady, easy rhythm.',
    points: ['Full range both ways', 'Easy, steady rhythm', 'Breathe normally'],
  },
  {
    id: 'seated-march', name: 'Seated March', group: 'quads', muscle: 'Hip flexors', requires: NONE, kind: 'prehab',
    compound: false, uni: false, advanced: false,
    sets: 2, reps: '20 steps', repsMin: 20, rest: 30,
    cues: 'Sit tall in a sturdy chair. Lift one knee, lower it, then the other, like marching on the spot. Keep your back tall and a relaxed pace.',
    points: ['Sit tall', 'Easy pace', 'Breathe normally'],
  },
  {
    id: 'tandem-stance', name: 'Tandem Stance', group: 'calves', muscle: 'Balance', requires: NONE, kind: 'prehab',
    compound: false, uni: true, advanced: false,
    sets: 3, reps: '30 sec each', repsMin: 1, rest: 30,
    cues: 'Stand beside a counter with one foot directly in front of the other, heel to toe. Hold the position for the time, using the counter lightly if you need to. Switch which foot is in front on the next set.',
    points: ['Stay near support', 'Look at a fixed spot', 'Switch feet each set'],
  },
];
