import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A real numeric top inset, not the `pt-safe` Tailwind class. That
 * class depends on env(safe-area-inset-top) resolving to something
 * nonzero, which requires viewport-fit=cover AND the page actually
 * running standalone — true for a fresh iOS "Add to Home Screen"
 * install, but NOT for one made before those meta tags existed (it
 * keeps its old, non-fullscreen-aware behavior until the icon is
 * deleted and re-added) or for a plain browser tab. Silently falling
 * back to zero padding in either case reads as content rendering
 * behind the status bar, with no visual warning that anything's wrong.
 *
 * `Math.max(insets.top, minimum)` guarantees at least a small gap
 * under the status bar/notch even when the real inset resolves to
 * zero, while still respecting a larger real inset when one exists
 * (Dynamic Island, camera cutouts, etc).
 */
export function useSafeTopInset(minimum = 12): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.top, minimum);
}

/** Same rationale as useSafeTopInset, for the bottom edge (home indicator / gesture bar). */
export function useSafeBottomInset(minimum = 12): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, minimum);
}
