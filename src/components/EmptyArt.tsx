// Composed empty-state illustration (layered circles + accent dots; no images).
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D2, RD, SH } from '../design/tokens';

export default function EmptyArt({ icon = 'water' }: { icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.art} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.halo} />
      <View style={styles.teal} />
      <View style={styles.amber} />
      <View style={styles.disc}>
        <Ionicons name={icon} size={40} color={D2.teal} />
      </View>
      <View style={styles.badge}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </View>
      <View style={[styles.dot, styles.dotA]} />
      <View style={[styles.dot, styles.dotB]} />
      <View style={[styles.dot, styles.dotC]} />
    </View>
  );
}

const styles = StyleSheet.create({
  art: { width: 200, height: 180, alignSelf: 'center' },
  halo: { position: 'absolute', left: 14, top: 8, width: 168, height: 168, borderRadius: 999, backgroundColor: D2.tealTint, opacity: 0.9 },
  teal: { position: 'absolute', right: 6, top: 0, width: 100, height: 100, borderRadius: 999, backgroundColor: '#CCFBF1' },
  amber: { position: 'absolute', left: 0, top: 112, width: 44, height: 44, borderRadius: 999, backgroundColor: D2.marigoldTint },
  disc: {
    position: 'absolute', left: 58, top: 46, width: 84, height: 84, borderRadius: 999,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    ...SH.raised,
  },
  badge: {
    position: 'absolute', left: 118, top: 104, width: 30, height: 30, borderRadius: 999,
    backgroundColor: D2.teal, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  dot: { position: 'absolute', borderRadius: 999 },
  dotA: { left: 26, top: 28, width: 10, height: 10, backgroundColor: D2.marigold },
  dotB: { right: 24, top: 70, width: 8, height: 8, backgroundColor: D2.tealBright },
  dotC: { right: 40, bottom: 18, width: 6, height: 6, backgroundColor: D2.purple },
});
