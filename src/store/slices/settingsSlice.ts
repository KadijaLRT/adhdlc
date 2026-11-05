import type { StateCreator } from 'zustand';
import { getRepository } from '@/core/storage';
import { createWriteGuard } from '@/core/storage/writeGuard';
import { DEFAULT_BUTTON_LOOK, DEFAULT_COLORWAY, isButtonLook, isColorwayId, type ButtonLook, type ColorwayId } from '@/theme/colorways';

export type TextSize = 'small' | 'medium' | 'large';
export type ColorSchemePreference = 'light' | 'dark' | 'system';
export type DateFormat = 'MM-DD-YYYY' | 'DD-MM-YYYY' | 'YYYY-MM-DD';
export type UnitSystem = 'imperial' | 'metric';

export interface SettingsState {
  textSize: TextSize;
  reduceMotion: boolean;
  highContrast: boolean;
  dyslexiaFont: boolean;
  colorScheme: ColorSchemePreference;
  dateFormat: DateFormat;
  unitSystem: UnitSystem;
  notificationsEnabled: boolean;
  colorway: ColorwayId;
  buttonLook: ButtonLook;
}

export interface SettingsSlice extends SettingsState {
  setTextSize: (size: TextSize) => Promise<void>;
  setReduceMotion: (enabled: boolean) => Promise<void>;
  setHighContrast: (enabled: boolean) => Promise<void>;
  setDyslexiaFont: (enabled: boolean) => Promise<void>;
  setColorScheme: (scheme: ColorSchemePreference) => Promise<void>;
  setDateFormat: (format: DateFormat) => Promise<void>;
  setUnitSystem: (system: UnitSystem) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setColorway: (id: ColorwayId) => Promise<void>;
  setButtonLook: (look: ButtonLook) => Promise<void>;
}

const DEFAULT_STATE: SettingsState = {
  textSize: 'medium',
  reduceMotion: false,
  highContrast: false,
  dyslexiaFont: false,
  colorScheme: 'light',
  dateFormat: 'MM-DD-YYYY',
  unitSystem: 'imperial',
  notificationsEnabled: false,
  colorway: DEFAULT_COLORWAY,
  buttonLook: DEFAULT_BUTTON_LOOK,
};

const persist = createWriteGuard(async (state: SettingsState) => {
  const repo = await getRepository();
  await repo.saveSettingsState(state);
});

function currentState(get: () => SettingsState): SettingsState {
  return {
    textSize: get().textSize || 'medium',
    reduceMotion: get().reduceMotion ?? false,
    highContrast: get().highContrast ?? false,
    dyslexiaFont: get().dyslexiaFont ?? false,
    colorScheme: get().colorScheme || 'light',
    dateFormat: get().dateFormat || 'MM-DD-YYYY',
    unitSystem: get().unitSystem || 'imperial',
    notificationsEnabled: get().notificationsEnabled ?? false,
    colorway: isColorwayId(get().colorway) ? get().colorway : DEFAULT_COLORWAY,
    buttonLook: isButtonLook(get().buttonLook) ? get().buttonLook : DEFAULT_BUTTON_LOOK,
  };
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set, get) => ({
  ...DEFAULT_STATE,

  setTextSize: async (textSize) => {
    const nextState = { ...currentState(get), textSize };
    set(nextState);
    await persist(nextState);
  },
  setReduceMotion: async (reduceMotion) => {
    const nextState = { ...currentState(get), reduceMotion };
    set(nextState);
    await persist(nextState);
  },
  setHighContrast: async (highContrast) => {
    const nextState = { ...currentState(get), highContrast };
    set(nextState);
    await persist(nextState);
  },
  setDyslexiaFont: async (dyslexiaFont) => {
    const nextState = { ...currentState(get), dyslexiaFont };
    set(nextState);
    await persist(nextState);
  },
  setColorScheme: async (colorScheme) => {
    const nextState = { ...currentState(get), colorScheme };
    set(nextState);
    await persist(nextState);
  },
  setDateFormat: async (dateFormat) => {
    const nextState = { ...currentState(get), dateFormat };
    set(nextState);
    await persist(nextState);
  },
  setUnitSystem: async (unitSystem) => {
    const nextState = { ...currentState(get), unitSystem };
    set(nextState);
    await persist(nextState);
  },
  setNotificationsEnabled: async (notificationsEnabled) => {
    const nextState = { ...currentState(get), notificationsEnabled };
    set(nextState);
    await persist(nextState);
  },
  setColorway: async (colorway) => {
    if (!isColorwayId(colorway)) return;
    const nextState = { ...currentState(get), colorway };
    set(nextState);
    await persist(nextState);
  },
  setButtonLook: async (buttonLook) => {
    if (!isButtonLook(buttonLook)) return;
    const nextState = { ...currentState(get), buttonLook };
    set(nextState);
    await persist(nextState);
  },
});
