// Consistent "‹ Back" affordance for pushed screens (web + native).
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { FONT, T } from '../theme';

export default function BackBar({ navigation, label }: { navigation?: any; label?: string }) {
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const text = label || (isNe ? 'पछाडि' : 'Back');
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={text}
      style={styles.wrap}
      onPress={() => navigation?.goBack?.()}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={20} color={T.text} />
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 14, marginBottom: 2,
  },
  text: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: T.text },
});
