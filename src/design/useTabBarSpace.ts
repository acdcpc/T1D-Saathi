import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Bottom spacing so scroll content clears the floating tab bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const bottomOffset = insets.bottom > 0 ? insets.bottom + 6 : 14;
  const barH = isWide ? 68 : 64;
  const contentPaddingBottom = Math.ceil((barH + bottomOffset + 24) / 8) * 8;
  return { bottomOffset, contentPaddingBottom, barH, isWide };
}
