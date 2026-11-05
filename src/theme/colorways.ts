/**
 * Colorways and button looks.
 *
 * The app styles itself with Tailwind's indigo, emerald and amber palettes
 * (primary, secondary and accent). Instead of editing hundreds of class
 * names, those three palettes read CSS variables (see tailwind.config.js),
 * and a colorway is just a set of values for those variables. Switching
 * colorway re-skins buttons, chips, tabs, progress bars and accent text in
 * one step, on web and on native.
 *
 * Two things are built from each colorway:
 *  1. A full 50..950 scale per palette, tuned so text stays readable:
 *     the 600 shade passes 4.5:1 against white (text on light screens),
 *     the 400 shade passes 4.5:1 against dark slate (text on dark screens).
 *  2. Button colors (hi, face, lo, edge, ink) used by the 3D button looks,
 *     which are drawn from the colorway's own face colors.
 */

export type ColorwayId =
  | 'default' | 'violet' | 'teal' | 'sky' | 'neon' | 'earthy' | 'pastel' | 'moody' | 'bright';
export type ButtonLook = 'chunky' | 'glossy' | 'subtle';
export type PaletteRole = 'p' | 's' | 'a';

export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Shade = (typeof SHADES)[number];

/** Tailwind palette each role drives. */
export const ROLE_PALETTE: Record<PaletteRole, 'indigo' | 'emerald' | 'amber'> = { p: 'indigo', s: 'emerald', a: 'amber' };

export interface ButtonColors {
  /** Top of the button face. */
  hi: string;
  face: string;
  /** Bottom of a glossy face. */
  lo: string;
  /** The solid lower edge on the chunky look. */
  edge: string;
  /** Text color on the face. */
  ink: string;
}

export interface Colorway {
  id: ColorwayId;
  label: string;
  /** Face colors for primary, secondary, accent, for swatches and previews. */
  roles: Record<PaletteRole, ButtonColors>;
  /** Exact scales, only for the original palette so it stays pixel-identical. */
  exact?: Record<'indigo' | 'emerald' | 'amber', Record<Shade, string>>;
}

export const BUTTON_LOOKS: { id: ButtonLook; label: string; hint: string }[] = [
  { id: 'chunky', label: 'Chunky', hint: 'A solid edge that presses down' },
  { id: 'glossy', label: 'Soft glossy', hint: 'Shiny face with a soft glow' },
  { id: 'subtle', label: 'Subtle raised', hint: 'A light bevel and small shadow' },
];

// ---------- color math ----------

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const part = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** The app's dark surface (slate-900), the background most accent text sits on in dark mode. */
const DARK_SURFACE: Rgb = [15, 23, 42];

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Darkens toward black until the color reaches the contrast target against `against`. */
function darkenToContrast(color: Rgb, against: Rgb, target: number): Rgb {
  let out = color;
  for (let i = 0; i <= 40 && contrastRatio(out, against) < target; i++) out = mix(color, BLACK, (i + 1) * 0.025);
  return out;
}

/** Lightens toward white until the color reaches the contrast target against `against`. */
function lightenToContrast(color: Rgb, against: Rgb, target: number): Rgb {
  let out = color;
  for (let i = 0; i <= 40 && contrastRatio(out, against) < target; i++) out = mix(color, WHITE, (i + 1) * 0.025);
  return out;
}

/** A full scale from one face color, with readable 400 and 600 shades. */
export function buildScale(faceHex: string): Record<Shade, string> {
  const face = hexToRgb(faceHex);
  const s600 = darkenToContrast(face, WHITE, 4.5);
  const s500 = darkenToContrast(face, WHITE, 3);
  // 500 can never be darker than 600; if the face is already dark enough, 500 is the face.
  const s500Final = luminance(s500) >= luminance(s600) ? s500 : s600;
  const s400 = lightenToContrast(face, DARK_SURFACE, 4.5);
  const s300 = mix(s400, WHITE, 0.3);
  const s200 = mix(s400, WHITE, 0.58);
  const s100 = mix(s400, WHITE, 0.8);
  const s50 = mix(s400, WHITE, 0.92);
  const s700 = mix(s600, BLACK, 0.2);
  const s800 = mix(s600, BLACK, 0.38);
  const s900 = mix(s600, BLACK, 0.55);
  const s950 = mix(s600, BLACK, 0.72);
  return {
    50: rgbToHex(s50), 100: rgbToHex(s100), 200: rgbToHex(s200), 300: rgbToHex(s300), 400: rgbToHex(s400),
    500: rgbToHex(s500Final), 600: rgbToHex(s600), 700: rgbToHex(s700), 800: rgbToHex(s800), 900: rgbToHex(s900), 950: rgbToHex(s950),
  };
}

// ---------- the colorways ----------

const DEFAULT_EXACT: NonNullable<Colorway['exact']> = {
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
};

const bc = (hi: string, face: string, lo: string, edge: string, ink: string): ButtonColors => ({ hi, face, lo, edge, ink });

export const COLORWAYS: Colorway[] = [
  {
    id: 'default', label: 'Default: indigo and green', exact: DEFAULT_EXACT,
    roles: {
      p: bc('#818cf8', '#6366f1', '#4f46e5', '#3730a3', '#ffffff'),
      s: bc('#34d399', '#10b981', '#059669', '#047857', '#ffffff'),
      a: bc('#fcd34d', '#fbbf24', '#f59e0b', '#b45309', '#2b1a02'),
    },
  },
  {
    id: 'violet', label: 'Violet and coral',
    roles: {
      p: bc('#a78bfa', '#8b5cf6', '#7c3aed', '#5b21b6', '#ffffff'),
      s: bc('#fda4af', '#fb7185', '#f43f5e', '#be123c', '#2b0610'),
      a: bc('#fde047', '#fbbf24', '#f59e0b', '#b45309', '#2b1a02'),
    },
  },
  {
    id: 'teal', label: 'Teal and amber',
    roles: {
      p: bc('#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#03221f'),
      s: bc('#fbbf24', '#f59e0b', '#d97706', '#92400e', '#2b1a02'),
      a: bc('#fffbeb', '#fef3c7', '#fde68a', '#c9a14a', '#3a2a05'),
    },
  },
  {
    id: 'sky', label: 'Sky and rose',
    roles: {
      p: bc('#7dd3fc', '#38bdf8', '#0ea5e9', '#0369a1', '#04202f'),
      s: bc('#fda4af', '#fb7185', '#f43f5e', '#be123c', '#2b0610'),
      a: bc('#ddd6fe', '#c4b5fd', '#a78bfa', '#6d28d9', '#1b0f3d'),
    },
  },
  {
    id: 'neon', label: 'Neon cyber',
    roles: {
      p: bc('#67e8f9', '#22d3ee', '#06b6d4', '#0e7490', '#022028'),
      s: bc('#f0abfc', '#e879f9', '#d946ef', '#a21caf', '#2a0630'),
      a: bc('#bef264', '#a3e635', '#84cc16', '#4d7c0f', '#14230a'),
    },
  },
  {
    id: 'earthy', label: 'Warm and earthy',
    roles: {
      p: bc('#e9946a', '#d9774a', '#c2623a', '#8f3f1f', '#ffffff'),
      s: bc('#a9c4a5', '#8fae8b', '#759672', '#4b6a4a', '#14230f'),
      a: bc('#f0c960', '#e6b440', '#d1a02a', '#8a6410', '#2b1f02'),
    },
  },
  {
    id: 'pastel', label: 'Pastel and soft',
    roles: {
      p: bc('#ffcbbd', '#ffb4a2', '#ff9c86', '#d9705a', '#4a1d12'),
      s: bc('#c4f1de', '#a8e6cf', '#86d3b3', '#4fa183', '#0f3326'),
      a: bc('#ddcbfa', '#cdb4f6', '#b998ee', '#8660c4', '#2a1650'),
    },
  },
  {
    id: 'moody', label: 'Dark and moody',
    roles: {
      p: bc('#b8415f', '#9b2c4a', '#7f2038', '#4f0f22', '#ffffff'),
      s: bc('#3e8467', '#2f6b52', '#25573f', '#123a28', '#eafff5'),
      a: bc('#d6a366', '#c08a4b', '#a8733a', '#6b4515', '#1f1204'),
    },
  },
  {
    id: 'bright', label: 'Bright and playful',
    roles: {
      p: bc('#ffa94d', '#ff8a1f', '#f06f00', '#b34a00', '#2b1100'),
      s: bc('#ff7fb9', '#ff4d9d', '#e8307f', '#a3125a', '#ffffff'),
      a: bc('#7ae98a', '#4cd964', '#2fbf4a', '#1c8530', '#052b0e'),
    },
  },
];

export const DEFAULT_COLORWAY: ColorwayId = 'default';
export const DEFAULT_BUTTON_LOOK: ButtonLook = 'chunky';

const COLORWAY_IDS = new Set<string>(COLORWAYS.map((c) => c.id));
const LOOK_IDS = new Set<string>(BUTTON_LOOKS.map((l) => l.id));

/** Anything unknown (old saved data, a typo) falls back to the default instead of breaking the app. */
export function resolveColorway(id: string | null | undefined): Colorway {
  return COLORWAYS.find((c) => c.id === id) || COLORWAYS[0]!;
}
export function isColorwayId(id: unknown): id is ColorwayId {
  return typeof id === 'string' && COLORWAY_IDS.has(id);
}
export function isButtonLook(id: unknown): id is ButtonLook {
  return typeof id === 'string' && LOOK_IDS.has(id);
}

/** The scale for one palette in one colorway. */
export function scaleFor(colorway: Colorway, role: PaletteRole): Record<Shade, string> {
  const palette = ROLE_PALETTE[role];
  return colorway.exact?.[palette] || buildScale(colorway.roles[role].face);
}

const toTriplet = (hex: string): string => hexToRgb(hex).join(' ');

/**
 * Every CSS variable a colorway sets. Palette variables hold space-separated
 * "r g b" so Tailwind's opacity suffixes (bg-indigo-600/20) keep working.
 * Button variables hold plain hex for the 3D looks.
 */
export function themeVars(id: string | null | undefined): Record<string, string> {
  const colorway = resolveColorway(id);
  const out: Record<string, string> = {};
  (['p', 's', 'a'] as PaletteRole[]).forEach((role) => {
    const palette = ROLE_PALETTE[role];
    const scale = scaleFor(colorway, role);
    for (const shade of SHADES) out[`--${palette}-${shade}`] = toTriplet(scale[shade]);
    const colors = colorway.roles[role];
    out[`--b-${role}-hi`] = colors.hi;
    out[`--b-${role}-face`] = colors.face;
    out[`--b-${role}-lo`] = colors.lo;
    out[`--b-${role}-edge`] = colors.edge;
    out[`--b-${role}-ink`] = colors.ink;
  });
  return out;
}

/** A few hex values for places that cannot use class names (icons, switch tracks). */
export function themeHex(id: string | null | undefined): { primary400: string; primary600: string; secondary400: string; accent400: string } {
  const colorway = resolveColorway(id);
  return {
    primary400: scaleFor(colorway, 'p')[400],
    primary600: scaleFor(colorway, 'p')[600],
    secondary400: scaleFor(colorway, 's')[400],
    accent400: scaleFor(colorway, 'a')[400],
  };
}
