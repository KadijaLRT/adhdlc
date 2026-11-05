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
  position: relative; user-select: none; -webkit-tap-highlight-color: transparent; cursor: pointer;
  transition: transform 80ms ease, box-shadow 80ms ease, filter 120ms ease; }
.btn3d.btn3d-s { --f: var(--b-s-face); --hi: var(--b-s-hi); --lo: var(--b-s-lo); --edge: var(--b-s-edge); --ink: var(--b-s-ink); }
.btn3d.btn3d-a { --f: var(--b-a-face); --hi: var(--b-a-hi); --lo: var(--b-a-lo); --edge: var(--b-a-edge); --ink: var(--b-a-ink); }
.btn3d [class*="text-white"] { color: var(--ink) !important; }
.btn3d [class*="text-indigo-"], .btn3d [class*="text-emerald-"], .btn3d [class*="text-amber-"] { color: color-mix(in srgb, var(--ink) 82%, transparent) !important; }
.btn3d:focus-visible { outline: 3px solid rgb(var(--indigo-300)); outline-offset: 3px; }
.btn3d[aria-disabled="true"] { filter: saturate(0.55); opacity: 0.6; cursor: default; }

`;

/** CSS for one look under a selector prefix, so the real app and the settings previews share the same rules. */
function lookCss(scope: string, look: 'chunky' | 'glossy' | 'subtle'): string {
  const b = `${scope} .btn3d`;
  if (look === 'chunky') {
    return `
/* Chunky: a solid lower edge like a game key. It sinks when pressed. */
${b} { background-color: var(--f); background-image: linear-gradient(180deg, var(--hi), var(--f) 55%);
  box-shadow: 0 5px 0 var(--edge), 0 10px 14px -4px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.35); }
${b}:hover { filter: brightness(1.06); }
${b}:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--edge), 0 3px 6px -2px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.25); }
`;
  }
  if (look === 'glossy') {
    return `
/* Soft glossy: a sheen on top, a glow in the button's own color, a gentle press. */
${b} { background-color: var(--f);
  background-image: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%), linear-gradient(180deg, var(--hi) 0%, var(--f) 48%, var(--lo) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.18), 0 10px 22px -6px color-mix(in srgb, var(--f) 55%, transparent), 0 2px 4px rgba(0,0,0,0.35); }
${b}:hover { filter: brightness(1.07); }
${b}:active { transform: translateY(1px) scale(0.985); box-shadow: inset 0 2px 5px rgba(0,0,0,0.3), 0 3px 8px -4px color-mix(in srgb, var(--f) 55%, transparent); }
`;
  }
  return `
/* Subtle raised: a flat face with a light top bevel and a small shadow. */
${b} { background-color: var(--f); background-image: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.22), 0 2px 5px rgba(0,0,0,0.4); }
${b}:hover { filter: brightness(1.06); }
${b}:active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.3); }
`;
}

const LOOKS = ['chunky', 'glossy', 'subtle'] as const;

// The app-wide look comes from the root attribute. Settings previews use
// [data-look] so all three can show at once. Preview rules come last so they
// win over the app-wide look at equal specificity.
export const WEB_BUTTON_CSS =
  BASE_CSS +
  LOOKS.map((l) => lookCss(`html[data-btn-look="${l}"]`, l)).join('') +
  LOOKS.map((l) => lookCss(`html [data-look="${l}"]`, l)).join('') +
  `
@media (prefers-reduced-motion: reduce) { .btn3d { transition: none; } }
`;
