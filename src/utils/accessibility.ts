// Accessibility preference store (persisted in AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@t1d_accessibility';

export interface AccessibilitySettings {
  highContrast: boolean;
  largeButtons: boolean;
  fontScale: number; // 1 = normal, 1.2 = larger
}

const DEFAULTS: AccessibilitySettings = {
  highContrast: false,
  largeButtons: false,
  fontScale: 1,
};

export async function getAccessibilitySettings(): Promise<AccessibilitySettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setAccessibilitySetting<K extends keyof AccessibilitySettings>(
  key: K,
  value: AccessibilitySettings[K]
): Promise<AccessibilitySettings> {
  const current = await getAccessibilitySettings();
  const next = { ...current, [key]: value };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
