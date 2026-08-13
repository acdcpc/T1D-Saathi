// Global user preferences: high-contrast theme, large-button mode, font scale.
// Provides the active color palette (normal or high-contrast) + a button scale.
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { T } from '../theme';
import { getAccessibilitySettings, setAccessibilitySetting, AccessibilitySettings } from '../utils/accessibility';

// High-contrast palette — pure white/black + darker accents for low-vision users.
export const T_HC = {
  ...T,
  blue: '#0B57D0',
  blueLight: '#D3E3FD',
  teal: '#0B6B5A',
  red: '#B3261E',
  orange: '#8A5300',
  purple: '#5B2FA0',
  surface: '#FFFFFF',
  bg: '#FFFFFF',
  text: '#000000',
  muted: '#3C4043',
  border: '#202124',
  greenLight: '#C6EFCE',
  greenDark: '#0B6B2F',
  redLight: '#F8D7DA',
  redDark: '#8C1D18',
  amberLight: '#FFF0C2',
  amberDark: '#6B4E00',
  blueLightBg: '#D3E3FD',
  blueDark: '#0B3D91',
};

interface PreferencesValue {
  highContrast: boolean;
  largeButtons: boolean;
  fontScale: number;
  theme: typeof T;
  scale: number; // button/touch-target scale multiplier (1 or 1.2)
  setHighContrast: (v: boolean) => void;
  setLargeButtons: (v: boolean) => void;
  setFontScale: (v: number) => void;
}

const PreferencesContext = createContext<PreferencesValue>({
  highContrast: false,
  largeButtons: false,
  fontScale: 1,
  theme: T,
  scale: 1,
  setHighContrast: () => {},
  setLargeButtons: () => {},
  setFontScale: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeButtons: false,
    fontScale: 1,
  });

  useEffect(() => {
    (async () => setSettings(await getAccessibilitySettings()))();
  }, []);

  const set = useCallback(
    async <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      await setAccessibilitySetting(key, value);
    },
    []
  );

  const value = useMemo<PreferencesValue>(
    () => ({
      highContrast: settings.highContrast,
      largeButtons: settings.largeButtons,
      fontScale: settings.fontScale,
      theme: settings.highContrast ? T_HC : T,
      scale: settings.largeButtons ? 1.2 : 1,
      setHighContrast: (v) => set('highContrast', v),
      setLargeButtons: (v) => set('largeButtons', v),
      setFontScale: (v) => set('fontScale', v),
    }),
    [settings, set]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
