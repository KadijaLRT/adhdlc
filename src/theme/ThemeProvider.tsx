import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { vars } from 'nativewind';
import { useAppStore, selectColorway, selectButtonLook } from '@/store/index';
import { themeVars } from './colorways';
import { WEB_BUTTON_CSS } from './webButtonStyles';

const STYLE_ELEMENT_ID = 'app-btn3d-styles';

/** Adds the 3D button CSS to the page once. Safe to call repeatedly and safe where there is no document. */
function ensureWebStyles(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    if (document.getElementById(STYLE_ELEMENT_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    el.textContent = WEB_BUTTON_CSS;
    document.head.appendChild(el);
  } catch (err) {
    console.warn('Could not add button styles', err);
  }
}

/**
 * Applies the chosen colorway and button look to everything below it.
 *
 * Colors flow through CSS variables: on every platform through the wrapper
 * View's style (nativewind `vars`), and on web also on the document root, so
 * pop-ups and other content rendered outside the app tree still match.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorway = useAppStore(selectColorway);
  const buttonLook = useAppStore(selectButtonLook);

  const variables = useMemo(() => themeVars(colorway), [colorway]);
  const style = useMemo(() => vars(variables), [variables]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      ensureWebStyles();
      const root = document.documentElement;
      for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value);
    } catch (err) {
      console.warn('Could not apply colorway', err);
    }
  }, [variables]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      document.documentElement.setAttribute('data-btn-look', buttonLook);
    } catch (err) {
      console.warn('Could not apply button look', err);
    }
  }, [buttonLook]);

  return (
    <View className="flex-1" style={style}>
      {children}
    </View>
  );
}
