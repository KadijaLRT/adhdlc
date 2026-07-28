export interface DopamineMenuCategory {
  cat: string;
  icon: string;
  items: string[];
}

// Ported from the old app's toolkit.
export const DOPAMINE_MENU: DopamineMenuCategory[] = [
  { cat: 'Physical', icon: '🏃', items: ['20-min brisk walk outside', 'Dancing alone to a song you love', '10 min of jumping jacks or jump rope', 'Swimming or any water movement', 'Yoga or stretching with music', 'Running — even just 10 minutes', 'Cycling (stationary or outdoor)', 'A sport you loved as a kid'] },
  { cat: 'Creative', icon: '🎨', items: ['Drawing or doodling with no goal', 'Playing an instrument just for fun', 'Writing in a journal or freewriting', 'Trying a new recipe or baking', 'Rearranging a small space', 'Photography — just your phone', 'Crafting or making something with your hands', 'Singing — car, shower, anywhere'] },
  { cat: 'Social', icon: '👯', items: ['Call a friend who makes you laugh', 'Spontaneous coffee or walk with someone', "Share something you're excited about", 'Play a game with someone', 'Text appreciation to someone you love', 'Work in a café or public space'] },
  { cat: 'Sensory', icon: '🧘', items: ['Hot bath or long shower with music', 'A scent that genuinely lifts you', 'Light a candle you love', 'Change rooms or go outside', 'Cozy blanket, comfortable clothes', 'Eat something truly delicious, slowly'] },
  { cat: 'Mental', icon: '🧠', items: ["Watch a documentary on something fascinating", "Read about a topic you're genuinely curious about", 'Listen to a podcast that expands your mind', 'Learn one new fact and tell someone', 'Solve a puzzle or word game', 'Watch a comfort show that makes you happy'] },
  { cat: 'Accomplishment', icon: '✅', items: ["Finish one tiny task that's been bugging you", 'Clean one small thing', "Reply to one message you've been avoiding", 'Organize one drawer or shelf', 'Check one thing off a list', 'Water your plants'] },
];

export interface RSDStep {
  n: number;
  title: string;
  desc: string;
}

// The 90-second neurological reset protocol from the old app's RSD tool.
export const RSD_STEPS: RSDStep[] = [
  { n: 1, title: 'Name It', desc: 'Say it out loud: "This is my RSD firing." Naming it activates the prefrontal cortex and begins to separate you from the emotion. You are not the feeling — you are the one noticing it.' },
  { n: 2, title: 'Body First', desc: 'Before responding to anything, breathe out slowly for 6 counts. Feel your feet on the floor. The emotion lives in your body first — address the body before the mind.' },
  { n: 3, title: 'The 90-Second Rule', desc: 'Neurologically, the acute chemical surge of an emotion lasts 90 seconds. Your only job is to not act for 90 seconds. Start a timer. You just have to wait it out.' },
  { n: 4, title: 'Reality Check', desc: 'Ask yourself: "Is this RSD or is this real?" RSD distorts everything to feel catastrophic. Ask: what is the actual evidence? What would I tell a friend in this situation?' },
  { n: 5, title: "Respond, Don't React", desc: 'After 90 seconds of breathing, you are no longer hijacked. Now you can choose your response. You have options. You are not your reaction.' },
];

export interface FocusQuickFix {
  prob: string;
  sol: string;
  icon: string;
}

export const FOCUS_QUICK_FIXES: FocusQuickFix[] = [
  { prob: "I can't start a task", sol: 'Use the 5-4-3-2-1 Launch. Commit to 1–5 minutes only. Set a timer. Your only job is to begin.', icon: '🚀' },
  { prob: "I'm distracted by everything", sol: "Environment design. Clear the desk. Phone in another room. Headphones on. Remove the trigger, don't fight it.", icon: '🌀' },
  { prob: "I can't work alone", sol: "Body doubling. Focusmate, café, 'study with me' video, or a friend on video call.", icon: '👥' },
  { prob: 'The task is boring', sol: 'Dopamine stack. Add a podcast, playlist, or snack reward to make it tolerable. Fuel first, then work.', icon: '😴' },
  { prob: 'I keep losing time', sol: 'ADHD time-blocking. 25–45 min blocks + 10 min buffer zones. Use a visible timer, not just a phone alarm.', icon: '⏰' },
  { prob: "I'm hyperfocusing and can't stop", sol: 'Set labeled alarms in advance. Tell someone to interrupt you. Create a physical stop signal before you start.', icon: '🔥' },
];

export interface MotivatorOption {
  id: 'play' | 'interest' | 'novelty' | 'connection' | 'urgency';
  label: string;
  emoji: string;
  description: string;
  quickTry: string;
}

// PINCH — the five things that actually get an ADHD brain to start
// (William Dodson's "interest-based nervous system," condensed into
// ImpactParents' more memorable acronym). Used to tag tasks so someone
// can see, at a glance, whether a stalled task has any of these levers
// available to it — not to replace priority/category, which are about
// what matters, not what motivates.
export const MOTIVATOR_OPTIONS: MotivatorOption[] = [
  {
    id: 'play', label: 'Play', emoji: '🎲',
    description: 'Humor, creativity, gamifying it — make it fun instead of a slog.',
    quickTry: 'Turn it into a game right now: race a 5-minute timer, or make the boring part a bit.',
  },
  {
    id: 'interest', label: 'Interest', emoji: '✨',
    description: 'Genuinely compelling to you — the opposite of "should."',
    quickTry: 'Find the one genuinely interesting part of this and start there, not at the beginning.',
  },
  {
    id: 'novelty', label: 'Novelty', emoji: '🌱',
    description: 'New, different, or unfamiliar — the brain leans in for what it hasn\u2019t seen before.',
    quickTry: 'Change one thing about how you\u2019re doing it — new location, new playlist, new order of steps.',
  },
  {
    id: 'connection', label: 'Connection', emoji: '🤝',
    description: 'Competition, collaboration, or doing it with/for someone else.',
    quickTry: 'Text someone "starting X now" — or start a body doubling session below.',
  },
  {
    id: 'urgency', label: 'Hurry Up', emoji: '⏱️',
    description: 'A real deadline or ticking clock — urgency, not guilt.',
    quickTry: 'Set a real timer for 10 minutes and see how far you get before it goes off.',
  },
];

export interface LearnTopic {
  id: string;
  label: string;
  icon: string;
  description: string;
  adhdLink?: string;
  tips: string[];
}

// Condensed reference content for Wellness's "Learn" library, covering
// what the old toolkit split across Understand / Relationships / Money
// / Food & ADHD tabs — kept concise rather than a 1:1 port of every
// sub-topic, since this is meant to sit as a quiet reference inside an
// existing screen, not become its own sprawling section.
export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: 'anxiety-generalized', label: 'Generalized Anxiety', icon: '🌀',
    description: 'Persistent, excessive worry about everyday things — work, health, family — even when there is no clear reason.',
    adhdLink: 'ADHD and GAD share the same nervous system dysregulation. The worry is often about consequences of ADHD-related forgetting, failure, or falling behind.',
    tips: ['Scheduled worry time (15 min/day, then close it out)', 'Body scan to locate physical tension', 'The 5-4-3-2-1 grounding technique', 'Limiting news and social media input windows'],
  },
  {
    id: 'rsd-social', label: 'Rejection Sensitivity & Social Anxiety', icon: '💔',
    description: 'Intense fear of being judged, embarrassed, or rejected in social situations.',
    adhdLink: 'RSD amplifies social anxiety — every interaction can carry the weight of past embarrassments and perceived failures.',
    tips: ['Prepare one conversation topic before events', 'Name the feared outcome specifically — vague fear is harder to counter', 'Post-event review: list one thing that went fine'],
  },
  {
    id: 'trauma', label: 'ADHD & Trauma', icon: '🛡️',
    description: 'Intrusive memories, hypervigilance, and avoidance following trauma keep the nervous system in threat-detection mode.',
    adhdLink: 'ADHD + trauma is extremely common — both dysregulate the same prefrontal-limbic circuit. Somatic approaches often work better than purely cognitive ones when activated.',
    tips: ['Safe place visualization: build a mental sanctuary in detail', 'Grounding anchors during exposure to triggers', 'Professional trauma therapy (EMDR, somatic experiencing) is highly effective'],
  },
  {
    id: 'relationships', label: 'ADHD & Relationships', icon: '❤️',
    description: 'ADHD affects romantic, family, friend, and work relationships differently — commonly through forgetfulness read as not caring, emotional intensity, or time blindness around commitments.',
    tips: ['Externalize commitments — shared calendars, not memory', 'Name the pattern out loud to people close to you so it reads as neurology, not carelessness', "RSD can make feedback feel like rejection — ask for a beat before reacting", 'Regular check-ins prevent small friction from becoming resentment'],
  },
  {
    id: 'money', label: 'ADHD & Money', icon: '💳',
    description: 'Impulsive spending is not a moral failure — it is dopamine dysregulation meeting systems designed to exploit impulsive decisions.',
    adhdLink: 'A new purchase produces a dopamine spike that mimics accomplishment. Understimulated or dysregulated brains are especially vulnerable to it.',
    tips: ['24-hour rule on non-essential purchases over a set amount', 'Automate savings and bills so they never depend on remembering', 'Use visual, not spreadsheet, budgeting if numbers overwhelm', 'Treat a slip as data, not a character flaw'],
  },
  {
    id: 'food-adhd', label: 'Food & ADHD', icon: '🍽️',
    description: 'Executive dysfunction affects eating as much as it affects tasks — forgetting to eat, decision paralysis at mealtime, and texture/sensory sensitivities are all common.',
    tips: ['Keep 2-3 "zero-decision" meals always stocked', 'Protein earlier in the day is linked to steadier focus', 'Set an eating reminder if hunger cues are unreliable for you', "It's okay if the same meal on repeat is what actually works"],
  },
  {
    id: 'pinch-motivation', label: 'What Actually Motivates ADHD (PINCH)', icon: '🧲',
    description: 'The ADHD brain runs on an interest-based nervous system, not an importance-based one — obligation and deadlines alone often aren\u2019t enough to get it moving, no matter how much something matters.',
    adhdLink: 'Psychologist William Dodson calls the five levers INCUP: interest, novelty, challenge, urgency, passion. PINCH is an easier-to-remember version: Play, Interest, Novelty, Connection (competition/collaboration), Hurry Up (urgency). Not everyone is motivated by all five — the point is finding which ones actually work for you.',
    tips: ['Stuck on a task? Ask which of PINCH is missing, not "why can\u2019t I just do it"', 'Add play: a timer race, a silly reward, a playlist just for this', 'Borrow urgency on purpose — a real (not fake) short deadline', 'Pair it with someone — body doubling turns a solo task into connection', 'Tag tasks with their motivator in Tasks, so a stalled one shows what lever is available'],
  },
];
