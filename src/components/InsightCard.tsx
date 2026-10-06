// Warm Dawn insight card — one friendly, non-clinical sentence from recent stats.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D2, RD, SP, SH } from '../design/tokens';
import { FONT } from '../theme';

export type InsightVariant = 'positive' | 'attention' | 'info';
export interface Insight { variant: InsightVariant; message: string; context?: string; }

const TINTS: Record<InsightVariant, { bg: string; border: string; circle: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }> = {
  positive: { bg: '#F0FDFA', border: '#CCFBF1', circle: '#CCFBF1', icon: 'sparkles', iconColor: D2.teal },
  attention: { bg: '#FFFBEB', border: '#FDE68A', circle: '#FEF3C7', icon: 'bulb', iconColor: D2.marigoldDeep },
  info: { bg: '#EFF6FF', border: '#E5F4F1', circle: '#E5F4F1', icon: 'information-circle', iconColor: '#1D4ED8' },
};

export default function InsightCard({ insight }: { insight: Insight | null }) {
  if (!insight) return null;
  const t = TINTS[insight.variant];
  return (
    <View style={[styles.card, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={[styles.circle, { backgroundColor: t.circle }]}>
        <Ionicons name={t.icon} size={18} color={t.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.message}>{insight.message}</Text>
        {insight.context ? <Text style={styles.context}>{insight.context}</Text> : null}
      </View>
    </View>
  );
}

/** Non-clinical insight builder. Returns null when there isn't enough data. */
export function buildInsight(stats: { timeInRangePct: number; count: number }, lowCount7d: number, isNe: boolean): Insight | null {
  if (stats.count < 3) return null;
  const ctx = isNe ? 'पछिल्लो १४ दिनको आधारमा' : 'Based on the last 14 days';
  if (lowCount7d >= 2) {
    return {
      variant: 'attention',
      message: isNe
        ? 'यो हप्ता केही कम रिडिङ देखियो। सुत्नु अघि जाँच गर्न सक्नुहुन्छ। 💛'
        : 'We noticed a couple of low readings this week. A bedtime check can help. 💛',
      context: isNe ? 'पछिल्लो ७ दिनको आधारमा' : 'Based on the last 7 days',
    };
  }
  if (stats.timeInRangePct >= 70) {
    return {
      variant: 'positive',
      message: isNe
        ? `राम्रो लय! ${stats.timeInRangePct}% रिडिङ दायरामा रह्यो — यही तरिका कायम राख्नुहोस्। 🎉`
        : `Nice rhythm — ${stats.timeInRangePct}% of readings stayed in range. Keep it up! 🎉`,
      context: ctx,
    };
  }
  return {
    variant: 'info',
    message: isNe
      ? 'सुझाव: खाना लग गर्दा ढाँचा चिन्न सजिलो हुन्छ — छोटो नोट भए पनि हुन्छ।'
      : 'Tip: logging meals helps spot patterns — even a quick note counts.',
    context: ctx,
  };
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SP.md,
    borderRadius: RD.md, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 14, marginBottom: SP.lg,
  },
  circle: { width: 36, height: 36, borderRadius: RD.pill, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 14, fontFamily: FONT.medium, color: D2.ink, lineHeight: 21 },
  context: { fontSize: 12, fontFamily: FONT.medium, color: D2.muted, lineHeight: 17, marginTop: 4 },
});
