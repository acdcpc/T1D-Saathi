import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@t1d_motivation_optout_v1';

/** Whether the user opted out of motivation/streak surfaces. */
export async function isMotivationOptOut(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(KEY)) === '1'; } catch { return false; }
}

export async function setMotivationOptOut(value: boolean): Promise<void> {
  try {
    if (value) await AsyncStorage.setItem(KEY, '1');
    else await AsyncStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
