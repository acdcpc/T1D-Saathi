import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { T } from '../theme';

/**
 * Decorative dhaka-textile-inspired divider (geometric motif, no external asset).
 */
export default function DhakaDivider({ width = 280, height = 10, color = T.shadow }: { width?: number; height?: number; color?: string }) {
  const step = 16;
  const n = Math.max(1, Math.floor(width / step));
  const shapes: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const x = i * step;
    const mid = x + step / 2;
    const bottom = x + step;
    const fill = i % 2 === 0 ? color : T.blue;
    shapes.push(
      <Path
        key={`t${i}`}
        d={`M${mid},0 L${bottom},${height} L${x},${height} Z`}
        fill={fill}
        opacity={i % 2 === 0 ? 0.55 : 0.85}
      />
    );
  }
  return <Svg width={width} height={height}>{shapes}</Svg>;
}
