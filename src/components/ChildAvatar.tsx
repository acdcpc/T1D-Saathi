import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT } from '../theme';

/**
 * Child-friendly gender-aware avatar (illustrated via Ionicons + color, no image assets).
 */
export default function ChildAvatar({ name, sex, size = 48 }: { name: string; sex?: string; size?: number }) {
  const isGirl = sex === 'female';
  const bg = isGirl ? '#FCE7F3' : '#E6F4FE';
  const fg = isGirl ? '#BE185D' : '#1d4ed8';
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Ionicons name={isGirl ? 'happy' : 'happy-outline'} size={size * 0.55} color={fg} />
      <Text style={[styles.initials, { color: fg }]}>{(name || '?')[0]?.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  initials: { position: 'absolute', bottom: -2, right: -2, fontSize: 11, fontFamily: FONT.bold, fontWeight: '700' },
});
