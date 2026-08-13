// Culturally-relevant empty-state card with an inline SVG illustration (no remote assets).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { FONT, T } from '../theme';

interface Props {
  title: string;
  message: string;
  icon?: 'drop' | 'family' | 'leaf' | 'heart';
}

/** Simple inline illustrations drawn with SVG (stable, no network needed). */
function Illustration({ icon }: { icon: Props['icon'] }) {
  const size = 96;
  if (icon === 'leaf') {
    return (
      <Svg width={size} height={size} viewBox="0 0 96 96">
        <Circle cx={48} cy={48} r={44} fill="#D1FAE5" />
        <Path d="M48 70 C38 58 34 46 42 32 C56 34 62 46 56 58 C54 64 50 68 48 70 Z" fill="#0D9488" />
        <Path d="M48 70 C48 58 50 48 58 42" stroke="#065F46" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </Svg>
    );
  }
  if (icon === 'family') {
    return (
      <Svg width={size} height={size} viewBox="0 0 96 96">
        <Circle cx={48} cy={48} r={44} fill="#E6F4FE" />
        <Circle cx={38} cy={38} r={9} fill="#1a73e8" />
        <Path d="M24 66 C26 52 34 46 38 46 C42 46 50 52 52 66 Z" fill="#1a73e8" />
        <Circle cx={62} cy={34} r={7} fill="#1a73e8" />
        <Path d="M54 62 C56 50 60 46 62 46 C64 46 68 50 70 62 Z" fill="#1a73e8" />
      </Svg>
    );
  }
  if (icon === 'heart') {
    return (
      <Svg width={size} height={size} viewBox="0 0 96 96">
        <Circle cx={48} cy={48} r={44} fill="#FEE2E2" />
        <Path
          d="M48 72 C30 60 20 48 26 36 C31 27 42 28 48 36 C54 28 65 27 70 36 C76 48 66 60 48 72 Z"
          fill="#C0392B"
        />
      </Svg>
    );
  }
  // drop (glucose) default
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Circle cx={48} cy={48} r={44} fill="#FEF3C7" />
      <Path d="M48 20 C48 20 64 40 64 52 C64 61 56 68 48 68 C40 68 32 61 32 52 C32 40 48 20 48 20 Z" fill="#F59E0B" />
      <Path d="M40 52 C42 47 45 44 48 42" stroke="#92400E" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export default function EmptyState({ title, message, icon = 'drop' }: Props) {
  return (
    <View style={styles.wrap}>
      <Illustration icon={icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  title: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: T.text, marginTop: 12, textAlign: 'center' },
  message: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
});
