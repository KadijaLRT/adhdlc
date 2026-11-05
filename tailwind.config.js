/** @type {import('tailwindcss').Config} */
const { safeArea } = require('nativewind/dist/tailwind/safe-area');

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
function paletteFromVars(name) {
  const out = {};
  for (const shade of SHADES) out[shade] = `rgb(var(--${name}-${shade}) / <alpha-value>)`;
  return out;
}

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base: { 50: '#f8fafc', 900: '#0f172a', 950: '#020617' },
        slate: { 800: '#1e293b', 850: '#172033', 900: '#0f172a', 950: '#020617' },
        // Primary, secondary and accent palettes read CSS variables so the
        // colorway setting can re-skin the whole app (see src/theme/colorways.ts).
        // "<alpha-value>" keeps opacity suffixes like bg-indigo-600/20 working.
        indigo: paletteFromVars('indigo'),
        emerald: paletteFromVars('emerald'),
        amber: paletteFromVars('amber'),
      },
    },
  },
  // nativewind/preset resolves to a different config depending on
  // NATIVEWIND_OS: "web" mode (this app's primary build target) never
  // registers the pt-safe/pb-safe/etc. utilities used throughout the
  // app to avoid clipping into notches and status bars — only the
  // native-mode config does. Registering the plugin here directly
  // makes those classes real on both, regardless of which base preset
  // ends up active. viewport-fit=cover (needed for the underlying
  // env(safe-area-inset-*) CSS to resolve to anything nonzero) is
  // already set via Expo's web config, so this was the one missing
  // piece.
  plugins: [safeArea],
};
