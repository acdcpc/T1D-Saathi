// Coral gradient primary CTA (Warm Dawn).
import React, { useId } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientPanel from './GradientPanel';
import { CTA, RD } from '../design/tokens';
import { FONT } from '../theme';

interface Props {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  glow?: boolean;
  style?: object;
}

export default function GradientButton({ label, onPress, icon, small, disabled, loading, glow = true, style }: Props) {
  const rawId = useId();
  const gid = 't1d2-cta-' + rawId.replace(/[^a-zA-Z0-9]/g, '');
  const h = small ? 44 : 54;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => [style as object, { opacity: disabled ? 0.5 : 1 }, pressed && !disabled ? { transform: [{ scale: 0.97 }] } : null]}
    >
      <GradientPanel
        id={gid}
        colors={[CTA.from, CTA.to]}
        radius={RD.pill}
        style={[styles.btn, { height: h }, glow && !disabled ? ({ shadowColor: CTA.from, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 18, elevation: 5 } as object) : null]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={20} color="#FFFFFF" /> : null}
            <Text style={[styles.label, small && { fontSize: 15 }]} numberOfLines={1}>{label}</Text>
          </>
        )}
      </GradientPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 },
  label: { color: '#FFFFFF', fontSize: 17, fontFamily: FONT.bold, letterSpacing: 0.3 },
});
