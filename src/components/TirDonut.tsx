// Time-in-Range donut chart (pure react-native-svg, no chart lib).
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FONT } from '../theme';

interface Props {
  pct: number;          // 0–100
  size?: number;        // px
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

export default function TirDonut({
  pct,
  size = 120,
  strokeWidth = 14,
  color = '#0D9488',
  trackColor = '#E6F4FE',
  label = 'Time in Range',
}: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = (clamped / 100) * c;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${filled} ${c - filled}`}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.22, fontFamily: FONT.extrabold, fontWeight: '800', color: '#1A1A2E' }}>
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
