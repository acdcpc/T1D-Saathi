import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 't1d_voice_readback';

export async function isVoiceReadbackEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function setVoiceReadbackEnabled(v: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, v ? '1' : '0');
}

/** Speaks a value aloud (glucose, dose) when voice readback is enabled. */
export async function speak(text: string, lang: 'en' | 'ne' = 'en'): Promise<void> {
  if (!(await isVoiceReadbackEnabled())) return;
  Speech.stop();
  Speech.speak(text, { language: lang === 'ne' ? 'ne-NP' : 'en-US' });
}
