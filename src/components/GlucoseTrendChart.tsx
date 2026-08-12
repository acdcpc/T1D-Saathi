import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { T } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { toMgdl } from '../utils/glucoseStats';
import type { GlucoseLog } from '../types';

const CHART_W = Math.min(Dimensions.get('window').width - 64, 420);
const CHART_H = 200;
const PAD_L = 34, PAD_R = 12, PAD_T = 12, PAD_B = 26;
const Y_MIN = 40, Y_MAX = 320;

function yPx(y: number) {
  return PAD_T + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (CHART_H - PAD_T - PAD_B);
}

/** 14-day glucose trend line with ISPAD 70–180 mg/dL target band (pure react-native-svg). */
export default function GlucoseTrendChart({ logs }: { logs: GlucoseLog[] }) {
  const { language } = useLanguage();
  const isNe = language === 'ne';

  const sorted = [...logs]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-14);

  const data = sorted.map((l) => ({
    mgdl: toMgdl(l.value, l.unit),
    label: new Date(l.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  if (data.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {isNe ? 'चार्टको लागि थप ग्लुकोज लग चाहिन्छ (कम्तीमा २)' : 'Log at least 2 readings to see a trend chart'}
        </Text>
      </View>
    );
  }

  const n = data.length;
  const xPx = (i: number) => PAD_L + (i / Math.max(n - 1, 1)) * (CHART_W - PAD_L - PAD_R);
  const points = data.map((d, i) => `${xPx(i).toFixed(1)},${yPx(d.mgdl).toFixed(1)}`).join(' ');
  const bandLabels = [70, 180];

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H}>
        {/* ISPAD target band */}
        {bandLabels.map((b) => (
          <Line
            key={b}
            x1={PAD_L} y1={yPx(b)} x2={CHART_W - PAD_R} y2={yPx(b)}
            stroke={T.teal} strokeWidth={1} strokeDasharray="4,4" opacity={0.5}
          />
        ))}
        {/* Glucose line */}
        <Polyline points={points} fill="none" stroke={T.blue} strokeWidth={2.5} />
        {/* First + last dots */}
        <Circle cx={xPx(0)} cy={yPx(data[0].mgdl)} r={4} fill={T.blue} stroke="#fff" strokeWidth={1} />
        <Circle cx={xPx(n - 1)} cy={yPx(data[n - 1].mgdl)} r={4} fill={T.blue} stroke="#fff" strokeWidth={1} />
        {/* Y labels */}
        {[40, 120, 200, 280].map((y) => (
          <SvgText key={y} x={PAD_L - 6} y={yPx(y) + 3} fontSize={9} fill={T.muted} textAnchor="end">
            {y}
          </SvgText>
        ))}
        {/* X labels: first / middle / last */}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <SvgText key={i} x={xPx(i)} y={CHART_H - 8} fontSize={9} fill={T.muted} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
            {data[i].label}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.legend}>
        {isNe ? 'हरियो रेखा = ७०–१८० mg/dL लक्ष्य दायरा (ISPAD)' : 'Dashed lines = 70–180 mg/dL target range (ISPAD)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: T.muted, fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  legend: { color: T.muted, fontSize: 11, textAlign: 'center', marginTop: 4 },
});
