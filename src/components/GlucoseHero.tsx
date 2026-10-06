// Warm Dawn glucose hero: deep-teal gradient surface, giant value, AGP status colors.
import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { D2, HERO, RD, SP, TYPE, STATUS, StatusKey, heroGlow } from '../design/tokens';
import { FONT } from '../theme';

interface Props {
  valueText: string | null;          // '142' or null (no reading)
  unitLabel: string;                 // 'mg/dL' | 'mmol/L'
  status: StatusKey;
  updatedText?: string;
  activeInsulinU?: number;
  onPress?: () => void;
  onLogPress?: () => void;
}

const NID = 't1d2-hero';

export default function GlucoseHero({ valueText, unitLabel, status, updatedText, activeInsulinU, onPress, onLogPress }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const st = STATUS[status];
  const dotColor = status === 'inRange' ? '#3DDC97' : status === 'high' ? '#FFD166' : status === 'veryHigh' ? '#FF9E64' : status === 'low' ? '#FF8A80' : status === 'veryLow' ? '#FF6B6B' : '#FFFFFF';
  const pad = isWide ? SP.xxl : SP.xl;
  const numColor = valueText === null ? 'rgba(255,255,255,0.85)' : st.onDark;
  const ctaInk = status === 'inRange' ? D2.tealDeep : status === 'high' || status === 'veryHigh' ? '#92400E' : status === 'low' || status === 'veryLow' ? '#A03024' : D2.text2;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.wrap, heroGlow(HERO.to), pressed && onPress ? { transform: [{ scale: 0.985 }] } : null]}>
      <Svg style={styles.fill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id={`${NID}-grad`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={HERO.from} />
            <Stop offset="0.5" stopColor={HERO.mid} />
            <Stop offset="1" stopColor={HERO.to} />
          </LinearGradient>
          <RadialGradient id={`${NID}-dawn`} cx="0.85" cy="0.05" r="0.9">
            <Stop offset="0" stopColor={HERO.dawn} stopOpacity="0.30" />
            <Stop offset="1" stopColor={HERO.dawn} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`${NID}-mint`} cx="0.15" cy="0.95" r="0.9">
            <Stop offset="0" stopColor={HERO.mint} stopOpacity="0.22" />
            <Stop offset="1" stopColor={HERO.mint} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={RD.xxl} ry={RD.xxl} fill={`url(#${NID}-grad)`} />
        <Rect x="0" y="0" width="100%" height="100%" rx={RD.xxl} ry={RD.xxl} fill={`url(#${NID}-dawn)`} />
        <Rect x="0" y="0" width="100%" height="100%" rx={RD.xxl} ry={RD.xxl} fill={`url(#${NID}-mint)`} />
      </Svg>

      <View style={[styles.content, { padding: pad, minHeight: isWide ? 184 : 168 }]}>
        <View style={styles.rowBetween}>
          {status !== 'none' ? (
            <View style={styles.chip}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <Text style={styles.chipText}>{st.labelEn}</Text>
            </View>
          ) : valueText === null ? (
            <View style={styles.chip}>
              <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.7)' }]} />
              <Text style={styles.chipText}>No readings yet</Text>
            </View>
          ) : <View />}
          {updatedText ? (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.timeText} numberOfLines={1}>{updatedText}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.valueRow}>
          <Text
            style={[isWide ? TYPE.heroWide : TYPE.hero, { color: numColor }]}
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
          >
            {valueText ?? '—'}
          </Text>
          {valueText !== null ? <Text style={styles.unit}>{unitLabel}</Text> : null}
        </View>

        <View style={styles.rowBetween}>
          {activeInsulinU && activeInsulinU > 0 ? (
            <View style={styles.insulinPill}>
              <Ionicons name="eyedrop" size={14} color="#FFFFFF" />
              <Text style={styles.insulinText}>Active insulin {activeInsulinU} U</Text>
            </View>
          ) : <View />}
          {onLogPress ? (
            <Pressable onPress={onLogPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.miniCta, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
              <Ionicons name="add" size={15} color={ctaInk} />
              <Text style={[styles.miniCtaText, { color: ctaInk }]}>Log now</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: RD.xxl, marginBottom: SP.lg, position: 'relative' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { justifyContent: 'space-between', gap: SP.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.20)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: RD.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: '#FFFFFF', fontSize: 12, fontFamily: FONT.semibold, letterSpacing: 0.2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: FONT.medium },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  unit: { color: 'rgba(255,255,255,0.90)', fontSize: 18, fontFamily: FONT.semibold, marginLeft: 8, paddingBottom: 10 },
  insulinPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: RD.sm, paddingHorizontal: 10, paddingVertical: 6,
  },
  insulinText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONT.medium },
  miniCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', height: 34, paddingHorizontal: 16, borderRadius: RD.pill,
  },
  miniCtaText: { fontSize: 13, fontFamily: FONT.bold },
});
