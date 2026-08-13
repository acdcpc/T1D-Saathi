// Shake-to-activate emergency (expo-sensors Accelerometer).
import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { useNavigation } from '@react-navigation/native';

const SHAKE_THRESHOLD = 1.6; // g
const COOLDOWN_MS = 3000;

export function useShakeDetector(enabled: boolean) {
  const navigation = useNavigation<any>();
  const last = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let sub: { remove: () => void } | null = null;

    Accelerometer.setUpdateInterval(100);
    sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (mag > SHAKE_THRESHOLD && now - last.current > COOLDOWN_MS) {
        last.current = now;
        navigation.navigate('Emergency');
      }
    });

    return () => sub?.remove();
  }, [enabled, navigation]);
}
