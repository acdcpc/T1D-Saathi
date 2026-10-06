// Warm Dawn floating tab bar (rounded, soft shadow, active teal pill).
import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { D2, RD, SH } from '../design/tokens';
import { FONT } from '../theme';
import { useLanguage } from '../context/LanguageContext';

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Log: { active: 'pulse', inactive: 'pulse-outline' },
  Food: { active: 'restaurant', inactive: 'restaurant-outline' },
};

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottom = insets.bottom > 0 ? insets.bottom + 6 : 14;
  const barW = Math.min(width - 32, 600);

  const routes = state.routes.filter((r) => r.name !== 'Learn');

  return (
    <View pointerEvents="box-none" style={[styles.anchor, { bottom }]}>
      <View style={[styles.bar, { width: barW }]}>
        {routes.map((r) => {
          const idx = state.routes.findIndex((x) => x.key === r.key);
          const focused = state.index === idx;
          const label = r.name === 'Dashboard' ? (isNe ? 'गृह' : 'Home') : r.name === 'Log' ? (isNe ? 'ग्लुकोज' : 'Glucose') : (isNe ? 'खाना' : 'Food');
          const ic = ICONS[r.name] ?? ICONS.Dashboard;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(r.name as never);
          };
          return (
            <Pressable
              key={r.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              style={({ pressed }) => [styles.item, focused && styles.itemActive, pressed && { opacity: 0.75 }]}
            >
              <Ionicons name={focused ? ic.active : ic.inactive} size={focused ? 20 : 22} color={focused ? D2.tealDeep : D2.faint} />
              <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    height: 64, backgroundColor: '#FFFFFF', borderRadius: 26,
    borderWidth: 1, borderColor: 'rgba(237,224,212,0.9)',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    ...SH.floating,
  },
  item: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 22, gap: 2 },
  itemActive: { backgroundColor: D2.tealTint },
  label: { fontSize: 11, fontFamily: FONT.semibold, color: D2.faint },
  labelActive: { color: D2.tealDeep },
});
