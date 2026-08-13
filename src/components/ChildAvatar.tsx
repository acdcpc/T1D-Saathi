import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { FONT } from '../theme';

/**
 * Child-friendly illustrated avatar: gender-aware color + happy face + a soft
 * decorative SVG ring. No remote image assets needed.
 */
export default function ChildAvatar({ name, sex, size = 48 }: { name: string; sex?: string; size?: number }) {
  const isGirl = sex === 'female';
  const bg = isGirl ? '#FCE7F3' : '#E6F4FE';
  const fg = isGirl ? '#BE185D' : '#1d4ed8';
  const ring = isGirl ? '#F9A8D4' : '#93C5FD';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={bg} />
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} fill="none" stroke={ring} strokeWidth={2} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.3} fill={ring} opacity={0.35} />
      </Svg>
      <Ionicons name={isGirl ? 'happy' : 'happy-outline'} size={size * 0.52} color={fg} />
      <View style={[styles.badge, { backgroundColor: fg }]}>
        <Text style={styles.initials}>{(name || '?')[0]?.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', bottom: -1, right: -1,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  initials: { fontSize: 10, fontFamily: FONT.bold, fontWeight: '700', color: '#fff' },
});
