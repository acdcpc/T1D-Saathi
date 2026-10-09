// Time-in-Range donut chart (pure react-native-svg, no chart lib).
// Supports an optional gradient stroke; falls back to a solid color.
import React, { useId } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FONT } from '../theme';

interface Props {
  pct: number;          // 0–100
  size?: number;        // px
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  /** Optional gradient stroke stops, from → to (overrides `color`). */
  gradient?: readonly string[];
}

export default function TirDonut({
  pct,
  size = 120,
  strokeWidth = 14,
  color = '#0D9488',
  trackColor = '#E5F4F1',
  label = 'Time in Range',
  gradient,
}: Props) {
  const rawId = useId();
  const gid = 'dg' + rawId.replace(/[^a-zA-Z0-9]/g, '');
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = (clamped / 100) * c;
  const stroke = gradient ? `url(#${gid})` : color;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {gradient ? (
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                {gradient.map((c, i) => (
                  <Stop key={i} offset={String(i / Math.max(1, gradient.length - 1))} stopColor={c} />
                ))}
              </LinearGradient>
            </Defs>
          ) : null}
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${filled} ${c - filled}`}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#1A1A2E' }}>
            {clamped}%
          </Text>
        </View>
      </View>
      {label ? (
        <Text style={{ fontSize: 12, fontFamily: FONT.medium, color: '#7A6E65', marginTop: 6 }}>{label}</Text>
      ) : null}
    </View>
  );
}
