/**
 * The three 3D button looks, as plain CSS for the web build. Native keeps the
 * colorway colors only (the 3D look needs CSS that React Native does not run),
 * so this is injected at runtime on web instead of living in global.css where
 * the native bundler would have to parse it.
 *
 * A button opts in with the classes `btn3d` plus one of `btn3d-p`, `btn3d-s`,
 * `btn3d-a` (primary, secondary, accent). The look comes from the
 * data-btn-look attribute on the root element.
 */
const BASE_CSS = `
.btn3d { --f: var(--b-p-face); --hi: var(--b-p-hi); --lo: var(--b-p-lo); --edge: var(--b-p-edge); --ink: var(--b-p-ink);
  user-select: none; -webkit-tap-highlight-color: transparent; cursor: pointer;
  transition: transform 80ms ease, box-shadow 80ms ease, filter 120ms ease; }
.btn3d.btn3d-s { --f: var(--b-s-face); --hi: var(--b-s-hi); --lo: var(--b-s-lo); --edge: var(--b-s-edge); --ink: var(--b-s-ink); }
.btn3d.btn3d-a { --f: var(--b-a-face); --hi: var(--b-a-hi); --lo: var(--b-a-lo); --edge: var(--b-a-edge); --ink: var(--b-a-ink); }
.btn3d [class*="text-white"] { color: var(--ink) !important; }
.btn3d [class*="text-indigo-"], .btn3d [class*="text-emerald-"], .btn3d [class*="text-amber-"] { color: color-mix(in srgb, var(--ink) 82%, transparent) !important; }
.btn3d:focus-visible { outline: 3px solid rgb(var(--indigo-300)); outline-offset: 3px; }
.btn3d[aria-disabled="true"] { filter: saturate(0.55); opacity: 0.6; cursor: default; }

`;

/** CSS for one look under a selector prefix, so the real app and the settings previews share the same rules. */
type Look = 'chunky' | 'glossy' | 'subtle' | 'combined';

function lookCss(scope: string, look: Look): string {
  const b = `${scope} .btn3d`;
  if (look === 'chunky') {
    return `
/* Chunky: a solid lower edge like a game key. It sinks when pressed. */
${b} { background-color: var(--f); background-image: linear-gradient(180deg, var(--hi), var(--f) 55%);
  box-shadow: 0 5px 0 var(--edge), 0 10px 14px -4px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.35); }
${b} { margin-bottom: 5px; }
@media (hover: hover) { ${b}:hover { filter: brightness(1.06); } }
${b}:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--edge), 0 3px 6px -2px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.25); }
`;
  }
  if (look === 'glossy') {
    return `
/* Soft glossy: a sheen on top, a glow in the button's own color, a gentle press. */
${b} { background-color: var(--f);
  background-image: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%), linear-gradient(180deg, var(--hi) 0%, var(--f) 48%, var(--lo) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.18), 0 10px 22px -6px color-mix(in srgb, var(--f) 55%, transparent), 0 2px 4px rgba(0,0,0,0.35); }
@media (hover: hover) { ${b}:hover { filter: brightness(1.07); } }
${b}:active { transform: translateY(1px) scale(0.985); box-shadow: inset 0 2px 5px rgba(0,0,0,0.3), 0 3px 8px -4px color-mix(in srgb, var(--f) 55%, transparent); }
`;
  }
  if (look === 'combined') {
    return `
/* Combined: the chunky edge, the glossy sheen and the subtle bevel all at once. */
${b} { background-color: var(--f);
  background-image: linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 50%), linear-gradient(180deg, var(--hi) 0%, var(--f) 50%, var(--lo) 100%);
  box-shadow: 0 4px 0 var(--edge), 0 12px 20px -6px color-mix(in srgb, var(--f) 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 3px rgba(0,0,0,0.16); }
${b} { margin-bottom: 4px; }
@media (hover: hover) { ${b}:hover { filter: brightness(1.06); } }
${b}:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--edge), 0 4px 8px -4px color-mix(in srgb, var(--f) 50%, transparent), inset 0 2px 4px rgba(0,0,0,0.25); }
`;
  }
  return `
/* Subtle raised: a flat face with a light top bevel and a small shadow. */
${b} { background-color: var(--f); background-image: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.22), 0 2px 5px rgba(0,0,0,0.4); }
@media (hover: hover) { ${b}:hover { filter: brightness(1.06); } }
${b}:active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.3); }
`;
}

const LOOKS = ['chunky', 'glossy', 'subtle', 'combined'] as const;

/**
 * Raised surfaces: cards and rows (.surf3d), inputs (.inset3d) and bars
 * (.bar3d, plus the tab bar). They are neutral, so they use shared variables
 * that flip in dark mode. Flat has no rules at all.
 */
const SURFACE_VARS = `
:root { --sf-edge: #d6d3d1; --sf-hi: rgba(255,255,255,0.95); --sf-sh: rgba(68,64,60,0.24); --sf-sheen: rgba(255,255,255,0.7); --sf-inset: rgba(68,64,60,0.2); }
html.dark { --sf-edge: #020617; --sf-hi: rgba(255,255,255,0.09); --sf-sh: rgba(0,0,0,0.62); --sf-sheen: rgba(255,255,255,0.07); --sf-inset: rgba(0,0,0,0.6); }
.surf3d, .inset3d, .bar3d { transition: transform 90ms ease, box-shadow 90ms ease; }
.surf3d-tap { cursor: pointer; -webkit-tap-highlight-color: transparent; }
.surf3d-float { filter: drop-shadow(0 22px 28px rgba(0,0,0,0.35)); }
.inset3d:focus { outline: 3px solid rgb(var(--indigo-400) / 0.6); outline-offset: 1px; }
`;

const SHEEN = 'linear-gradient(180deg, var(--sf-sheen) 0%, transparent 55%)';
const WELL_SHEEN = 'linear-gradient(180deg, color-mix(in srgb, var(--sf-inset) 40%, transparent) 0%, transparent 45%)';

function surfaceCss(scope: string, look: Look): string {
  const c = `${scope} .surf3d`;
  const i = `${scope} .inset3d`;
  const bar = `${scope} .bar3d, ${scope} [role="tablist"]`;
  const SH: Record<Look, { card: string; inner: string; tap: string; well: string; bar: string; img: string; wellImg: string }> = {
    chunky: {
      card: '0 4px 0 var(--sf-edge), 0 12px 16px -10px var(--sf-sh), inset 0 1px 0 var(--sf-hi)',
      inner: '0 3px 0 var(--sf-edge), inset 0 1px 0 var(--sf-hi)',
      tap: '0 1px 0 var(--sf-edge), inset 0 1px 0 var(--sf-hi)',
      well: 'inset 0 3px 0 var(--sf-inset), inset 0 0 0 1px var(--sf-edge)',
      bar: '0 -3px 0 var(--sf-edge), 0 -12px 16px -10px var(--sf-sh)',
      img: 'none', wellImg: 'none',
    },
    glossy: {
      card: 'inset 0 1px 0 var(--sf-hi), 0 14px 26px -12px var(--sf-sh), 0 1px 3px var(--sf-sh)',
      inner: 'inset 0 1px 0 var(--sf-hi), 0 6px 12px -8px var(--sf-sh)',
      tap: 'inset 0 1px 0 var(--sf-hi), 0 3px 8px -6px var(--sf-sh)',
      well: 'inset 0 2px 6px var(--sf-inset), 0 1px 0 var(--sf-hi)',
      bar: '0 -10px 22px -10px var(--sf-sh), inset 0 1px 0 var(--sf-hi)',
      img: SHEEN, wellImg: WELL_SHEEN,
    },
    subtle: {
      card: 'inset 0 1px 0 var(--sf-hi), 0 1px 2px var(--sf-sh), 0 4px 10px -6px var(--sf-sh)',
      inner: 'inset 0 1px 0 var(--sf-hi), 0 1px 2px var(--sf-sh)',
      tap: 'inset 0 1px 0 var(--sf-hi), 0 0 1px var(--sf-sh)',
      well: 'inset 0 1px 3px var(--sf-inset)',
      bar: '0 -2px 8px -4px var(--sf-sh), inset 0 1px 0 var(--sf-hi)',
      img: 'none', wellImg: 'none',
    },
    combined: {
      card: '0 3px 0 var(--sf-edge), 0 14px 22px -12px var(--sf-sh), inset 0 1px 0 var(--sf-hi), inset 0 -2px 3px rgba(0,0,0,0.05)',
      inner: '0 2px 0 var(--sf-edge), inset 0 1px 0 var(--sf-hi)',
      tap: '0 1px 0 var(--sf-edge), inset 0 1px 0 var(--sf-hi)',
      well: 'inset 0 3px 0 var(--sf-inset), inset 0 2px 8px var(--sf-inset)',
      bar: '0 -3px 0 var(--sf-edge), 0 -12px 20px -10px var(--sf-sh), inset 0 1px 0 var(--sf-hi)',
      img: SHEEN, wellImg: WELL_SHEEN,
    },
  };
  const v = SH[look];
  return `
/* Surfaces, ${look} */
${c} { box-shadow: ${v.card}; background-image: ${v.img}; }
${c}.surf3d-in { box-shadow: ${v.inner}; }
${c}.surf3d-tap:active { transform: translateY(${look === 'chunky' || look === 'combined' ? '3px' : '1px'}); box-shadow: ${v.tap}; }
${i} { box-shadow: ${v.well}; background-image: ${v.wellImg}; }
${bar} { box-shadow: ${v.bar}; }
${scope} .bar3d-top { box-shadow: ${v.bar.replace(/0 -(\d+px)/g, '0 $1')}; }
`;
}

// The app-wide look comes from the root attribute. Settings previews use
// [data-look] so all three can show at once. Preview rules come last so they
// win over the app-wide look at equal specificity.
export const WEB_BUTTON_CSS =
  BASE_CSS + SURFACE_VARS +
  LOOKS.map((l) => lookCss(`html[data-btn-look="${l}"]`, l)).join('') +
  LOOKS.map((l) => surfaceCss(`html[data-surf-look="${l}"]`, l)).join('') +
  LOOKS.map((l) => lookCss(`html [data-look="${l}"]`, l)).join('') +
  LOOKS.map((l) => surfaceCss(`html [data-surf="${l}"]`, l)).join('') +
  `
/* Ensure React Navigation web tab bar reserves full room for icons + labels ABOVE iOS safe-area-inset-bottom */
[role="tablist"] {
  height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
  padding-top: 6px !important;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
  box-sizing: border-box !important;
}
[role="tablist"] [role="tab"] {
  overflow: visible !important;
  height: auto !important;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}
@media (prefers-reduced-motion: reduce) { .btn3d, .surf3d, .inset3d, .bar3d { transition: none; } }
`;
