// Ambient type declarations for third-party modules whose own bundled
// types don't cover every entry point this project imports.

// mammoth's own bundled types only cover its main package entry, not
// the explicit mammoth.browser.js subpath imported in
// syllabusDocxImport.ts (needed to avoid mammoth's main build's
// Node-only `fs` dependency crashing on React Native — see that
// file's own comment for the full reasoning). @types/mammoth doesn't
// exist on npm either. This declares just the one function actually
// used, matching mammoth's real documented return shape.
declare module 'mammoth/mammoth.browser.js' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
}
