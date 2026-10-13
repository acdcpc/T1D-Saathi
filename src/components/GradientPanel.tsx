// SVG-gradient rounded panel (native + web; no gradient library).
// Rounded via the <Rect rx> itself (per design spec — avoids Android clip issues).
import React, { useId } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface Props {
  /** 2+ stops, from → to */
  colors: readonly string[];
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Optional stable gradient id prefix; defaults to a unique one. */
  id?: string;
  horizontal?: boolean;
}

export default function GradientPanel({ colors, radius = 22, style, children, id, horizontal }: Props) {
  const rawId = useId();
  const gid = 'gp' + (id || rawId).replace(/[^a-zA-Z0-9]/g, '');
  const n = Math.max(2, colors.length);
  return (
    <View style={[{ position: 'relative' }, style]}>
      <Svg style={styles.fill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2={horizontal ? '0' : '1'}>
            {colors.map((c, i) => (
              <Stop key={i} offset={String(i / (n - 1))} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${gid})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
