import { useFonts } from 'expo-font';

/** Mukta — Devanagari + Latin (Ek Type, OFL). Loaded once at app start. */
export const FONT_ASSETS = {
  Mukta_400Regular: require('../../assets/fonts/Mukta-Regular.ttf'),
  Mukta_500Medium: require('../../assets/fonts/Mukta-Medium.ttf'),
  Mukta_600SemiBold: require('../../assets/fonts/Mukta-SemiBold.ttf'),
  Mukta_700Bold: require('../../assets/fonts/Mukta-Bold.ttf'),
  Mukta_800ExtraBold: require('../../assets/fonts/Mukta-ExtraBold.ttf'),
};

export function useAppFonts() {
  return useFonts(FONT_ASSETS);
}
