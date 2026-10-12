import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FONT } from '../theme';

/**
 * Patient avatar — shows the child's photo when available (captured by the
 * caregiver), otherwise a clean initials badge. Falls back to initials when the
 * stored photo URI cannot be loaded (e.g. photo added on another device).
 */
export default function ChildAvatar({ name, sex, size = 48, photoUri }: { name: string; sex?: string; size?: number; photoUri?: string | null }) {
  const isGirl = sex === 'female';
  const bg = isGirl ? '#FFEDE6' : '#E5F4F1';
  const fg = isGirl ? '#D9503A' : '#0B5E58';
  const ring = isGirl ? '#F6C6B8' : '#B9E4DD';
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?';
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [photoUri]);

  if (photoUri && !failed) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: ring, overflow: 'hidden', backgroundColor: bg }]}>
        <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      </View>
    );
  }
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: ring, backgroundColor: bg }]}>
      <Text style={{ fontFamily: FONT.extrabold, fontWeight: '800', color: fg, fontSize: Math.round(size * 0.42) }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
