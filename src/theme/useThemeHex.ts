import { useMemo } from 'react';
import { useAppStore, selectColorway } from '@/store/index';
import { themeHex } from './colorways';

/** Hex values of the current colorway, for icons, switch tracks and chart rings that cannot use class names. */
export function useThemeHex() {
  const colorway = useAppStore(selectColorway);
  return useMemo(() => themeHex(colorway), [colorway]);
}
