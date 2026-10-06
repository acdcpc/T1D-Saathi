// Warm Dawn quick actions: 4 prominent tiles (kept 4-across at all widths).
import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D2, RD, SP, SH } from '../design/tokens';
import { FONT } from '../theme';
import { useLanguage } from '../context/LanguageContext';

export interface QuickAction {
  key: string;
  label: string;
  labelNe: string;
  icon: keyof typeof Ionicons.glyphMap;
  circleBg: string;
  iconColor: string;
  onPress: () => void;
}

export default function QuickActions({ actions }: { actions: QuickAction[] }) {
  const { width } = useWindowDimensions();
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const isWide = width >= 640;

  return (
    <View style={[styles.row, { gap: isWide ? SP.md : SP.sm, marginBottom: isWide ? SP.xl : SP.lg }]}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={a.onPress}
          accessibilityRole="button"
          accessibilityLabel={isNe ? a.labelNe : a.label}
          style={({ pressed }) => [styles.tile, isWide && styles.tileWide, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <View style={[styles.circle, { backgroundColor: a.circleBg }, isWide && styles.circleWide]}>
            <Ionicons name={a.icon} size={isWide ? 24 : 20} color={a.iconColor} />
          </View>
          <Text style={[styles.label, isWide && styles.labelWide]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {isNe ? a.labelNe : a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  tile: {
    flex: 1, minHeight: 84, alignItems: 'center', justifyContent: 'center',
    paddingVertical: SP.md, paddingHorizontal: SP.xs,
    backgroundColor: '#FFFFFF', borderRadius: RD.md, borderWidth: 1, borderColor: D2.border,
    ...SH.card,
  },
  tileWide: { minHeight: 104, borderRadius: RD.lg, paddingVertical: 14, paddingHorizontal: SP.sm },
  circle: { width: 40, height: 40, borderRadius: RD.pill, alignItems: 'center', justifyContent: 'center' },
  circleWide: { width: 52, height: 52 },
  label: { fontSize: 12, fontFamily: FONT.semibold, color: D2.ink, lineHeight: 17, marginTop: SP.sm, textAlign: 'center' },
  labelWide: { fontSize: 14, lineHeight: 20, marginTop: 10 },
});
